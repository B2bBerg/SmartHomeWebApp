import { INetworkDiscoveryPort } from '../../../ports/out/INetworkDiscoveryPort.js';

export class MockNetworkDiscoveryAdapter extends INetworkDiscoveryPort {
    async discoverNetwork(busType) {
        // Simuliere Latenz
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockDevices = [
            { macAddress: '00:1A:2B:3C:4D:5E', busType: 'WIFI' },
            { macAddress: 'A1:B2:C3:D4:E5:F6', busType: 'Thread' },
            { busAddress: '0x1A', busType: 'RS485' }
        ];
        return mockDevices.filter(d => !busType || d.busType === busType);
    }

    async discoverDevice(address, busType) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!address) return null;
        
        return {
            macAddress: address.includes(':') ? address : undefined,
            busAddress: !address.includes(':') ? address : undefined,
            busType: busType,
            battery: Math.floor(Math.random() * 20) + 80, // 80-100%
            signal: Math.floor(Math.random() * -40) - 40, // -40 to -80 dBm
            channels: 2
        };
    }

    async discoverDevicesBulk(devicesToScan) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return devicesToScan.map(dev => ({
            originalAddress: dev.address,
            battery: Math.floor(Math.random() * 30) + 70,
            signal: Math.floor(Math.random() * -30) - 50,
            channels: [1, 2]
        }));
    }
}