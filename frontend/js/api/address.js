import { fetchApi } from './core.js';

// Helper für Mock-UUIDs passend zur DB-Syntax (uuidv7)
const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-' + Date.now();

export const AddressAPI = {
    getAddresses: async () => {
        return await fetchApi('/addresses');
    },

    getAddressById: async (id) => {
        return await fetchApi(`/addresses/${id}`);
    },

    searchAddresses: async (query) => {
        return await fetchApi(`/addresses/search?q=${encodeURIComponent(query)}`);
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
            // Externe API
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
        return await fetchApi('/addresses', { method: 'POST', body: JSON.stringify(addressData) });
    },

    updateAddress: async (id, addressData) => {
        return await fetchApi(`/addresses/${id}`, { method: 'PUT', body: JSON.stringify(addressData) });
    },

    deleteAddress: async (id) => {
        return await fetchApi(`/addresses/${id}`, { method: 'DELETE' });
    }
};