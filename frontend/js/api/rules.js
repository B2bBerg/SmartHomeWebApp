import { fetchApi } from './core.js';

const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

export const RulesAPI = {
    getRules: async () => {
        try {
            return await fetchApi('/rules');
        } catch (error) {
            console.warn("Backend-API '/rules' nicht erreichbar. Nutze Fallback.");
            return []; // Hier später deine Mock-Regeln einfügen
        }
    },
    
    addRule: async (ruleData) => {
        try {
            return await fetchApi('/rules', { method: 'POST', body: JSON.stringify(ruleData) });
        } catch (error) {
            console.warn("Backend-API POST '/rules' nicht erreichbar. Nutze Fallback.");
            return { success: true, id: generateUUID() };
        }
    },
    
    deleteRule: async (id) => {
        try {
            return await fetchApi(`/rules/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.warn(`Backend-API DELETE '/rules/${id}' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    }
};