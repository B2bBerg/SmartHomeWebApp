import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createAddressRoutes = (addressController) => {
    const router = Router();

    router.get('/addresses/search', asyncHandler((req, res) => addressController.searchAddresses(req, res)));
    router.get('/addresses', asyncHandler((req, res) => addressController.getAddresses(req, res)));
    router.get('/addresses/:id', asyncHandler((req, res) => addressController.getAddressById(req, res)));
    router.post('/addresses', asyncHandler((req, res) => addressController.addAddress(req, res)));
    router.put('/addresses/:id', asyncHandler((req, res) => addressController.updateAddress(req, res)));
    router.delete('/addresses/:id', asyncHandler((req, res) => addressController.deleteAddress(req, res)));

    return router;
};