/**
 * api.js - Zentrale Verwaltung aller Backend-Aufrufe
 * Aggregiert alle Sub-Module aus /api/ und stellt sie als globales window.API bereit.
 */
import { DevicesAPI } from './api/devices.js';
import { SensorsAPI } from './api/sensors.js';
import { ActuatorsAPI } from './api/actuators.js';
import { LocationsAPI } from './api/locations.js';
import { RulesAPI } from './api/rules.js';
import { SystemAPI } from './api/system.js';

const API = {
    ...DevicesAPI,
    ...SensorsAPI,
    ...ActuatorsAPI,
    ...LocationsAPI,
    ...RulesAPI,
    ...SystemAPI,

    // Spezifische Logik, die Module kombiniert:
    getLiveData: async () => {
        try {
            const [sensors, actuators] = await Promise.all([
                API.getSensors(),
                API.getActuators()
            ]);
            
            const liveData = {};
            if (sensors) sensors.forEach(s => liveData[s.id] = s.value);
            if (actuators) actuators.forEach(a => liveData[a.id] = a.value !== undefined ? a.value : a.state);
            
            return liveData;
        } catch (error) {
            console.error('Fehler beim Generieren der Live-Daten:', error);
            return {};
        }
    }
};

window.API = API;