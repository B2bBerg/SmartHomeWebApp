import { fetchApi } from './core.js';
import { MockDataGenerator } from './mockGenerator.js';

export const SensorsAPI = {
    getSensors: async () => {
        // Später: return await fetchApi('/sensors');
        try {
            const response = await fetch('./testing/sensors/sensors.json?t=' + Date.now());
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
            const response = await fetch('./testing/sensors/sensordata.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler " + response.status);
            const allData = await response.json();
            
            if (allData && allData[datapoint]) {
                return allData[datapoint];
            }
            // Falls der Sensor nicht im JSON steht, generiere dynamische Werte:
            return MockDataGenerator.generateTimeSeriesData(datapoint);
        } catch (error) {
            console.warn(`Nutze generierte Fallback-Daten für Graphen (${datapoint}).`);
            return MockDataGenerator.generateTimeSeriesData(datapoint);
        }
    },
    addSensor: async (sensorData) => {
        // Später: return await fetchApi('/sensors', { method: 'POST', body: JSON.stringify(sensorData) });
        return { success: true, id: 'backend-sens-' + Date.now() };
    },
    updateSensor: async (id, updateData) => {
        return { success: true }; // Später: return await fetchApi(`/sensors/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
    },
    deleteSensor: async (id) => {
        return { success: true }; // Später: return await fetchApi(`/sensors/${id}`, { method: 'DELETE' });
    }
};