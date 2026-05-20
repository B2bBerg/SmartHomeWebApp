import { fetchApi } from './core.js';

// Helper für Mock-UUIDs
const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

export const SystemAPI = {
    // --- BENUTZER (USERS) ---
    getUsers: async () => {
        return await fetchApi('/users');
    },
    addUser: async (userData) => {
        return await fetchApi('/users', { method: 'POST', body: JSON.stringify(userData) });
    },
    updateUser: async (id, userData) => {
        return await fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
    },
    deleteUser: async (id) => {
        return await fetchApi(`/users/${id}`, { method: 'DELETE' });
    },

    // --- SETTINGS ---
    getSettings: async () => {
        return await fetchApi('/settings');
    },
    saveSettings: async (settingsData) => {
        return await fetchApi('/settings', { method: 'PUT', body: JSON.stringify(settingsData) });
    },

    // --- SYSTEM STATUS ---
    getSystemStatus: async () => {
        return await fetchApi('/system/status');
    },

    // --- ALARME & BENACHRICHTIGUNGEN ---
    getAlarms: async () => {
        return await fetchApi('/alarms');
    },
    acknowledgeAlarm: async (id) => {
        return await fetchApi(`/alarms/${id}/acknowledge`, { method: 'POST' });
    },
    getNotifications: async () => {
        return await fetchApi('/notifications');
    },
    markNotificationRead: async (id) => {
        return await fetchApi(`/notifications/${id}/read`, { method: 'POST' });
    },

    // --- HISTORIE & LOGGING ---
    getSystemLogs: async (level = 'all', limit = 100) => {
        return await fetchApi(`/system/logs?level=${level}&limit=${limit}`);
    },

    // --- SYSTEM WARTUNG ---
    createBackup: async () => {
        return await fetchApi('/system/backup', { method: 'POST' });
    },
    restoreBackup: async (fileData) => {
        return await fetchApi('/system/backup/restore', { method: 'POST', body: JSON.stringify(fileData) });
    }
};