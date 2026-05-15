import { fetchApi } from './core.js';

export const DevicesAPI = {
    getBusTypes: async () => {
        try {
            return await fetchApi('/devices/bus-types');
        } catch (apiError) {
            console.warn("Fallback: Lade Bus-Typen aus dem Mock.");
            try {
                const response = await fetch('./testing/devices/busType.json?t=' + Date.now());
                if (!response.ok) throw new Error("HTTP Fehler " + response.status);
                return await response.json();
            } catch (mockError) {
                // Fallback, falls die spezifische JSON noch nicht angelegt wurde
                return ['WIFI', 'Thread', 'RS485', 'Ethernet'];
            }
        }
    },

    getDevices: async (busType = null) => {
        try {
            // 1. Versuche die echten Daten vom Backend zu laden
            const query = busType ? `?bus=${encodeURIComponent(busType)}` : '';
            return await fetchApi('/devices' + query);
        } catch (apiError) {
            console.warn("Backend nicht erreichbar oder Endpunkt fehlt. Nutze Fallback für getDevices:", apiError);
            
            // 2. Fallback auf die lokalen Mock-Daten
            try {
                const response = await fetch('./testing/devices/devices.json?t=' + Date.now());
                if (!response.ok) throw new Error("HTTP Fehler " + response.status);
                const data = await response.json();
                return busType ? data.filter(d => d.busType === busType) : data;
            } catch (mockError) {
                console.error("Fehler beim Laden der Geräteliste aus dem Mock:", mockError);
                return [];
            }
        }
    },
    
    scanNetwork: async (busType) => {
        try {
            return await fetchApi(`/devices/scan-network?bus=${encodeURIComponent(busType)}`);
        } catch (apiError) {
            console.warn(`Fallback: scanNetwork für Bus ${busType} fehlgeschlagen, nutze Mock-Daten.`);
            
            try {
                // Simuliere Netzwerklatenz
                await new Promise(resolve => setTimeout(resolve, 1500));
                const response = await fetch('./testing/devices/deviceNetworkScan.json?t=' + Date.now());
                if (!response.ok) throw new Error("HTTP Fehler " + response.status);
                const mockNetworkDevices = await response.json();
                return mockNetworkDevices.filter(d => !busType || d.busType === busType);
            } catch (mockError) {
                console.error("Fehler beim Laden der Netzwerk-Scan Mock-Daten:", mockError);
                return [];
            }
        }
    },

    scanDevice: async (address, busType) => {
        try {
            return await fetchApi(`/devices/scan?address=${encodeURIComponent(address)}&bus=${encodeURIComponent(busType)}`);
        } catch (apiError) {
            console.warn(`Fallback: scanDevice für Adresse ${address} auf Bus ${busType} fehlgeschlagen, nutze Mock-Daten.`);
            
            try {
                // Simuliere echte Netzwerklatenz
                await new Promise(resolve => setTimeout(resolve, 2500));
                const response = await fetch('./testing/devices/network_devices.json?t=' + Date.now());
                if (!response.ok) throw new Error("HTTP Fehler " + response.status);
                const mockDatabase = await response.json();
                
                // Sicherheitscheck: Führt den Match nur aus, wenn address gesetzt ist
                return mockDatabase.find(d => address && (d.macAddress === address || d.busAddress === address) && (!busType || d.busType === busType)) || null;
            } catch (mockError) {
                console.error("Fehler beim Laden der Geräte-Scan Mock-Daten:", mockError);
                return null;
            }
        }
    },
    
    addDevice: async (deviceData) => {
        try {
            return await fetchApi('/devices', { method: 'POST', body: JSON.stringify(deviceData) });
        } catch (apiError) {
            console.warn("Fallback: Nutze simulierten Response für addDevice");
            return { success: true, id: 'backend-dev-' + Date.now() };
        }
    },
    
    updateDevice: async (id, updateData) => {
        try {
            return await fetchApi(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
        } catch (apiError) {
            console.warn("Fallback: Nutze simulierten Response für updateDevice");
            return { success: true };
        }
    },
    
    deleteDevice: async (id) => {
        try {
            return await fetchApi(`/devices/${id}`, { method: 'DELETE' });
        } catch (apiError) {
            console.warn("Fallback: Nutze simulierten Response für deleteDevice");
            return { success: true };
        }
    }
};