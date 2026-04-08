# SmartHomeWebApp
This is a web application for visualizing and controlling sensors and actuators. It is built using a hexagonal architecture with ports and adapters. You can replace or modify any components that communicate with the application, such as the database, frontend, or specific sensors and actuators.

The application uses PostgreSQL for storing both static data (like device types and room types) and time-series data (like metering values). The database schemas are defined in the `dbStaticData.sql` and `dbTimescale.sql` files, respectively.