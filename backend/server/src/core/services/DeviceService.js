import { IDeviceService } from '../../ports/in/IDeviceService.js';
import { Device } from '../domain/Device.js';

export class DeviceService extends IDeviceService {
    constructor(deviceRepository, networkDiscoveryPort) {
        super();
        this.deviceRepository = deviceRepository;
        this.networkDiscoveryPort = networkDiscoveryPort;
    }

    async getDevices(busType) {
        return await this.deviceRepository.getDevices(busType);
    }

    async getBusTypes() {
        return await this.deviceRepository.getBusTypes();
    }

    async getModelTypes() {
        return await this.deviceRepository.getModelTypes();
    }

    async addDevice(deviceData) {
        const device = new Device(deviceData);
        device.validate();
        return await this.deviceRepository.addDevice(device);
    }

    async updateDevice(id, deviceData) {
        const device = new Device({ ...deviceData, id });
        device.validate();
        return await this.deviceRepository.updateDevice(id, device);
    }

    async deactivateDevice(id) {
        return await this.deviceRepository.deactivateDevice(id);
    }

    async scanNetwork(busType) {
        return await this.networkDiscoveryPort.discoverNetwork(busType);
    }

    async scanDevice(address, busType) {
        return await this.networkDiscoveryPort.discoverDevice(address, busType);
    }

    async scanDevicesBulk(devicesToScan) {
        return await this.networkDiscoveryPort.discoverDevicesBulk(devicesToScan);
    }
}