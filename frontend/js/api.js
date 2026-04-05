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
    // Sensor Daten abrufen
    getSensorData: async (datapoint) => {
        // Später: return await fetchApi(`/sensors/${datapoint}/history`);
        const response = await fetch('sensor_data_test.json');
        if (!response.ok) throw new Error("HTTP Fehler " + response.status);
        const allData = await response.json();
        return allData[datapoint] || [];
    },

    // Dashboard Layout laden
    getDashboard: async () => {
        // Später: return await fetchApi('/dashboard');
        return null; // Gibt aktuell noch "null" zurück, bis ein Backend existiert
    },

    // Dashboard Layout speichern
    saveDashboard: async (dashboardState) => {
        // Später: return await fetchApi('/dashboard', { method: 'POST', body: JSON.stringify(dashboardState) });
        console.log('API Call: saveDashboard', dashboardState);
    },

    // Alle Sensoren für die Tabelle abrufen
    getSensors: async () => {
        // Später: return await fetchApi('/sensors');
        return [
            { name: 'Temp Living',   type: 'Temperature', location: 'Living Room', value: '21.4', unit: '\u00b0C',  status: 'active',   updated: '2025-01-01 10:00' },
            { name: 'Temp Bedroom',  type: 'Temperature', location: 'Bedroom',     value: '19.8', unit: '\u00b0C',  status: 'active',   updated: '2025-01-01 10:01' },
            { name: 'Energy Main',   type: 'Energy',      location: 'Main Meter',  value: '3.2',  unit: 'kWh', status: 'active',   updated: '2025-01-01 10:02' },
            { name: 'Energy Solar',  type: 'Energy',      location: 'Roof',        value: '1.1',  unit: 'kWh', status: 'warning',  updated: '2025-01-01 09:55' },
            { name: 'Motion Hall',   type: 'Motion',      location: 'Hallway',     value: '0',    unit: '',    status: 'inactive', updated: '2025-01-01 08:30' },
        ];
    },

    getActuators: async () => {
        return []; // return await fetchApi('/actuators');
    },
    getRules: async () => {
        return []; // return await fetchApi('/rules');
    },
    getUsers: async () => {
        return []; // return await fetchApi('/users');
    }
};

window.API = API;