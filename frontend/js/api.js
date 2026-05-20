/**
 * api.js - Zentrale Verwaltung aller Backend-Aufrufe
 * Aggregiert alle Sub-Module aus /api/ und stellt sie als globales window.API bereit.
 */
import { DevicesAPI } from './api/devices.js';
import { DatapointsAPI } from './api/datapoints.js';
import { LocationsAPI } from './api/locations.js';
import { RulesAPI } from './api/rules.js';
import { SystemAPI } from './api/system.js';
import { AddressAPI } from './api/address.js';
import { DashboardAPI } from './api/dashboard.js';

const API = {
    ...DevicesAPI,
    ...DatapointsAPI,
    ...AddressAPI,
    ...LocationsAPI,
    ...RulesAPI,
    ...SystemAPI,
    ...DashboardAPI,

    // Spezifische Logik, die Module kombiniert:
    getLiveData: async () => {
        try {
            const datapoints = await API.getDatapoints();
            
            const liveData = {};
            if (datapoints) datapoints.forEach(dp => liveData[dp.id] = dp.value !== undefined ? dp.value : dp.state);
            
            return liveData;
        } catch (error) {
            console.error('Fehler beim Generieren der Live-Daten:', error);
            return {};
        }
    }
};

window.API = API;