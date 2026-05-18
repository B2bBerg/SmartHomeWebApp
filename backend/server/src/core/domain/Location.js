/**
 * core/domain/Location.js
 *
 * Repräsentiert eine Location (Gebäude, Stockwerk, Raum) im Application Core.
 * Dies ist ein reines Datenobjekt ohne Logik (Plain Old JavaScript Object).
 */
export class Location {
    constructor(id, name, floors = []) {
        this.id = id;
        this.name = name;
        this.floors = floors;
    }
}