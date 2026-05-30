import { fetchApi } from './core.js';

export const DashboardAPI = {
    // --- Dashboard Metadaten (app_page) ---
    getAllDashboards: async () => {
        return await fetchApi(`/dashboard`);
    },

    getDashboard: async (slug) => {
        return await fetchApi(`/dashboard/${encodeURIComponent(slug)}`);
    },

    saveDashboard: async (slug, dashboardData) => {
        return await fetchApi(`/dashboard/${encodeURIComponent(slug)}`, { method: 'POST', body: JSON.stringify(dashboardData) });
    },

    deleteDashboard: async (slug) => {
        return await fetchApi(`/dashboard/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    },

    // --- Subdashboards / Tiles für das Grid-System ---
    getDashboardTiles: async (slug = 'main') => {
        return await fetchApi(`/dashboard/${encodeURIComponent(slug)}/tiles`);
    },

    saveDashboardTiles: async (slug = 'main', tilesState) => {
        return await fetchApi(`/dashboard/${encodeURIComponent(slug)}/tiles`, { method: 'POST', body: JSON.stringify(tilesState) });
    }
};