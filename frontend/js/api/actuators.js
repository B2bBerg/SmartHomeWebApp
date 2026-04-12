import { fetchApi } from './core.js';

export const ActuatorsAPI = {
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
        return { success: true }; // Später: return await fetchApi('/actuators', { method: 'POST', body: JSON.stringify(actuatorData) });
    },
    updateActuator: async (id, updateData) => {
        return { success: true }; // Später: return await fetchApi(`/actuators/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
    },
    deleteActuator: async (id) => {
        return { success: true }; // Später: return await fetchApi(`/actuators/${id}`, { method: 'DELETE' });
    }
};