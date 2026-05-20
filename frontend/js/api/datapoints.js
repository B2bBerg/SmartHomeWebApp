import { fetchApi } from './core.js';

// Helper für Mock-UUIDs
const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

export const DatapointsAPI = {
    // --- 1. GENERISCHE DATENPUNKTE (CRUD) ---
    getDatapoints: async () => {
        return await fetchApi('/datapoints');
    },

    addDatapoint: async (dpData) => {
        return await fetchApi('/datapoints', { method: 'POST', body: JSON.stringify(dpData) });
    },

    updateDatapoint: async (id, dpData) => {
        return await fetchApi(`/datapoints/${id}`, { method: 'PUT', body: JSON.stringify(dpData) });
    },

    deleteDatapoint: async (id) => {
        return await fetchApi(`/datapoints/${id}`, { method: 'DELETE' });
    },

    // --- 2. SENSOR-SPEZIFISCHE FILTER / FUNKTIONEN ---
    getSensors: async () => {
        const all = await DatapointsAPI.getDatapoints();
        return all.filter(dp => dp.isSensor || (dp.canRead && !dp.canWrite));
    },

    getSensorData: async (datapointId) => {
        // Echter Aufruf ans Backend:
        return await fetchApi(`/datapoints/${datapointId}/history`);
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
        return await fetchApi(`/datapoints/${datapointId}/state`, { method: 'PUT', body: JSON.stringify({ state }) });
    },

    addActuator: async (actuatorData) => DatapointsAPI.addDatapoint({ ...actuatorData, canRead: true, canWrite: true }),
    updateActuator: async (id, updateData) => DatapointsAPI.updateDatapoint(id, updateData),
    deleteActuator: async (id) => DatapointsAPI.deleteDatapoint(id)
};