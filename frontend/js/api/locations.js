import { fetchApi } from './core.js';

const mockLocationTypes = [
    { name: 'Erdgeschoss', group: 'floor' },
    { name: 'Obergeschoss', group: 'floor' },
    { name: 'Appartment', group: 'floor' },
    { name: 'Keller', group: 'floor' },
    { name: 'Wohnzimmer', group: 'room' },
    { name: 'Schlafzimmer', group: 'room' },
    { name: 'Küche', group: 'room' },
    { name: 'Badezimmer', group: 'room' },
    { name: 'Haupthaus', group: 'building' },
    { name: 'Garage', group: 'building' }
];

export const LocationsAPI = {
    getLocations: async () => {
        try {
            const response = await fetch('./testing/locations/locations.json?t=' + Date.now());
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
    getLocationTypes: async (groupName) => {
        // Später: Zukünftiger echter API-Aufruf ins Backend
        // return await fetchApi(`/location-types?group=${encodeURIComponent(groupName)}`);
        
        return mockLocationTypes.filter(t => t.group === groupName);
    },
    addLocationType: async (typeData) => {
        // Später: Zukünftiger echter API-Aufruf ins Backend
        // return await fetchApi('/location-types', { method: 'POST', body: JSON.stringify(typeData) });
        mockLocationTypes.push(typeData);
        return { success: true };
    },
    searchAddresses: async (query) => {
        // Später: Zukünftiger echter API-Aufruf ins Backend
        // return await fetchApi(`/addresses/search?q=${encodeURIComponent(query)}`);
        
        // Temporärer Mock für lokale JSON-Umgebung, bis das Backend die Route bereitstellt
        try {
            const response = await fetch('./testing/locations/locations.json?t=' + Date.now());
            if (!response.ok) return [];
            const data = await response.json();
            
            const results = [];
            const q = query.toLowerCase();
            (data || []).forEach(loc => {
                if (loc.address && loc.address.street) {
                    const addrStr = `${loc.address.street} ${loc.address.number || ''}, ${loc.address.zip || ''} ${loc.address.city || ''}`.trim();
                    if (addrStr.toLowerCase().includes(q) && !results.find(a => a.str === addrStr)) {
                        results.push({ str: addrStr, obj: loc.address });
                    }
                }
            });
            return results;
        } catch (error) {
            console.error("Fehler beim Mock der Adress-Suche:", error);
            return [];
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
        // Später: return await fetchApi('/locations', { method: 'POST', body: JSON.stringify(locationData) });
        return { success: true, id: 'backend-loc-' + Date.now() };
    },
    updateLocation: async (id, locationData) => {
        return { success: true }; // return await fetchApi(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(locationData) });
    },
    deleteLocation: async (id) => {
        return { success: true }; // return await fetchApi(`/locations/${id}`, { method: 'DELETE' });
    }
};