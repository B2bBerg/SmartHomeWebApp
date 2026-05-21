import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createDashboardRoutes = (dashboardController) => {
    const router = Router();

    router.get('/dashboard', asyncHandler((req, res) => dashboardController.getAllDashboards(req, res)));
    router.get('/dashboard/:id', asyncHandler((req, res) => dashboardController.getDashboard(req, res)));
    router.post('/dashboard/:id', asyncHandler((req, res) => dashboardController.saveDashboard(req, res)));
    router.delete('/dashboard/:id', asyncHandler((req, res) => dashboardController.deleteDashboard(req, res)));

    return router;
};