export class DeviceController {
    constructor(deviceService) {
        this.deviceService = deviceService;
    }

    async getDevices(req, res) {
        const devices = await this.deviceService.getDevices(req.query.bus);
        res.json(devices);
    }

    async getBusTypes(req, res) {
        const busTypes = await this.deviceService.getBusTypes();
        res.json(busTypes);
    }

    async getModelTypes(req, res) {
        const models = await this.deviceService.getModelTypes();
        res.json(models);
    }

    async addDevice(req, res) {
        const result = await this.deviceService.addDevice(req.body);
        res.status(201).json(result);
    }

    async updateDevice(req, res) {
        const result = await this.deviceService.updateDevice(req.params.id, req.body);
        res.json(result);
    }

    async deactivateDevice(req, res) {
        const result = await this.deviceService.deactivateDevice(req.params.id);
        res.json(result);
    }

    async scanNetwork(req, res) {
        const result = await this.deviceService.scanNetwork(req.query.bus);
        res.json(result);
    }

    async scanDevice(req, res) {
        const result = await this.deviceService.scanDevice(req.query.address, req.query.bus);
        res.json(result);
    }

    async scanDevicesBulk(req, res) {
        const result = await this.deviceService.scanDevicesBulk(req.body);
        res.json(result);
    }
}