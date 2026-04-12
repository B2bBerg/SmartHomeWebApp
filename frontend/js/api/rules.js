import { fetchApi } from './core.js';

export const RulesAPI = {
    // --- REGELN (RULES) ---
    getRules: async () => {
        // Später: return await fetchApi('/rules');
        return [
            { 
                id: "rule-1", 
                name: 'Hitzeschutz Wohnzimmer', 
                active: true, 
                logic: 'AND',
                conditions: [ { datapoint: 'sensor.temp.living', operator: 'grösser als', value: 25 } ]
            }
        ];
    },
    addRule: async (ruleData) => {
        const newId = ruleData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'rule-' + Date.now().toString(36));
        ruleData.id = newId;
        // Später: return await fetchApi('/rules', { method: 'POST', body: JSON.stringify(ruleData) });
        return { success: true, id: newId };
    },
    updateRule: async (id, ruleData) => { return { success: true }; },
    deleteRule: async (id) => { return { success: true }; },
    
    getRuleExecutionHistory: async (ruleId) => { return []; }
};