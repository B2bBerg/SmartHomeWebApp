import { fetchApi } from './core.js';

// Helper für Mock-UUIDs passend zur DB-Syntax (uuidv7)
const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

export const AddressAPI = {
    getAddresses: async () => {
        try {
            return await fetchApi('/addresses');
        } catch (error) {
            console.warn("Backend-API '/addresses' nicht erreichbar. Nutze Fallback.", error);
            return [];
        }
    },

    getAddressById: async (id) => {
        try {
            return await fetchApi(`/addresses/${id}`);
        } catch (error) {
            console.warn(`Backend-API '/addresses/${id}' nicht erreichbar. Nutze Fallback.`, error);
            return null;
        }
    },

    searchAddresses: async (query) => {
        try {
            return await fetchApi(`/addresses/search?q=${encodeURIComponent(query)}`);
        } catch (error) {
            console.warn("Backend-API '/addresses/search' nicht erreichbar. Nutze lokalen Fallback.");
            try {
                // Fallback: Liest die Adressen aus der statischen JSON Mock-Datei
                const response = await fetch('./testing/locations/locations.json?t=' + Date.now());
                if (!response.ok) return [];
                const data = await response.json();
                
                const results = [];
                const queryTerms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
                
                (data || []).forEach(loc => {
                    if (loc.address && loc.address.street) {
                        // Concatenated String für Omni-Search
                        const addrStr = `${loc.address.street} ${loc.address.street_number || ''} ${loc.address.zip_code || ''} ${loc.address.city || ''}`.trim();
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
            // Externe API (braucht kein Spring Boot Backend)
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

    addAddress: async (addressData) => {
        try {
            return await fetchApi('/addresses', { method: 'POST', body: JSON.stringify(addressData) });
        } catch (error) {
            console.warn("Backend-API POST '/addresses' nicht erreichbar. Nutze Fallback.");
            return { success: true, id: generateUUID() };
        }
    },

    updateAddress: async (id, addressData) => {
        try {
            return await fetchApi(`/addresses/${id}`, { method: 'PUT', body: JSON.stringify(addressData) });
        } catch (error) {
            console.warn(`Backend-API PUT '/addresses/${id}' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    },

    deleteAddress: async (id) => {
        try {
            return await fetchApi(`/addresses/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.warn(`Backend-API DELETE '/addresses/${id}' nicht erreichbar. Nutze Fallback.`);
            return { success: true };
        }
    }
};