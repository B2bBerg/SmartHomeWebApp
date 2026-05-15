/**
 * sensors.js – Spezifische Logik für Sensoren (Datenpunkte)
 */
const SensorManager = new window.DatapointManager({
    mode: 'sensor',
    containerId: 'sensor-table-container',
    title: 'Sensor'
});
window.SensorManager = SensorManager;