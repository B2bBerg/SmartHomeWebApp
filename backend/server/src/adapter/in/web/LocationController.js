/**
 * adapters/in/web/LocationController.js
 *
 * Nimmt HTTP-Anfragen entgegen und ruft die entsprechende Methode im Service auf.
 * Übersetzt zwischen der "Web-Welt" (req, res) und der "Core-Welt".
 */
export class LocationController {
    constructor(locationService) {
        this.locationService = locationService;
    }

    async getAllLocations(req, res) {
        try {
            const locations = await this.locationService.getLocations();
            res.json(locations);
        } catch (error) {
            res.status(500).json({ message: "Fehler beim Abrufen der Locations", error: error.message });
        }
    }
}