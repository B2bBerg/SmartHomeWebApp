import { fetchApi } from './core.js';

// Helper für Mock-UUIDs
const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

export const SystemAPI = {
    getDashboard: async () => {
        try {
            return await fetchApi('/dashboard');
        } catch (error) {
            console.warn("Backend-API '/dashboard' nicht erreichbar. Nutze Fallback.");
            try {
                const response = await fetch('./testing/dashboard/dashboard.json?t=' + Date.now());
                if (!response.ok) throw new Error("HTTP Fehler " + response.status);
                return await response.json();
            } catch (mockError) {
                console.error("Fehler beim Laden des Dashboards aus dem Mock:", mockError);
                return {};
            }
        }
    },

    saveDashboard: async (dashboardState) => {
        try {
            return await fetchApi('/dashboard', { method: 'POST', body: JSON.stringify(dashboardState) });
        } catch (error) {
            console.warn("Backend-API POST '/dashboard' nicht erreichbar. Nutze Fallback.");
            return { success: true };
        }
    },

    // --- BENUTZER (USERS) ---
    getUsers: async () => {
        try {
            return await fetchApi('/users');
        } catch (error) {
            console.warn("Backend-API '/users' nicht erreichbar. Nutze Fallback.");
            return []; 
        }
    },
    addUser: async (userData) => {
        try {
            return await fetchApi('/users', { method: 'POST', body: JSON.stringify(userData) });
        } catch (error) {
            console.warn("Backend-API POST '/users' nicht erreichbar. Nutze Fallback.");
            return { success: true, id: generateUUID() };
        }
    },
    updateUser: async (id, userData) => {
        try {
            return await fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
        } catch (error) {
            console.warn(`Backend-API PUT '/users/${id}' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    },
    deleteUser: async (id) => {
        try {
            return await fetchApi(`/users/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.warn(`Backend-API DELETE '/users/${id}' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    },

    // --- SETTINGS ---
    getSettings: async () => {
        try {
            return await fetchApi('/settings');
        } catch (error) {
            console.warn("Backend-API '/settings' nicht erreichbar. Nutze Fallback.");
            return {}; 
        }
    },
    saveSettings: async (settingsData) => {
        try {
            return await fetchApi('/settings', { method: 'PUT', body: JSON.stringify(settingsData) });
        } catch (error) {
            console.warn("Backend-API PUT '/settings' nicht erreichbar. Nutze Fallback.");
            return { success: true };
        }
    },

    // --- SYSTEM STATUS ---
    getSystemStatus: async () => {
        try {
            return await fetchApi('/system/status');
        } catch (error) {
            console.warn("Backend-API '/system/status' nicht erreichbar. Nutze Fallback.");
            return { status: 'online', cpu: 12, ram: 45, uptime: '24d 12h' };
        }
    },

    // --- ALARME & BENACHRICHTIGUNGEN ---
    getAlarms: async () => {
        try {
            return await fetchApi('/alarms');
        } catch (error) {
            console.warn("Backend-API '/alarms' nicht erreichbar. Nutze Fallback.");
            return []; 
        }
    },
    acknowledgeAlarm: async (id) => {
        try {
            return await fetchApi(`/alarms/${id}/acknowledge`, { method: 'POST' });
        } catch (error) {
            console.warn(`Backend-API POST '/alarms/${id}/acknowledge' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    },
    getNotifications: async () => {
        try {
            return await fetchApi('/notifications');
        } catch (error) {
            console.warn("Backend-API '/notifications' nicht erreichbar. Nutze Fallback.");
            return []; 
        }
    },
    markNotificationRead: async (id) => {
        try {
            return await fetchApi(`/notifications/${id}/read`, { method: 'POST' });
        } catch (error) {
            console.warn(`Backend-API POST '/notifications/${id}/read' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    },

    // --- HISTORIE & LOGGING ---
    getSystemLogs: async (level = 'all', limit = 100) => {
        try {
            return await fetchApi(`/system/logs?level=${level}&limit=${limit}`);
        } catch (error) {
            console.warn("Backend-API '/system/logs' nicht erreichbar. Nutze Fallback.");
            return []; 
        }
    },

    // --- SYSTEM WARTUNG ---
    createBackup: async () => {
        try {
            return await fetchApi('/system/backup', { method: 'POST' });
        } catch (error) {
            console.warn("Backend-API POST '/system/backup' nicht erreichbar. Nutze Fallback.");
            return { success: true, url: '/api/system/backup/download' }; 
        }
    },
    restoreBackup: async (fileData) => {
        try {
            return await fetchApi('/system/backup/restore', { method: 'POST', body: JSON.stringify(fileData) });
        } catch (error) {
            console.warn("Backend-API POST '/system/backup/restore' nicht erreichbar. Nutze Fallback.");
            return { success: true };
        }
    }
};