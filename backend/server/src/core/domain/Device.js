import { ValidationError } from '../errors/ValidationError.js';

export class Device {
    constructor({ id = null, device_name, model_type_id, serial_number, bus_type_id, location_id, mac_address = null, bus_address = null, battery_level = null, signal_level = null, status = null, metadata = null }) {
        this.id = id;
        this.device_name = device_name;
        this.model_type_id = model_type_id;
        this.serial_number = serial_number;
        this.bus_type_id = bus_type_id;
        this.location_id = location_id;
        this.mac_address = mac_address;
        this.bus_address = bus_address;
        this.battery_level = battery_level;
        this.signal_level = signal_level;
        this.status = status;
        this.metadata = metadata;
    }

    validate() {
        if (!this.device_name || this.device_name.trim() === '') {
            throw new ValidationError("'device_name' ist ein Pflichtfeld.");
        }
        if (!this.model_type_id) {
            throw new ValidationError("'model_type_id' ist ein Pflichtfeld.");
        }
        if (!this.bus_type_id) {
            throw new ValidationError("'bus_type_id' ist ein Pflichtfeld.");
        }
        if (!this.serial_number || this.serial_number.trim() === '') {
            throw new ValidationError("'serial_number' ist ein Pflichtfeld.");
        }
        if (!this.location_id) {
            throw new ValidationError("'location_id' ist ein Pflichtfeld.");
        }
    }
}