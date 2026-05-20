import { fetchApi } from './core.js';

export const DashboardAPI = {
    getDashboard: async (id = 'main') => {
        return await fetchApi(`/dashboard/${encodeURIComponent(id)}`);
    },

    saveDashboard: async (id = 'main', dashboardState) => {
        return await fetchApi(`/dashboard/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(dashboardState) });
    }
};