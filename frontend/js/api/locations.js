import { fetchApi } from './core.js';

// Helper für Mock-UUIDs passend zur DB-Syntax (uuidv7)
const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

const mockLocationTypes = [
    { id: generateUUID(), name: 'Erdgeschoss', group: 'floor' },
    { id: generateUUID(), name: 'Obergeschoss', group: 'floor' },
    { id: generateUUID(), name: 'Appartment', group: 'floor' },
    { id: generateUUID(), name: 'Keller', group: 'floor' },
    { id: generateUUID(), name: 'Wohnzimmer', group: 'room' },
    { id: generateUUID(), name: 'Schlafzimmer', group: 'room' },
    { id: generateUUID(), name: 'Küche', group: 'room' },
    { id: generateUUID(), name: 'Badezimmer', group: 'room' },
    { id: generateUUID(), name: 'Haupthaus', group: 'building' },
    { id: generateUUID(), name: 'Garage', group: 'building' }
];

export const LocationsAPI = {
    getLocations: async () => {
        try {
            // Versuch 1: Echtes Backend ansprechen
            return await fetchApi('/locations');
        } catch (error) {
            console.warn("Backend-API '/locations' nicht erreichbar. Nutze lokalen Fallback.", error);
            // Fallback 2: Lokale JSON-Mock-Datei laden
            try {
                const response = await fetch('./testing/locations/locations.json?t=' + Date.now());
                if (!response.ok) throw new Error("HTTP Fehler " + response.status);
                return await response.json();
            } catch (fallbackError) {
                console.error("Fehler beim Laden der lokalen Locations-Struktur:", fallbackError);
                return [];
            }
        }
    },

    saveLocations: async (locationsData) => {
        try {
            // Bulk-Update für die gesamte Hierarchie
            return await fetchApi('/locations/batch', { method: 'POST', body: JSON.stringify(locationsData) });
        } catch (error) {
            console.warn("Backend-API '/locations/batch' nicht erreichbar. Nutze Fallback.", error);
            return { success: true };
        }
    },

    getLocationTypes: async (groupName) => {
        try {
            return await fetchApi(`/location-types?group=${encodeURIComponent(groupName)}`);
        } catch (error) {
            console.warn(`Backend-API '/location-types' nicht erreichbar. Nutze Fallback für Gruppe: ${groupName}`);
            return mockLocationTypes.filter(t => t.group === groupName);
        }
    },

    addLocationType: async (typeData) => {
        try {
            return await fetchApi('/location-types', { method: 'POST', body: JSON.stringify(typeData) });
        } catch (error) {
            console.warn("Backend-API POST '/location-types' nicht erreichbar. Nutze Fallback.");
            const newType = { id: generateUUID(), ...typeData };
            mockLocationTypes.push(newType);
            return { success: true, id: newType.id };
        }
    },

    addLocation: async (locationData) => {
        try {
            return await fetchApi('/locations', { method: 'POST', body: JSON.stringify(locationData) });
        } catch (error) {
            console.warn("Backend-API POST '/locations' nicht erreichbar. Nutze Fallback.");
            return { success: true, id: generateUUID() }; // Fallback nutzt UUIDv7 Simulation
        }
    },

    updateLocation: async (id, locationData) => {
        try {
            return await fetchApi(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(locationData) });
        } catch (error) {
            console.warn(`Backend-API PUT '/locations/${id}' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    },

    deleteLocation: async (id) => {
        try {
            return await fetchApi(`/locations/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.warn(`Backend-API DELETE '/locations/${id}' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    }
};