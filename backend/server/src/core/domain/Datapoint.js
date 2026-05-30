import { ValidationError } from '../errors/ValidationError.js';

export class Datapoint {
    constructor(data) {
        this.id = data.id || null;
        this.name = data.name;
        this.deviceChannelId = data.deviceChannelId || null;
        this.deviceId = data.deviceId || null; // Helper für Auto-Linking
        this.channel = data.channel || null;   // Helper für Auto-Linking
        this.datapointTypeId = data.datapointTypeId;
        this.unitTypeId = data.unitTypeId;
        this.isActuator = !!data.isActuator;
        this.isSensor = !!data.isSensor;
        this.obisCode = data.obisCode || null;
        this.scaler = data.scaler !== undefined ? data.scaler : 1.0;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
    }

    validate() {
        if (!this.name) throw new ValidationError("Name ist erforderlich.");
        if (!this.datapointTypeId) throw new ValidationError("Datenpunkttyp ist erforderlich.");
        if (!this.unitTypeId) throw new ValidationError("Einheit ist erforderlich.");
        if (!this.deviceChannelId && !(this.deviceId && this.channel)) throw new ValidationError("Geräte-Kanal-Zuweisung fehlt.");
    }
}