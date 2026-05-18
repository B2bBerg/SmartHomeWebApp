import { ILocationRepository } from '../../../ports/out/ILocationRepository.js';

/**
 * adapters/out/db/InMemoryLocationAdapter.js
 *
 * Implementiert den ILocationRepository Port.
 * Simuliert eine Datenbank, indem es Daten im Arbeitsspeicher hält.
 * Ideal für schnelle Entwicklung und Tests.
 */
export class InMemoryLocationAdapter extends ILocationRepository {
    constructor() {
        super();
        // Wir verwenden hier die Beispieldaten aus deinem FHNW-Projekt-README
        this.locations = [
            {
              "id": "599e8210-90fb-400a-b152-7b00a5d4d39f",
              "timestamp": "2026-04-12T10:56:15Z",
              "name": "Haupthaus",
              "address": { "street": "Musterstrasse", "number": "12", "zip": "5000", "city": "Aarau", "country": "Schweiz" },
              "floors": [
                {
                  "id": "a84a6fb7-b50a-4a25-83c7-1237a6b4deaf", "timestamp": "2026-04-12T10:56:15Z", "name": "Erdgeschoss",
                  "rooms": [
                    { "id": "1c28b34f-01a2-4db1-93af-f61b0c034b22", "timestamp": "2026-04-12T10:56:15Z", "name": "Living Room" },
                    { "id": "e10a2f42-c361-4870-8797-17edb8648ab0", "timestamp": "2026-04-12T10:56:15Z", "name": "Küche" }
                  ]
                },
                {
                  "id": "4bbff503-49d7-4003-9d0b-044199c15ff8", "timestamp": "2026-04-12T10:56:15Z", "name": "Obergeschoss",
                  "rooms": [
                    { "id": "c6a1b24e-b839-4458-9a8c-28957827db1b", "timestamp": "2026-04-12T10:56:15Z", "name": "Badezimmer" }
                  ]
                }
              ]
            },
            {
              "id": "193ea0eb-9b7e-4b68-8098-b80540d6c4d8", "timestamp": "2026-04-12T10:56:15Z", "name": "Garage",
              "floors": [
                {
                  "id": "7bcde908-1fbc-4fa8-b118-cb1dbb149b07", "timestamp": "2026-04-12T10:56:15Z", "name": "Erdgeschoss",
                  "rooms": [
                    { "id": "b625cf8c-846c-48c9-952a-9e450b55ecaf", "timestamp": "2026-04-12T10:56:15Z", "name": "Main Garage" }
                  ]
                }
              ]
            }
        ];
    }

    async getLocations() {
        console.log("InMemoryAdapter: Lade Locations aus dem Speicher.");
        return this.locations;
    }
}