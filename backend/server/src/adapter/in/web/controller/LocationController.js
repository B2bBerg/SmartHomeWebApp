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

    async batchUpdateLocations(req, res) {
        try {
            const result = await this.locationService.saveLocationsBatch(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: "Fehler beim Batch-Update", error: error.message });
        }
    }

    async getLocationTypes(req, res) {
        try {
            const types = await this.locationService.getLocationTypes(req.query.group);
            res.json(types);
        } catch (error) {
            res.status(500).json({ message: "Fehler beim Abrufen der Location Types", error: error.message });
        }
    }

    async addLocationType(req, res) {
        try {
            const result = await this.locationService.addLocationType(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ message: "Fehler beim Erstellen des Location Types", error: error.message });
        }
    }

    async addLocation(req, res) {
        try {
            const result = await this.locationService.addLocation(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ message: "Fehler beim Erstellen der Location", error: error.message });
        }
    }

    async updateLocation(req, res) {
        try {
            const result = await this.locationService.updateLocation(req.params.id, req.body);
            res.json(result);
        } catch (error) {
            const status = error.status || 500;
            res.status(status).json({ message: "Fehler beim Aktualisieren", error: error.message });
        }
    }

    async deleteLocation(req, res) {
        try {
            const result = await this.locationService.deleteLocation(req.params.id);
            res.json(result);
        } catch (error) {
            const status = error.status || 500;
            res.status(status).json({ message: "Fehler beim Löschen", error: error.message });
        }
    }
}