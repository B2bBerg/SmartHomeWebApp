/**
 * ports/in/ILocationService.js
 *
 * Definiert den Vertrag, den der LocationService für "eingehende" Anfragen
 * (z.B. von einem Web-Controller) erfüllen muss.
 */
export class ILocationService {
    async getLocations() { throw new Error("Method not implemented"); }
}