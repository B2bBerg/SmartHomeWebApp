import { ValidationError } from '../errors/ValidationError.js';
/**
 * core/domain/Address.js
 * 
 * Das Domänenmodell für eine Adresse.
 * Kapselt die Eigenschaften und Geschäftsregeln (Validierung) einer Adresse.
 */
export class Address {
    constructor({ id = null, street, street_number, city, state, zip_code, country }) {
        this.id = id;
        this.street = street;
        this.street_number = street_number;
        this.city = city;
        this.state = state;
        this.zip_code = zip_code;
        this.country = country;
    }

    /**
     * Validiert die Adressdaten anhand der definierten Geschäftsregeln.
     * Wird typischerweise vom Service aufgerufen, bevor Daten an das Repository (Adapter) gehen.
     * 
     * @throws {Error} Wenn essentielle Geschäftsregeln verletzt werden.
     */
    validate() {
        if (!this.street || this.street.trim() === '') {
            throw new ValidationError("'street' (Strasse) ist ein Pflichtfeld.");
        }
        if (!this.zip_code || this.zip_code.trim() === '') {
            throw new ValidationError("'zip_code' (PLZ) ist ein Pflichtfeld.");
        }
        if (!this.city || this.city.trim() === '') {
            throw new ValidationError("'city' (Stadt) ist ein Pflichtfeld.");
        }
    }

    /**
     * Gibt die Adresse als formatierten String zurück (Beispiel für Domänen-Logik).
     * @returns {string}
     */
    toFormattedString() {
        return `${this.street} ${this.street_number || ''}, ${this.zip_code || ''} ${this.city}, ${this.country || ''}`.trim();
    }
}