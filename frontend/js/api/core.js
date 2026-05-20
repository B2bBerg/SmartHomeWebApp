/**
 * core.js - Zentrale Konfiguration und Fetch-Wrapper
 */
export const BASE_URL = 'http://localhost:3001/api'; // Verweist direkt auf das Backend (Port 3001)

export async function fetchApi(endpoint, options = {}) {
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
            try {
                const errorBody = await response.json();
                errorMessage = errorBody.error || errorBody.message || errorMessage;
            } catch (e) {
                // Ignorieren, falls der Body kein JSON ist
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        console.error(`[API Call Failed] ${endpoint}:`, error.message);
        throw error; // Fehler an die UI-Logik weitergeben
    }
}