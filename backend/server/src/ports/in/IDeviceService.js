export class IDeviceService {
    async getDevices(busType) { throw new Error("Method not implemented"); }
    async getBusTypes() { throw new Error("Method not implemented"); }
    async getModelTypes() { throw new Error("Method not implemented"); }
    async addDevice(deviceData) { throw new Error("Method not implemented"); }
    async updateDevice(id, deviceData) { throw new Error("Method not implemented"); }
    async deactivateDevice(id) { throw new Error("Method not implemented"); }
    async scanNetwork(busType) { throw new Error("Method not implemented"); }
    async scanDevice(address, busType) { throw new Error("Method not implemented"); }
    async scanDevicesBulk(devicesToScan) { throw new Error("Method not implemented"); }
}