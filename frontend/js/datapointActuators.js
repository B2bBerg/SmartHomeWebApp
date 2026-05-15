/**
 * actuators.js – Spezifische Logik für Aktoren (Datenpunkte)
 */
const ActuatorManager = new window.DatapointManager({
    mode: 'actuator',
    containerId: 'actuator-table-container',
    title: 'Aktor'
});
window.ActuatorManager = ActuatorManager;