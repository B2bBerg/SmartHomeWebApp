/**
 * core.js - Zentrale Konfiguration und Fetch-Wrapper
 */
export const BASE_URL = 'http://localhost:3001/api'; // Verweist direkt auf das Backend (Port 3001)

export async function fetchApi(endpoint, options = {}) {
    const isGetRequest = !options.method || options.method.toUpperCase() === 'GET';
    const cacheKey = `smarthome_cache_${endpoint}`;

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            // Versuche, eine detaillierte Fehlermeldung aus dem JSON-Body zu extrahieren
            let errorMessage = `API Error: ${response.status} ${response.statusText}`;
            if (response.status === 501) errorMessage = `Nicht implementiert (501): ${endpoint}`;
            if (response.status === 404) errorMessage = `Endpunkt nicht gefunden (404): ${endpoint}`;
            
            try {
                const errorBody = await response.json();
                errorMessage = errorBody.error || errorBody.message || errorMessage;
            } catch (e) {
                // Ignorieren, falls der Body kein JSON ist
            }
            
            const error = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }

        if (response.status === 204) return null;
        
        const data = await response.json();
        
        // Erfolgreiche GET-Anfragen automatisch im lokalen Cache sichern
        if (isGetRequest) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data));
            } catch (e) { /* Quota-Limit ignorieren */ }
        }
        return data;

    } catch (error) {
        // Fallback auf den lokalen Cache bei Netzwerkfehlern oder Serverausfällen
        if (isGetRequest) {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                console.warn(`[API Cache] Offline/Fehler. Verwende letzte bekannte Daten für "${endpoint}":`, error.message);
                return JSON.parse(cachedData);
            }
        }

        console.error(`[API Call Failed] ${endpoint}:`, error.message);
        throw error; // Fehler an die UI-Logik weitergeben
    }
}