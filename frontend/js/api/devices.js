import { fetchApi } from './core.js';

export const DevicesAPI = {
    getDevices: async () => {
        try {
            const response = await fetch('../testing/devices/devices.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler " + response.status);
            return await response.json();
        } catch (error) {
            console.error("Fehler beim Laden der Geräteliste:", error);
            return [];
        }
    },
    scanDevice: async (address, busType) => {
        // Später: return await fetchApi(`/devices/scan?address=${encodeURIComponent(address)}&bus=${encodeURIComponent(busType)}`);
        console.log(`API Call: scanDevice für Adresse ${address} auf Bus ${busType}`);
        
        // Simuliere echte Netzwerklatenz (Suche dauert ca. 2.5 Sekunden)
        return new Promise(resolve => setTimeout(() => {
            const mockDatabase = [
                { macAddress: 'AA:BB:CC:DD:EE:FF', busAddress: '', channels: ["AI_1", "DI_1"], type: 'Temperature', name: 'WLAN Multisensor', location: 'Unassigned', busType: 'WIFI' },
                { macAddress: '', busAddress: '0x05', channels: ["DO_1"], type: 'Switch', name: 'RS485 Relais', location: 'Unassigned', busType: 'RS485' }
            ];
            resolve(mockDatabase.find(d => (d.macAddress === address || d.busAddress === address) && (!busType || d.busType === busType)) || null);
        }, 2500));
    },
    addDevice: async (deviceData) => {
        // Später: return await fetchApi('/devices', { method: 'POST', body: JSON.stringify(deviceData) });
        return { success: true, id: deviceData.id };
    },
    updateDevice: async (id, updateData) => {
        // Später: return await fetchApi(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
        return { success: true };
    },
    deleteDevice: async (id) => {
        // Später: return await fetchApi(`/devices/${id}`, { method: 'DELETE' });
        return { success: true };
    }
};