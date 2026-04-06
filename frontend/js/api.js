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

    // Dashboard Layout laden
    getDashboard: async () => {
        try {
            // 1. Zuerst prüfen, ob es bereits lokal im Browser gespeicherte Anpassungen gibt
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

    // Dashboard Layout speichern
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

    // Alle Sensoren für die Tabelle abrufen
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

    // Geräte Metadaten (Hardware) abrufen
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

    // Status eines Aktors (Schalter, Rollladen) ans Backend senden
    setActuatorState: async (datapoint, state) => {
        // Später: return await fetchApi(`/actuators/${datapoint}`, { method: 'POST', body: JSON.stringify({ state }) });
        console.log(`API Call: setActuatorState für ${datapoint} ->`, state);
        return { success: true };
    },

    getRules: async () => {
        return []; // return await fetchApi('/rules');
    },
    getUsers: async () => {
        return []; // return await fetchApi('/users');
    }
};

window.API = API;