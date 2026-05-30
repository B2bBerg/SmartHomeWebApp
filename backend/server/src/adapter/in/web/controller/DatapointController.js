import { asyncHandler } from '../utils/asyncHandler.js';

export class DatapointController {
    constructor(datapointService) {
        this.datapointService = datapointService;
    }

    getDatapoints = asyncHandler(async (req, res) => {
        const dps = await this.datapointService.getDatapoints(req.query.type);
        res.json(dps);
    });

    addDatapoint = asyncHandler(async (req, res) => {
        const dp = await this.datapointService.addDatapoint(req.body);
        res.json(dp);
    });

    updateDatapoint = asyncHandler(async (req, res) => {
        const dp = await this.datapointService.updateDatapoint(req.params.id, req.body);
        res.json(dp);
    });

    deleteDatapoint = asyncHandler(async (req, res) => {
        await this.datapointService.deleteDatapoint(req.params.id);
        res.status(204).send();
    });

    getDatapointTypes = asyncHandler(async (req, res) => {
        res.json(await this.datapointService.getDatapointTypes());
    });

    getUnitTypes = asyncHandler(async (req, res) => {
        res.json(await this.datapointService.getUnitTypes());
    });

    getDatapointHistory = asyncHandler(async (req, res) => {
        res.json(await this.datapointService.getDatapointHistory(req.params.id));
    });

    setDatapointState = asyncHandler(async (req, res) => {
        res.json(await this.datapointService.setDatapointState(req.params.id, req.body));
    });
}