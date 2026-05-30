import express from 'express';

export function createDatapointRoutes(datapointController) {
    const router = express.Router();

    // Spezifische Routen (müssen vor den /:id Routen stehen!)
    router.get('/datapoints/types', datapointController.getDatapointTypes);
    router.get('/datapoints/units', datapointController.getUnitTypes);
    
    // Dummy/Mock Routen für das Dashboard (Verhindern 404 Fehler, bis TimescaleDB integriert ist)
    router.get('/datapoints/:id/history', datapointController.getDatapointHistory);
    router.put('/datapoints/:id/state', datapointController.setDatapointState);

    // CRUD Routen
    router.get('/datapoints', datapointController.getDatapoints);
    router.post('/datapoints', datapointController.addDatapoint);
    router.put('/datapoints/:id', datapointController.updateDatapoint);
    router.delete('/datapoints/:id', datapointController.deleteDatapoint);

    return router;
}