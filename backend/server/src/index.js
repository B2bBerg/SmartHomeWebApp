import express from 'express';

// Importiere die einzelnen Teile der Architektur
import { InMemoryLocationAdapter } from './adapters/out/db/InMemoryLocationAdapter.js';
import { LocationService } from './core/services/LocationService.js';
import { LocationController } from './adapters/in/web/LocationController.js';
import { createLocationRoutes } from './adapters/in/web/locationRoutes.js';

const app = express();
const port = 3001; // Wir nehmen einen anderen Port als das Frontend

app.use(express.json());

// --- Dependency Injection (Kompositions-Root) ---
// Hier werden die Objekte erstellt und miteinander verknüpft.

// 1. Erstelle den Outbound-Adapter (Kommunikation nach aussen, z.B. DB)
const locationRepository = new InMemoryLocationAdapter();

// 2. Erstelle den Core-Service und gib ihm den Adapter als Abhängigkeit
const locationService = new LocationService(locationRepository);

// 3. Erstelle den Inbound-Adapter (Controller) und gib ihm den Service
const locationController = new LocationController(locationService);

// 4. Erstelle die Routen und gib ihnen den Controller
const locationRoutes = createLocationRoutes(locationController);

// --- Routen registrieren ---
app.use('/api', locationRoutes);

app.listen(port, () => {
    console.log(`Backend-Server läuft auf http://localhost:${port}`);
});