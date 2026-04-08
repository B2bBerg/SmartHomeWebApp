/**
 * overview.js – Startet das extrahierte Dashboard Kachel-System (Module)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initiiert das aus overview extrahierte Kachel-System
    if (typeof TileManager !== 'undefined') {
        window.GridManager = TileManager; // Alias zur Sicherheit falls noch irgendwo aufgerufen
        TileManager.init();
    }
});
