import { fetchApi } from './core.js';

export const LocationsAPI = {
    getLocations: async () => {
        try {
            const response = await fetch('../testing/locations/locations.json?t=' + Date.now());
            if (!response.ok) throw new Error("HTTP Fehler " + response.status);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Fehler beim Laden der Locations-Struktur:", error);
            return [];
        }
    },
    saveLocations: async (locationsData) => {
        return { success: true };
    },
    lookupCityByZip: async (zip, country = 'Schweiz') => {
        const countryMap = {
            'schweiz': 'ch', 'switzerland': 'ch',
            'deutschland': 'de', 'germany': 'de',
            'österreich': 'at', 'austria': 'at',
            'usa': 'us', 'frankreich': 'fr', 'italien': 'it'
        };
        const cCode = countryMap[country.toLowerCase()] || 'ch';
        
        try {
            // Nutzt die freie Zippopotamus API für das Mapping
            const response = await fetch(`https://api.zippopotam.us/${cCode}/${zip}`);
            if (response.ok) {
                const data = await response.json();
                return data.places.map(place => place['place name']);
            }
        } catch (error) {
            console.warn("PLZ Lookup fehlgeschlagen:", error);
        }
        return [];
    },
    addLocation: async (locationData) => {
        return { success: true }; // return await fetchApi('/locations', { method: 'POST', body: JSON.stringify(locationData) });
    },
    updateLocation: async (id, locationData) => {
        return { success: true }; // return await fetchApi(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(locationData) });
    },
    deleteLocation: async (id) => {
        return { success: true }; // return await fetchApi(`/locations/${id}`, { method: 'DELETE' });
    }
};