/**
 * ports/out/ILocationRepository.js
 *
 * Definiert den Vertrag, den ein "ausgehender" Adapter (z.B. ein Datenbank-Adapter)
 * erfüllen muss, damit der Core mit ihm arbeiten kann.
 */
export class ILocationRepository {
    async getLocations() { throw new Error("Method not implemented"); }
}