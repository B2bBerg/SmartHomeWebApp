import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createDeviceRoutes = (deviceController) => {
    const router = Router();

    router.get('/devices/bus-types', asyncHandler((req, res) => deviceController.getBusTypes(req, res)));

    router.get('/devices/scan-network', asyncHandler((req, res) => deviceController.scanNetwork(req, res)));
    
    router.get('/devices/scan', asyncHandler((req, res) => deviceController.scanDevice(req, res)));
    
    router.post('/devices/scan-bulk', asyncHandler((req, res) => deviceController.scanDevicesBulk(req, res)));
    
    router.get('/devices/models', asyncHandler((req, res) => deviceController.getModelTypes(req, res)));
    
    router.get('/devices', asyncHandler((req, res) => deviceController.getDevices(req, res)));
    
    router.post('/devices', asyncHandler((req, res) => deviceController.addDevice(req, res)));
    
    router.put('/devices/:id', asyncHandler((req, res) => deviceController.updateDevice(req, res)));
    
    router.delete('/devices/:id', asyncHandler((req, res) => deviceController.deactivateDevice(req, res)));

    return router;
};