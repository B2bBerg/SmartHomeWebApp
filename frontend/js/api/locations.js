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

    searchAddresses: async (query) => {
        try {
            return await fetchApi(`/addresses/search?q=${encodeURIComponent(query)}`);
        } catch (error) {
            console.warn("Backend-API '/addresses/search' nicht erreichbar. Nutze lokalen Fallback.");
            try {
                const response = await fetch('./testing/locations/locations.json?t=' + Date.now());
                if (!response.ok) return [];
                const data = await response.json();
                
                const results = [];
                const queryTerms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
                
                (data || []).forEach(loc => {
                    // Adress-Mapping analog zu dbStaticData.sql Table 'address'
                    if (loc.address && loc.address.street) {
                        const addrStr = `${loc.address.street} ${loc.address.number || ''} ${loc.address.zip || ''} ${loc.address.city || ''}`.trim();
                        
                        // Omni-Search (Jedes Suchwort muss vorkommen)
                        const isMatch = queryTerms.every(term => addrStr.toLowerCase().includes(term));
                        
                        if (isMatch && !results.find(a => a.str === addrStr)) {
                            results.push({ str: addrStr, obj: loc.address });
                        }
                    }
                });
                return results;
            } catch (fallbackError) {
                console.error("Fehler beim Mock der Adress-Suche:", fallbackError);
                return [];
            }
        }
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
            // Externe API nutzen (Kein Backend notwendig)
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