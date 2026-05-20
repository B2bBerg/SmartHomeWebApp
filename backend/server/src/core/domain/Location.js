import { ValidationError } from '../errors/ValidationError.js';

/**
 * core/domain/Location.js
 *
 * Repräsentiert eine Location (Gebäude, Stockwerk, Raum) im Application Core.
 * Kapselt die Daten und die dazugehörigen Geschäftsregeln.
 */
export class Location {
    constructor({ id, name, type, parentId = null, locationTypeId, address = null, metadata = null, floors = [], rooms = [] }) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.parentId = parentId;
        this.locationTypeId = locationTypeId;
        this.address = address;
        this.metadata = metadata;
        this.floors = floors;
        this.rooms = rooms;
    }

    validate() {
        if (!this.name || this.name.trim() === '') {
            throw new ValidationError("Der Name eines Standorts darf nicht leer sein.");
        }
        if (this.type) {
            if (this.type === 'building' && this.parentId) {
                throw new ValidationError("Ein Gebäude darf keinem anderen Standort untergeordnet sein.");
            }
            if (['floor', 'appartment', 'room'].includes(this.type) && !this.parentId) {
                throw new ValidationError(`Ein Standort vom Typ '${this.type}' benötigt zwingend ein übergeordnetes Element.`);
            }
        }
    }
}