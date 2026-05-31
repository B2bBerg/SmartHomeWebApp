import { fetchApi } from './core.js';

export const DatapointsAPI = {
    // --- 1. DATENPUNKTE (Sensoren & Aktoren) ---
    getDatapoints: async (type = null) => {
        const query = type ? `?type=${encodeURIComponent(type)}` : '';
        return await fetchApi(`/datapoints${query}`);
    },

    // Komfort-Wrapper für die gefilterten Backend-Abfragen
    getSensors: async () => DatapointsAPI.getDatapoints('sensor'),
    getActuators: async () => DatapointsAPI.getDatapoints('actuator'),

    addDatapoint: async (dpData) => fetchApi('/datapoints', { method: 'POST', body: JSON.stringify(dpData) }),
    updateDatapoint: async (id, dpData) => fetchApi(`/datapoints/${id}`, { method: 'PUT', body: JSON.stringify(dpData) }),
    deleteDatapoint: async (id) => fetchApi(`/datapoints/${id}`, { method: 'DELETE' }),

    // --- 2. HILFSTABELLEN (Dictionaries) ---
    getDatapointTypes: async () => fetchApi('/datapoints/types'),
    getUnitTypes: async () => fetchApi('/datapoints/units'),

    // --- 3. LIVEDATEN & STEUERUNG (State & History) ---
    getSensorData: async (id) => {
        try {
            // 1. Versuche echte Daten vom Backend zu laden
            const data = await fetchApi(`/datapoints/${id}/history`);
            if (data && data.length > 0) return data;
            throw new Error("Keine Historie vom Backend");
        } catch (error) {
            // 2. Fallback: Generiere realistische Mock-Datenreihen für Diagramme
            console.warn(`[Mock] Generiere historische Daten für Datenpunkt: ${id}`);
            return await generateMockHistory(id);
        }
    },
    setActuatorState: async (id, state) => fetchApi(`/datapoints/${id}/state`, { method: 'PUT', body: JSON.stringify({ state }) })
};

/**
 * Hilfsfunktion: Generiert realistische Zeitreihen-Mockdaten für die Graphen,
 * basierend auf den Datenpunkt-Typen aus der datapoints.sql
 */
async function generateMockHistory(dpId) {
    let typeName = '';
    try {
        // Metadaten abrufen, um den genauen Sensortyp zu bestimmen
        const allDps = await fetchApi('/datapoints');
        const dp = allDps.find(d => d.id === dpId);
        typeName = dp ? (dp.type || dp.name || '') : '';
    } catch (e) {}

    const history = [];
    const now = new Date();
    const daysToGenerate = 7;
    const dataPointsPerDay = 24; // Stündliche Werte für den Graph
    
    let baseValue = 21, variance = 3, isBoolean = false, isCumulative = false;
    const typeLower = typeName.toLowerCase();

    // Verhalten je nach Sensortyp anpassen (passend zu den Inserts aus datapoints.sql)
    if (typeLower.includes('leistung')) {
        baseValue = 350; variance = 150; // Schwankende Wattzahl (Shelly EM)
    } else if (typeLower.includes('energie')) {
        baseValue = 10000; variance = 2.5; isCumulative = true; // kWh Zähler (stetig steigend)
    } else if (typeLower.includes('wasser') || typeLower.includes('durchfluss')) {
        baseValue = 0; variance = 20; // Liter pro Stunde (oft 0, temporär Spitzen)
    } else if (typeLower.includes('schalter')) {
        isBoolean = true; // Status (An/Aus)
    }

    let currentValue = baseValue;

    // Generiere 7 Tage Rückwirkend
    for (let i = daysToGenerate * dataPointsPerDay; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
        
        if (isBoolean) {
            // Zufälliger Boolean Status
            history.push({ timestamp, value: Math.random() > 0.8 });
        } else if (isCumulative) {
            // Zählerstand muss immer steigen
            currentValue += Math.random() * variance;
            history.push({ timestamp, value: parseFloat(currentValue.toFixed(2)) });
        } else {
            // Schwankende Sensoren (Temperatur, Leistung)
            let val = currentValue + (Math.random() * variance * 2) - variance;
            
            // Plausibilität: Weder Wasser noch Stromleistung kann negativ sein
            if (val < 0 && !typeLower.includes('temperatur')) val = 0; 
            
            // Wasserzähler hat die meiste Zeit keinen Durchfluss (Nulllinie)
            if (typeLower.includes('wasser') && Math.random() > 0.3) val = 0; 
            
            history.push({ timestamp, value: parseFloat(val.toFixed(2)) });
            currentValue = val;
            // Regression zum Mittelwert, damit der Random Walk nicht entgleist
            currentValue += (baseValue - currentValue) * 0.2; 
        }
    }
    return history;
}