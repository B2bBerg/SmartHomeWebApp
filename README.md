# SmartHomeWebApp
This is a web application for visualizing and controlling sensors and actuators. It is built using a hexagonal architecture with ports and adapters. You can replace or modify any components that communicate with the application, such as the database, frontend, or specific sensors and actuators.

The application uses PostgreSQL for storing both static data (like device types and room types) and time-series data (like metering values). The database schemas are defined in the `dbStaticData.sql` and `dbTimescale.sql` files, respectively.

## Database Documentation
The database structure is managed via PostgreSQL and is divided into two primary SQL files located in the `db` folder:

- **`dbStaticData.sql`**: Contains the schema and initial seed data for static information. This includes system configurations such as device types, room types, locations, and user roles.
- **`dbTimescale.sql`**: Defines the schema for time-series data. This is optimized for storing continuous streams of data, such as real-time metering values from sensors, actuator states, and historical logs.
*(Note: If you are setting up the database from scratch, execute `dbStaticData.sql` first to ensure all relational foreign keys are present before inserting time-series data.)*
- **`dbStaticUsers.sh`**: A shell script that creates the dedicated application database user (`APP_DB_USER`). For security reasons, it restricts the user's permissions strictly to data manipulation (SELECT, INSERT, UPDATE, DELETE) and sequence usage, preventing unauthorized schema modifications.
- **`dbTimeUsers.sh`**: A shell script for the time-series database. It creates the application user and sets up the user mapping for the Foreign Data Wrapper (FDW). This allows the application user in the time-series database to seamlessly query metadata from the static database.

### Core Relational Domains (`dbStaticData.sql`)
The static data schema defines the backbone of the application, categorized into the following key domains:
- **User & Security Management**: Manages user accounts (`users`), active sessions (`user_sessions`), location-based permissions (`user_location_access`), invitations (`user_invitations`), and an audit trail (`audit_log`).
- **Location & Topology**: Defines the spatial hierarchy (`location`, `location_group`, `location_type`, `address`) such as Buildings, Floors, and Rooms.
- **Device Management**: Tracks hardware instances (`devices`) and maps them to their physical connections (`device_channel`, `bus_type`), specifications (`model_type`), and vendors (`manufacturer`).
- **Telemetry & Datapoints**: Manages logical sensors and actuators (`datapoint`), their measurement structures (`datapoint_type`, `unit_type`, `channel_type`), and standard smart meter codes (`obis_definition`).
- **Automation Rules**: Defines dynamic logic (`automation_rule`), sensor thresholds (`rule_condition`), and corresponding actuator responses (`rule_action`).
- **Frontend / UI Layout**: Stores user-specific dashboard configurations, including pages (`app_page`) and dashboard grid components (`tile`, `tile_type`, `tile_datapoint`).

### Core Time-Series Domains & Integrations (`dbTimeData.sql`)
The time-series database is engineered for high performance using **TimescaleDB** extensions and **Foreign Data Wrappers (FDW)**:
- **Foreign Data Wrapper (FDW)**: Uses `postgres_fdw` to securely link to the static database and import essential relational tables (`datapoint`, `devices`, `location`) for cross-database JOINs.
- **Hypertables**: Partitioned tables optimized for massive time-series ingestion:
  - `datapoint_states_binary`: Stores boolean events (e.g., switches, presence), retaining raw data for 5 years and compressing after 14 days.
  - `datapoint_values`: Stores numeric measurements (e.g., temperature, energy). Raw data is retained for 1 month before being dropped to conserve storage.
- **Continuous Aggregates**: Automatically computes and stores downsampled statistics (Average, Min, Max) for numeric data across various intervals (15-min, hourly, daily, monthly). These aggregates utilize aggressive compression and staggered retention policies spanning up to 10 years.
- **Latest State Tracking**: Employs highly optimized tables (`datapoint_latest_values`, `datapoint_latest_states`) that are updated via database triggers upon insert. This approach replaces slow `DISTINCT ON` queries, enabling lightning-fast retrieval of the real-time status of any datapoint via helper views.

## Extensions VS Code
To work with this project in Visual Studio Code, you can install the following extensions:
- **PlantUML** by jebbs "https://www.plantuml.com/plantuml"
- **ERD Editor** by dineug "[erd-editor.io](https://erd-editor.io/)"

## Running the Application (Choice of Environment)
You can run the application either **natively** on your machine or using **Docker**. Two execution scripts have been provided in the project root to make this process as simple as possible.

### Option 1: Running with Docker (Recommended)
The application and its databases are fully containerized using Docker Compose (`docker/docker-compose.yml`). The stack includes the `web-app`, `dbStatic`, and `dbTimeseries` containers.

**Prerequisites:** Ensure you have configured the `.env` file inside the `docker` directory with your desired credentials.

To start the application, simply run:
```bash
chmod +x start_docker.sh
./start_docker.sh
```

Once the containers are running and the databases finish their initial setup, the backend application will be accessible at `http://localhost:8080`.

### Option 2: Running Natively (Ubuntu)
If you prefer to run the application directly on your host machine without Docker, you can use the native start script designed for Ubuntu.

To automatically install all system dependencies (including PostgreSQL 18, TimescaleDB, Node.js 24, and Yarn) and start the application natively, run:
```bash
chmod +x docs/install/start_native.sh
./docs/install/start_native.sh
```
This script will configure the required system repositories, install any missing tools, fetch the Node packages via `yarn install`, and finally start the backend server. 
*(Note: If the PostgreSQL database was freshly installed by the script, you will still need to manually configure the initial databases, users, and schemas using the files in the `db` folder before the backend can successfully connect).*
