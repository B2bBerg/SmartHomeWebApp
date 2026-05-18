import { Router } from 'express';

/**
 * adapters/in/web/locationRoutes.js
 *
 * Definiert die REST-Endpunkte für die "Locations"-Domäne.
 * Leitet Anfragen an den Controller weiter.
 */
export const createLocationRoutes = (locationController) => {
    const router = Router();

    router.get('/locations', (req, res) => locationController.getAllLocations(req, res));

    return router;
};