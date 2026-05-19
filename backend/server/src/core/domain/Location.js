import { ValidationError } from '../errors/ValidationError.js';

/**
 * core/domain/Location.js
 *
 * Repräsentiert eine Location (Gebäude, Stockwerk, Raum) im Application Core.
 * Kapselt die Daten und die dazugehörigen Geschäftsregeln.
 */
export class Location {
    constructor({ id, name, parentId = null, locationTypeId, address = null, floors = [], rooms = [] }) {
        this.id = id;
        this.name = name;
        this.parentId = parentId;
        this.locationTypeId = locationTypeId;
        this.address = address;
        this.floors = floors;
        this.rooms = rooms;
    }

    validate() {
        if (!this.name || this.name.trim() === '') {
            throw new ValidationError("Der Name eines Standorts darf nicht leer sein.");
        }
    }
}