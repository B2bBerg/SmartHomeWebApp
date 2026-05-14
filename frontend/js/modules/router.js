/**
 * router.js – Zentrales History & Navigations-Modul (SPA Router)
 */
const Router = {
    currentModule: null,

    init() {
        // Globaler Listener für die Vor-/Zurück-Tasten im Browser
        window.addEventListener('popstate', (e) => {
            this.handleRoute(window.location.hash, e.state);
        });

        // Initialer Aufruf direkt beim Start
        this.handleRoute(window.location.hash, history.state);
    },

    navigate(path, state = {}, replace = false) {
        if (replace) {
            history.replaceState(state, '', path);
        } else {
            history.pushState(state, '', path);
        }
        this.handleRoute(path, state);
    },

    handleRoute(hash, state) {
        const pathParts = (hash || '#dashboard').replace('#', '').split('/');
        const module = pathParts[0] || 'dashboard';

        // Nur re-rendern, wenn wir tatsächlich das Basis-Modul wechseln (z.B. Devices -> Locations)
        if (this.currentModule !== module) {
            this.currentModule = module;

            // Basis-Ansicht neu rendern und Active-States setzen (Ausgelagert in main.js)
            if (typeof window.renderView === 'function') {
                window.renderView(module);
            }
        }

        // Modul-spezifisches Routing für "Deep-Linking" ausführen
        if (module === 'locations' && window.LocationsManager) {
            window.LocationsManager.loadView(pathParts, state);
        }
    }
};

window.Router = Router;