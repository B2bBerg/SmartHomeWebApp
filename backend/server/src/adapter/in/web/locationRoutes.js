import { Router } from 'express';

/**
 * adapters/in/web/locationRoutes.js
 *
 * Definiert die REST-Endpunkte für die "Locations"-Domäne.
 * Leitet Anfragen an den Controller weiter.
 */
export const createLocationRoutes = (locationController) => {
    const router = Router();

    // Routen an den Controller binden
    router.get('/locations', (req, res) => locationController.getAllLocations(req, res));
    router.post('/locations/batch', (req, res) => locationController.batchUpdateLocations(req, res));
    router.post('/locations', (req, res) => locationController.addLocation(req, res));
    router.put('/locations/:id', (req, res) => locationController.updateLocation(req, res));
    router.delete('/locations/:id', (req, res) => locationController.deleteLocation(req, res));
    router.get('/location-types', (req, res) => locationController.getLocationTypes(req, res));
    router.post('/location-types', (req, res) => locationController.addLocationType(req, res));

    return router;
};