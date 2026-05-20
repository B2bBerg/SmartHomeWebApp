import { fetchApi } from './core.js';

// Helper für Mock-UUIDs passend zur DB-Syntax (uuidv7)
const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

export const LocationsAPI = {
    getLocations: async () => {
        // Wirft bei Fehlern eine Exception, die vom UI-Code gefangen werden muss
        return await fetchApi('/locations');
    },

    saveLocations: async (locationsData) => {
        // Bulk-Update für die gesamte Hierarchie. Wirft bei Fehlern eine Exception.
        return await fetchApi('/locations/batch', { method: 'POST', body: JSON.stringify(locationsData) });
    },

    getLocationTypes: async (groupName) => {
        return await fetchApi(`/location-types?group=${encodeURIComponent(groupName)}`);
    },

    addLocationType: async (typeData) => {
        return await fetchApi('/location-types', { method: 'POST', body: JSON.stringify(typeData) });
    },

    addLocation: async (locationData) => {
        return await fetchApi('/locations', { method: 'POST', body: JSON.stringify(locationData) });
    },

    updateLocation: async (id, locationData) => {
        return await fetchApi(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(locationData) });
    },

    deleteLocation: async (id) => {
        return await fetchApi(`/locations/${id}`, { method: 'DELETE' });
    }
};