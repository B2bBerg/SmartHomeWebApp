import { fetchApi } from './core.js';

const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

export const RulesAPI = {
    getRules: async () => {
        return await fetchApi('/rules');
    },
    
    addRule: async (ruleData) => {
        return await fetchApi('/rules', { method: 'POST', body: JSON.stringify(ruleData) });
    },
    
    deleteRule: async (id) => {
        return await fetchApi(`/rules/${id}`, { method: 'DELETE' });
    }
};