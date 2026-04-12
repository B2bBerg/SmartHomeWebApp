import { fetchApi } from './core.js';

export const SystemAPI = {
    getDashboard: async () => {
        try {
            const response = await fetch('../testing/dashboard/dashboard.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler " + response.status);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Fehler beim Laden des Dashboards:", error);
            return [];
        }
    },
    saveDashboard: async (dashboardState) => {
        try {
            console.log('Dashboard Layout speichern wird ignoriert, da direkt aus JSON geladen wird.');
        } catch (error) {
            console.error("Fehler beim Speichern des Dashboards:", error);
        }
    },

    // --- BENUTZER (USERS) ---
    getUsers: async () => { return []; },
    addUser: async (userData) => { return { success: true }; },
    updateUser: async (id, userData) => { return { success: true }; },
    deleteUser: async (id) => { return { success: true }; },

    // --- SETTINGS ---
    getSettings: async () => { return {}; },
    saveSettings: async (settingsData) => { return { success: true }; },

    // --- SYSTEM STATUS ---
    getSystemStatus: async () => { return { status: 'online', cpu: 12, ram: 45, uptime: '24d 12h' }; },

    // --- ALARME & BENACHRICHTIGUNGEN ---
    getAlarms: async () => { return []; },
    acknowledgeAlarm: async (id) => { return { success: true }; },
    getNotifications: async () => { return []; },
    markNotificationRead: async (id) => { return { success: true }; },

    // --- HISTORIE & LOGGING ---
    getSystemLogs: async (level = 'all', limit = 100) => { return []; },

    // --- SYSTEM WARTUNG ---
    createBackup: async () => { return { success: true, url: '/api/system/backup/download' }; },
    restoreBackup: async (fileData) => { return { success: true }; }
};