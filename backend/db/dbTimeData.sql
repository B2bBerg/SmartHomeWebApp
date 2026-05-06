-- Enable extension
CREATE EXTENSION postgres_fdw;

-- Define the server link to the meta database instance
CREATE SERVER meta_db_link
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host 'localhost', port '5432', dbname 'meta_database');

-- User mapping (allows the Timescale user to authenticate against the meta DB)
CREATE USER MAPPING FOR current_user
SERVER meta_db_link
OPTIONS (user 'meta_user', password 'your_password');

-- Import foreign schema tables (only those needed for joins)
IMPORT FOREIGN SCHEMA public 
LIMIT TO (datapoint, devices, location)
FROM SERVER meta_db_link 
INTO public;

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

------------------------------------------------------------------------------------------------------------------------------
-- TimescaleDB Tables
------------------------------------------------------------------------------------------------------------------------------

-- Table for boolean/binary datapoints (e.g., switches, open/close contacts, presence)
CREATE TABLE datapoint_states_binary
(
  recorded_at  timestamptz NOT NULL,
  datapoint_id uuid        NOT NULL,
  val          boolean     NOT NULL,
  quality_code smallint    NOT NULL DEFAULT 0,
  PRIMARY KEY (recorded_at, datapoint_id)
);

-- Convert to hypertable and add composite index for faster datapoint history lookups
SELECT create_hypertable('datapoint_states_binary', 'recorded_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS ix_dp_states_binary_dp_time ON datapoint_states_binary (datapoint_id, recorded_at DESC);

ALTER TABLE datapoint_states_binary SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'datapoint_id'
);

-- Compression policy for binary states (compress after 14 days)
SELECT add_compression_policy('datapoint_states_binary', INTERVAL '14 days');

-- Retention policy for binary states (keep all raw states for 5 years for statistics)
SELECT add_retention_policy('datapoint_states_binary', INTERVAL '5 years');

-- Table for numeric datapoints (e.g., temperature, humidity, energy)
CREATE TABLE datapoint_values
(
  recorded_at  timestamptz NOT NULL,
  datapoint_id uuid        NOT NULL,
  val          DOUBLE PRECISION NOT NULL,
  quality_code smallint    NOT NULL DEFAULT 0,
  PRIMARY KEY (recorded_at, datapoint_id)
);

-- Convert to hypertable and add composite index for faster datapoint history lookups
SELECT create_hypertable('datapoint_values', 'recorded_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS ix_dp_values_dp_time ON datapoint_values (datapoint_id, recorded_at DESC);

-- Continuous Aggregate: 15-minute stats (great for detailed but smoothed daily charts)
CREATE MATERIALIZED VIEW datapoint_15min_stats
WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '15 minutes', recorded_at) AS bucket,
       datapoint_id,
       AVG(val) as avg_val,
       MAX(val) as max_val,
       MIN(val) as min_val
FROM datapoint_values
GROUP BY bucket, datapoint_id;

SELECT add_continuous_aggregate_policy('datapoint_15min_stats',
  start_offset => INTERVAL '1 week',
  end_offset => INTERVAL '15 minutes',
  schedule_interval => INTERVAL '15 minutes');

-- Continuous Aggregate: Hourly stats
CREATE MATERIALIZED VIEW datapoint_hourly_stats
WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 hour', recorded_at) AS bucket,
       datapoint_id,
       AVG(val) as avg_val,
       MAX(val) as max_val,
       MIN(val) as min_val
FROM datapoint_values
GROUP BY bucket, datapoint_id;

SELECT add_continuous_aggregate_policy('datapoint_hourly_stats',
  start_offset => INTERVAL '1 month',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- Continuous Aggregate: Daily stats (great for long-term historical charts)
CREATE MATERIALIZED VIEW datapoint_daily_stats
WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 day', recorded_at) AS bucket,
       datapoint_id,
       AVG(val) as avg_val,
       MAX(val) as max_val,
       MIN(val) as min_val
FROM datapoint_values
GROUP BY bucket, datapoint_id;

SELECT add_continuous_aggregate_policy('datapoint_daily_stats',
  start_offset => INTERVAL '1 month',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day');

-- Continuous Aggregate: Monthly stats (great for year-over-year comparisons)
CREATE MATERIALIZED VIEW datapoint_monthly_stats
WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 month', recorded_at) AS bucket,
       datapoint_id,
       AVG(val) as avg_val,
       MAX(val) as max_val,
       MIN(val) as min_val
FROM datapoint_values
GROUP BY bucket, datapoint_id;

SELECT add_continuous_aggregate_policy('datapoint_monthly_stats',
  start_offset => INTERVAL '6 months',
  end_offset => INTERVAL '1 month',
  schedule_interval => INTERVAL '1 day');

ALTER TABLE datapoint_values SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'datapoint_id'
);

-- Compression policy for raw numeric data
SELECT add_compression_policy('datapoint_values', INTERVAL '14 days');

-- Compression for Continuous Aggregates (Saves massive storage for long-term historical stats)
ALTER MATERIALIZED VIEW datapoint_hourly_stats SET (timescaledb.compress);
SELECT add_compression_policy('datapoint_hourly_stats', compress_after => INTERVAL '1 month');

ALTER MATERIALIZED VIEW datapoint_daily_stats SET (timescaledb.compress);
SELECT add_compression_policy('datapoint_daily_stats', compress_after => INTERVAL '2 months');

ALTER MATERIALIZED VIEW datapoint_monthly_stats SET (timescaledb.compress);
SELECT add_compression_policy('datapoint_monthly_stats', compress_after => INTERVAL '6 months');

-- Data Lifecycle Strategy (Retention Policies)
-- 1. Drop raw numeric data after 1 month (we have 15-min data for everything older)
SELECT add_retention_policy('datapoint_values', INTERVAL '1 month');
-- 2. Keep 15-minute aggregates for 6 months
SELECT add_retention_policy('datapoint_15min_stats', INTERVAL '6 months');
-- 3. Keep hourly aggregates for 2 years
SELECT add_retention_policy('datapoint_hourly_stats', INTERVAL '2 years');
-- 4. Keep daily aggregates for 5 years
SELECT add_retention_policy('datapoint_daily_stats', INTERVAL '5 years');
-- 5. Keep monthly aggregates for 10 years
SELECT add_retention_policy('datapoint_monthly_stats', INTERVAL '10 years');

------------------------------------------------------------------------------------------------------------------------------
-- Helper Views for Frontend / API (Joining TimescaleDB with FDW Metadata)
------------------------------------------------------------------------------------------------------------------------------

-- View to get the absolute latest numeric value for each datapoint including its metadata name
CREATE OR REPLACE VIEW view_latest_datapoint_values AS
SELECT DISTINCT ON (v.datapoint_id)
    v.datapoint_id,
    d.datapoint_name,
    v.val AS latest_value,
    v.recorded_at AS last_updated
FROM datapoint_values v
JOIN datapoint d ON v.datapoint_id = d.datapoint_id
ORDER BY v.datapoint_id, v.recorded_at DESC;

-- View to get the absolute latest state (binary) for each datapoint including its metadata name
CREATE OR REPLACE VIEW view_latest_datapoint_states AS
SELECT DISTINCT ON (s.datapoint_id)
    s.datapoint_id,
    d.datapoint_name,
    s.val AS current_state,
    s.recorded_at AS last_updated
FROM datapoint_states_binary s
JOIN datapoint d ON s.datapoint_id = d.datapoint_id
ORDER BY s.datapoint_id, s.recorded_at DESC;
