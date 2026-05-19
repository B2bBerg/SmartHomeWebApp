import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * adapter/in/web/routes/locationRoutes.js
 *
 * Definiert die REST-Endpunkte für die "Locations"-Domäne.
 * Leitet Anfragen an den Controller weiter.
 */
export const createLocationRoutes = (locationController) => {
    const router = Router();

    // Routen an den Controller binden
    router.get('/locations', asyncHandler((req, res) => locationController.getAllLocations(req, res)));
    router.post('/locations/batch', asyncHandler((req, res) => locationController.batchUpdateLocations(req, res)));
    router.post('/locations', asyncHandler((req, res) => locationController.addLocation(req, res)));
    router.put('/locations/:id', asyncHandler((req, res) => locationController.updateLocation(req, res)));
    router.delete('/locations/:id', asyncHandler((req, res) => locationController.deactivateLocation(req, res)));
    router.get('/location-types', asyncHandler((req, res) => locationController.getLocationTypes(req, res)));
    router.post('/location-types', asyncHandler((req, res) => locationController.addLocationType(req, res)));

    return router;
};