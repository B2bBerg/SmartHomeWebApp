/**
 * api.js - Zentrale Verwaltung aller Backend-Aufrufe
 */
const BASE_URL = '/api'; // Später anpassbar, z.B. 'http://192.168.1.100:8080/api'

async function fetchApi(endpoint, options = {}) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            // Zentrales Error-Handling
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`[API Call Failed] ${endpoint}:`, error);
        throw error; // Fehler weitergeben, falls das UI (z.B. Graph) ihn noch braucht
    }
}

const API = {
    // --- DASHBOARD ---
    getDashboard: async () => {
        try {
            // Zuerst prüfen, ob es bereits lokal im Browser gespeicherte Anpassungen gibt
            const savedState = localStorage.getItem('smartHomeDashboard');
            if (savedState) {
                console.log("Dashboard Layout aus localStorage geladen.");
                return JSON.parse(savedState);
            }

            // 2. Falls nicht, initiale Konfiguration aus der Datei laden
            const response = await fetch('../testing/dashboard/dashboard.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler " + response.status);
            const data = await response.json();
            
            // Initiale Daten im localStorage ablegen
            localStorage.setItem('smartHomeDashboard', JSON.stringify(data));
            return data;
        } catch (error) {
            console.error("Fehler beim Laden des Dashboards:", error);
            return [];
        }
    },

    saveDashboard: async (dashboardState) => {
        try {
            // Solange kein Backend existiert, speichern wir das Layout im localStorage des Browsers.
            // So bleibt es auch nach einem F5 / Seiten-Refresh erhalten.
            localStorage.setItem('smartHomeDashboard', JSON.stringify(dashboardState));
            console.log('Dashboard Layout im localStorage gespeichert (Fallback ohne Backend)');
        } catch (error) {
            console.error("Fehler beim Speichern des Dashboards:", error);
        }
    },

    // --- GERÄTE (DEVICES) ---
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
    },

    // --- SENSOREN (SENSORS) ---
    getSensors: async () => {
        // Später: return await fetchApi('/sensors');
        try {
            const response = await fetch('../testing/sensors/sensors.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler " + response.status);
            return await response.json();
        } catch (error) {
            console.error("Fehler beim Laden der Sensorliste:", error);
            return [];
        }
    },
    getSensorData: async (datapoint) => {
        // Später: return await fetchApi(`/sensors/${datapoint}/history`);
        try {
            const response = await fetch('../testing/sensors/sensordata.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler " + response.status);
            const allData = await response.json();
            return allData[datapoint] || [];
        } catch (error) {
            console.error(`Fehler beim Laden der Testdaten für ${datapoint}:`, error);
            return [];
        }
    },
    addSensor: async (sensorData) => {
        // Später: return await fetchApi('/sensors', { method: 'POST', body: JSON.stringify(sensorData) });
        return { success: true };
    },
    updateSensor: async (id, updateData) => {
        // Später: return await fetchApi(`/sensors/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
        return { success: true };
    },
    deleteSensor: async (id) => {
        // Später: return await fetchApi(`/sensors/${id}`, { method: 'DELETE' });
        return { success: true };
    },

    // --- AKTOREN (ACTUATORS) ---
    getActuators: async () => {
        // Später: return await fetchApi('/actuators');
        try {
            const response = await fetch('../testing/actuators/actuators.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler " + response.status);
            return await response.json();
        } catch (error) {
            console.error("Fehler beim Laden der Aktorenliste:", error);
            return [];
        }
    },
    setActuatorState: async (datapoint, state) => {
        // Später: return await fetchApi(`/actuators/${datapoint}`, { method: 'POST', body: JSON.stringify({ state }) });
        console.log(`API Call: setActuatorState für ${datapoint} ->`, state);
        return { success: true };
    },
    addActuator: async (actuatorData) => {
        // Später: return await fetchApi('/actuators', { method: 'POST', body: JSON.stringify(actuatorData) });
        return { success: true };
    },
    updateActuator: async (id, updateData) => {
        // Später: return await fetchApi(`/actuators/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
        return { success: true };
    },
    deleteActuator: async (id) => {
        // Später: return await fetchApi(`/actuators/${id}`, { method: 'DELETE' });
        return { success: true };
    },

    // --- REGELN (RULES) ---
    getRules: async () => {
        // Später: return await fetchApi('/rules');
        return [
            { 
                id: "rule-1", 
                name: 'Hitzeschutz Wohnzimmer', 
                active: true, 
                logic: 'AND',
                conditions: [ { datapoint: 'sensor.temp.living', operator: 'grösser als', value: 25 } ]
            }
        ];
    },
    addRule: async (ruleData) => {
        return { success: true }; // return await fetchApi('/rules', { method: 'POST', body: JSON.stringify(ruleData) });
    },
    updateRule: async (id, ruleData) => {
        return { success: true }; // return await fetchApi(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(ruleData) });
    },
    deleteRule: async (id) => {
        return { success: true }; // return await fetchApi(`/rules/${id}`, { method: 'DELETE' });
    },

    // --- BENUTZER (USERS) ---
    getUsers: async () => {
        return []; // return await fetchApi('/users');
    },
    addUser: async (userData) => {
        return { success: true }; // return await fetchApi('/users', { method: 'POST', body: JSON.stringify(userData) });
    },
    updateUser: async (id, userData) => {
        return { success: true }; // return await fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
    },
    deleteUser: async (id) => {
        return { success: true }; // return await fetchApi(`/users/${id}`, { method: 'DELETE' });
    },

    // --- APARTMENT / LOCATIONS ---
    getLocations: async () => {
        try {
            const response = await fetch('../testing/locations/locations.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler " + response.status);
            return await response.json();
        } catch (error) {
            return [];
        }
    },
    addLocation: async (locationData) => {
        return { success: true }; // return await fetchApi('/locations', { method: 'POST', body: JSON.stringify(locationData) });
    },
    updateLocation: async (id, locationData) => {
        return { success: true }; // return await fetchApi(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(locationData) });
    },
    deleteLocation: async (id) => {
        return { success: true }; // return await fetchApi(`/locations/${id}`, { method: 'DELETE' });
    },

    // --- SETTINGS ---
    getSettings: async () => {
        return {}; // return await fetchApi('/settings');
    },
    saveSettings: async (settingsData) => {
        return { success: true }; // return await fetchApi('/settings', { method: 'POST', body: JSON.stringify(settingsData) });
    },

    // --- SYSTEM STATUS ---
    getSystemStatus: async () => {
        return { status: 'online', cpu: 12, ram: 45, uptime: '24d 12h' }; // return await fetchApi('/system/status');
    }
};

window.API = API;