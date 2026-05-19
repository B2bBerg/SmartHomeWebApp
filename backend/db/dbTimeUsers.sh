#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 1. FDW Extension und Server einrichten
    CREATE EXTENSION IF NOT EXISTS postgres_fdw;
    CREATE SERVER meta_db_link
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'dbStatic', port '5432', dbname '${DB_STATIC_NAME:-smarthome_static}');

    -- 2. FDW Mapping für den Admin/Initialisierungs-User auf die dbStatic
    CREATE USER MAPPING FOR current_user
    SERVER meta_db_link
    OPTIONS (user '${POSTGRES_USER}', password '${POSTGRES_PASSWORD}');

    -- 3. App-Benutzer anlegen
    CREATE USER "${APP_DB_USER}" WITH ENCRYPTED PASSWORD '${APP_DB_PASSWORD}';

    -- 4. Schema-Nutzung erlauben
    GRANT USAGE ON SCHEMA public TO "${APP_DB_USER}";

    -- 5. Lese- & Schreibrechte auf Tabellen, Hypertables & Continuous Aggregates
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${APP_DB_USER}";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${APP_DB_USER}";

    -- 6. User-Mapping für FDW: Erlaubt dem app_user Anfragen an die dbStatic durchzuführen
    CREATE USER MAPPING FOR "${APP_DB_USER}"
    SERVER meta_db_link
    OPTIONS (user '${APP_DB_USER}', password '${APP_DB_PASSWORD}');
EOSQL