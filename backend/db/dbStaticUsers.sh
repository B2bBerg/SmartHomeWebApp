#!/bin/bash
set -e

# Führt den SQL-Block als der reguläre Postgres Admin aus
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 1. App-Benutzer anlegen
    CREATE USER ${APP_DB_USER} WITH ENCRYPTED PASSWORD '${APP_DB_PASSWORD}';

    -- 2. Schema-Nutzung erlauben
    GRANT USAGE ON SCHEMA public TO ${APP_DB_USER};

    -- 3. Nur Lese- und Schreibrechte (DML) auf Tabellen und Views
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_DB_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_DB_USER};

    -- 4. Rechte für Sequenzen
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_DB_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${APP_DB_USER};
EOSQL