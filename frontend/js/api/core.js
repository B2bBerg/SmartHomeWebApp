/**
 * core.js - Zentrale Konfiguration und Fetch-Wrapper
 */
export const BASE_URL = '/api'; // Später anpassbar, z.B. 'http://192.168.1.100:8080/api'

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
            // Zentrales Error-Handling
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`[API Call Failed] ${endpoint}:`, error);
        throw error; // Fehler weitergeben, falls das UI (z.B. Graph) ihn noch braucht
    }
}