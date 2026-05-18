/**
 * core/errors/ValidationError.js
 *
 * Eigene Fehlerklasse für Validierungsfehler aus der Domänenschicht.
 */
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.status = 400; // HTTP 400 Bad Request
    }
}