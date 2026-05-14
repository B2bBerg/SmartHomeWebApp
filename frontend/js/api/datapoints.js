import { fetchApi } from './core.js';
import { MockDataGenerator } from './mockGenerator.js';

// Helper für Mock-UUIDs
const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

export const DatapointsAPI = {
    // --- 1. GENERISCHE DATENPUNKTE (CRUD) ---
    getDatapoints: async () => {
        try {
            return await fetchApi('/datapoints');
        } catch (error) {
            console.warn("Backend-API '/datapoints' nicht erreichbar. Nutze Datenpunkt-Fallback.");
            try {
                // Fallback: Lade neue kombinierte Mock-JSON Datei
                const response = await fetch('./testing/datapoint/datapoint.json?t=' + Date.now());
                if (!response.ok) throw new Error("HTTP Fehler beim Laden von datapoint.json");
                
                return await response.json();
            } catch (e) {
                console.error("Fehler beim Fallback-Laden der Datenpunkte", e);
                return [];
            }
        }
    },

    addDatapoint: async (dpData) => {
        try {
            return await fetchApi('/datapoints', { method: 'POST', body: JSON.stringify(dpData) });
        } catch (error) {
            console.warn("Backend-API POST '/datapoints' nicht erreichbar. Nutze Fallback.");
            return { success: true, id: generateUUID() };
        }
    },

    updateDatapoint: async (id, dpData) => {
        try {
            return await fetchApi(`/datapoints/${id}`, { method: 'PUT', body: JSON.stringify(dpData) });
        } catch (error) {
            console.warn(`Backend-API PUT '/datapoints/${id}' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    },

    deleteDatapoint: async (id) => {
        try {
            return await fetchApi(`/datapoints/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.warn(`Backend-API DELETE '/datapoints/${id}' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    },

    // --- 2. SENSOR-SPEZIFISCHE FILTER / FUNKTIONEN ---
    getSensors: async () => {
        const all = await DatapointsAPI.getDatapoints();
        return all.filter(dp => dp.isSensor || (dp.canRead && !dp.canWrite));
    },

    getSensorData: async (datapoint) => {
        try {
            // Hier z.B. später echter Aufruf: return await fetchApi(`/datapoints/${datapoint}/history`);
            const response = await fetch('./testing/sensors/sensordata.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler");
            const allData = await response.json();
            
            if (allData && allData[datapoint]) return allData[datapoint];
            return MockDataGenerator.generateTimeSeriesData(datapoint);
        } catch (error) {
            console.warn(`Nutze generierte Fallback-Daten für Graphen (${datapoint}).`);
            return MockDataGenerator.generateTimeSeriesData(datapoint);
        }
    },

    addSensor: async (sensorData) => DatapointsAPI.addDatapoint({ ...sensorData, canRead: true, canWrite: false }),
    updateSensor: async (id, updateData) => DatapointsAPI.updateDatapoint(id, updateData),
    deleteSensor: async (id) => DatapointsAPI.deleteDatapoint(id),

    // --- 3. AKTOR-SPEZIFISCHE FILTER / FUNKTIONEN ---
    getActuators: async () => {
        const all = await DatapointsAPI.getDatapoints();
        return all.filter(dp => dp.isActuator || dp.canWrite);
    },

    setActuatorState: async (datapoint, state) => {
        // Späterer Aufruf ans Backend: return await fetchApi(`/datapoints/${datapoint}/state`, { method: 'PUT', body: JSON.stringify({ state }) });
        console.log(`API Call: setActuatorState für ${datapoint} ->`, state);
        return { success: true };
    },

    addActuator: async (actuatorData) => DatapointsAPI.addDatapoint({ ...actuatorData, canRead: true, canWrite: true }),
    updateActuator: async (id, updateData) => DatapointsAPI.updateDatapoint(id, updateData),
    deleteActuator: async (id) => DatapointsAPI.deleteDatapoint(id)
};