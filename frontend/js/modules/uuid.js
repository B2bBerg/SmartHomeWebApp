/**
 * uuid.js - Hilfsfunktion zur Generierung einer UUID (v4)
 */
function generateUUID() {
    // Nutze die native Web Crypto API, wenn verfügbar (moderne Browser)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback für ältere Browser
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Explizit global verfügbar machen, damit alle anderen Skripte darauf zugreifen können
window.generateUUID = generateUUID;