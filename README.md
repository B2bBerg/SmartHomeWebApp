# SmartHomeWebApp
This is a web application for visualizing and controlling sensors and actuators. It is built using a hexagonal architecture with ports and adapters. You can replace or modify any components that communicate with the application, such as the database, frontend, or specific sensors and actuators.

The application uses PostgreSQL for storing both static data (like device types and room types) and time-series data (like metering values). The database schemas are defined in the `dbStaticData.sql` and `dbTimescale.sql` files, respectively.

## Extensions VS Code
To work with this project in Visual Studio Code, you can install the following extensions:
- **PlantUML** by jebbs "https://www.plantuml.com/plantuml"
- **ERD Editor** by dineug "[erd-editor.io](https://erd-editor.io/)"

## Running the Application
To run the application, follow these steps: