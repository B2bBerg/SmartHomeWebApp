import { Router } from 'express';

export const createAddressRoutes = (addressController) => {
    const router = Router();

    router.get('/addresses/search', (req, res) => addressController.searchAddresses(req, res));
    router.get('/addresses', (req, res) => addressController.getAddresses(req, res));
    router.get('/addresses/:id', (req, res) => addressController.getAddressById(req, res));
    router.post('/addresses', (req, res) => addressController.addAddress(req, res));
    router.put('/addresses/:id', (req, res) => addressController.updateAddress(req, res));
    router.delete('/addresses/:id', (req, res) => addressController.deleteAddress(req, res));

    return router;
};