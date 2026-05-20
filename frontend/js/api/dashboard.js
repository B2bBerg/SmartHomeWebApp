import { fetchApi } from './core.js';

export const DashboardAPI = {
    getDashboard: async () => {
        // Temporärer Fallback auf LocalStorage, da das Backend noch keine /dashboard Route hat
        const saved = localStorage.getItem('smartHomeDashboard');
        return saved ? JSON.parse(saved) : [];
    },

    saveDashboard: async (dashboardState) => {
        // Temporärer Fallback auf LocalStorage
        localStorage.setItem('smartHomeDashboard', JSON.stringify(dashboardState));
        return { success: true };
    }
};