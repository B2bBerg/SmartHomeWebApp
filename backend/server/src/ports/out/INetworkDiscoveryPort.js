export class INetworkDiscoveryPort {
    async discoverNetwork(busType) { throw new Error("Method not implemented"); }
    async discoverDevice(address, busType) { throw new Error("Method not implemented"); }
    async discoverDevicesBulk(devicesToScan) { throw new Error("Method not implemented"); }
}