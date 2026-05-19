import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

// Importiere die einzelnen Teile der Architektur
import { PostgresLocationAdapter } from './adapter/out/db/PostgresLocationAdapter.js';
import { LocationService } from './core/services/LocationService.js';
import { LocationController } from './adapter/in/web/controller/LocationController.js';
import { createLocationRoutes } from './adapter/in/web/routes/locationRoutes.js';

import { PostgresAddressAdapter } from './adapter/out/db/PostgresAddressAdapter.js';
import { AddressService } from './core/services/AddressService.js';
import { AddressController } from './adapter/in/web/controller/AddressController.js';
import { createAddressRoutes } from './adapter/in/web/routes/addressRoutes.js';

// Importiere die zentrale Error-Handling Middleware
import { errorHandler } from './adapter/in/web/middlewares/errorHandler.js';

const app = express();
const port = 3001; // Wir nehmen einen anderen Port als das Frontend

app.use(cors()); // Erlaubt Cross-Origin-Requests (wichtig für die Kommunikation zwischen Port 3000 und 3001)
app.use(express.json());

// --- Datenbank-Verbindung (PostgreSQL Pool) ---
// Nutzt die DATABASE_URL aus dem Docker Compose, ansonsten lokaler Fallback
const dbConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.APP_DB_USER || 'postgres',
        password: process.env.APP_DB_PASSWORD || 'dein_passwort',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_STATIC_NAME || 'smarthome',
        port: 5432,
    };
const dbPool = new Pool(dbConfig);

// --- Dependency Injection (Kompositions-Root) ---
// Hier werden die Objekte erstellt und miteinander verknüpft.

// 1. Erstelle den Outbound-Adapter (Kommunikation nach aussen) mit der DB-Verbindung
const locationRepository = new PostgresLocationAdapter(dbPool);
const addressRepository = new PostgresAddressAdapter(dbPool);

// 2. Erstelle den Core-Service und gib ihm den Adapter als Abhängigkeit
const locationService = new LocationService(locationRepository);
const addressService = new AddressService(addressRepository);

// 3. Erstelle den Inbound-Adapter (Controller) und gib ihm den Service
const locationController = new LocationController(locationService);
const addressController = new AddressController(addressService);

// 4. Erstelle die Routen und gib ihnen den Controller
const locationRoutes = createLocationRoutes(locationController);
const addressRoutes = createAddressRoutes(addressController);

// --- Routen registrieren ---
app.use('/api', locationRoutes);
app.use('/api', addressRoutes);

// --- Zentrale Fehlerbehandlung (muss nach den Routen registriert werden!) ---
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Backend-Server läuft auf http://localhost:${port}`);
});