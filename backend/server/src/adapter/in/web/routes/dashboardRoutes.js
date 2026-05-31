import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createDashboardRoutes = (dashboardController) => {
    const router = Router();

    router.get('/dashboard/tile-types', asyncHandler((req, res) => dashboardController.getTileTypes(req, res)));

    router.get('/dashboard', asyncHandler((req, res) => dashboardController.getAllDashboards(req, res)));
    router.get('/dashboard/:id', asyncHandler((req, res) => dashboardController.getDashboard(req, res)));
    router.post('/dashboard/:id', asyncHandler((req, res) => dashboardController.saveDashboard(req, res)));
    router.delete('/dashboard/:id', asyncHandler((req, res) => dashboardController.deleteDashboard(req, res)));
    
    // --- Die neuen Endpunkte für die Subdashboards (Kacheln) ---
    router.get('/dashboard/:id/tiles', asyncHandler((req, res) => dashboardController.getDashboardTiles(req, res)));
    router.post('/dashboard/:id/tiles', asyncHandler((req, res) => dashboardController.saveDashboardTiles(req, res)));

    return router;
};