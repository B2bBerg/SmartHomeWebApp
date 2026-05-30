import { fetchApi } from './core.js';

export const DatapointsAPI = {
    // --- 1. DATENPUNKTE (Sensoren & Aktoren) ---
    getDatapoints: async (type = null) => {
        const query = type ? `?type=${encodeURIComponent(type)}` : '';
        return await fetchApi(`/datapoints${query}`);
    },

    // Komfort-Wrapper für die gefilterten Backend-Abfragen
    getSensors: async () => DatapointsAPI.getDatapoints('sensor'),
    getActuators: async () => DatapointsAPI.getDatapoints('actuator'),

    addDatapoint: async (dpData) => fetchApi('/datapoints', { method: 'POST', body: JSON.stringify(dpData) }),
    updateDatapoint: async (id, dpData) => fetchApi(`/datapoints/${id}`, { method: 'PUT', body: JSON.stringify(dpData) }),
    deleteDatapoint: async (id) => fetchApi(`/datapoints/${id}`, { method: 'DELETE' }),

    // --- 2. HILFSTABELLEN (Dictionaries) ---
    getDatapointTypes: async () => fetchApi('/datapoints/types'),
    getUnitTypes: async () => fetchApi('/datapoints/units'),

    // --- 3. LIVEDATEN & STEUERUNG (State & History) ---
    getSensorData: async (id) => fetchApi(`/datapoints/${id}/history`),
    setActuatorState: async (id, state) => fetchApi(`/datapoints/${id}/state`, { method: 'PUT', body: JSON.stringify({ state }) })
};