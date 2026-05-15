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

    getSensorData: async (datapointId) => {
        try {
            // Echter Aufruf ans Backend:
            // return await fetchApi(`/datapoints/${datapointId}/history`);
            const response = await fetch('./testing/sensors/sensordata.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler");
            const allData = await response.json();
            
            if (allData && allData[datapointId]) return allData[datapointId];
            
            throw new Error("Datenpunkt in statischer Mock-Datei nicht gefunden.");
        } catch (error) {
            console.warn(`Nutze generierte Fallback-Daten für Graphen (${datapointId}).`);
            const dps = await DatapointsAPI.getDatapoints();
            const dp = dps.find(d => d.id === datapointId);
            const type = dp ? dp.type : 'temperature';
            return MockDataGenerator.generateTimeSeriesData(type);
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

    setActuatorState: async (datapointId, state) => {
        try {
            return await fetchApi(`/datapoints/${datapointId}/state`, { method: 'PUT', body: JSON.stringify({ state }) });
        } catch (error) {
            console.warn(`Backend nicht erreichbar. Fallback: setActuatorState für ${datapointId} ->`, state);
            return { success: true };
        }
    },

    addActuator: async (actuatorData) => DatapointsAPI.addDatapoint({ ...actuatorData, canRead: true, canWrite: true }),
    updateActuator: async (id, updateData) => DatapointsAPI.updateDatapoint(id, updateData),
    deleteActuator: async (id) => DatapointsAPI.deleteDatapoint(id)
};