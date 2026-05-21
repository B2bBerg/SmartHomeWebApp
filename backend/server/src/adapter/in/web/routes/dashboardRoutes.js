import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createDashboardRoutes = (dashboardController) => {
    const router = Router();

    router.get('/dashboard/:id', asyncHandler((req, res) => dashboardController.getDashboard(req, res)));
    router.post('/dashboard/:id', asyncHandler((req, res) => dashboardController.saveDashboard(req, res)));

    return router;
};