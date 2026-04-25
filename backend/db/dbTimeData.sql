-- Database schema for SmartHomeWebApp with PostgreSQL and TimescaleDB for timeseries data like metering values

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Main table for time-series data
CREATE TABLE IF NOT EXISTS sensor_data (
    "time" TIMESTAMPTZ NOT NULL,
    datapoint_id UUID NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    -- Optional metadata can be added here, but keeping it narrow is better for performance
    PRIMARY KEY ("time", datapoint_id)
);

-- Convert standard PostgreSQL table into a TimescaleDB hypertable
SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);

-- Index for fast queries specific to a datapoint over time (often used in frontend graphs)
CREATE INDEX IF NOT EXISTS ix_sensor_data_datapoint_time ON sensor_data (datapoint_id, "time" DESC);
