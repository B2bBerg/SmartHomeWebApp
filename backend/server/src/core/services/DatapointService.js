import { IDatapointService } from '../../ports/in/IDatapointService.js';
import { Datapoint } from '../domain/Datapoint.js';

export class DatapointService extends IDatapointService {
    constructor(datapointRepository) {
        super();
        this.datapointRepository = datapointRepository;
    }

    async getDatapoints(type) {
        return await this.datapointRepository.findAllDatapoints(type);
    }

    async addDatapoint(datapointData) {
        const dp = new Datapoint(datapointData);
        dp.validate();
        return await this.datapointRepository.saveDatapoint(dp);
    }

    async updateDatapoint(id, datapointData) {
        const dp = new Datapoint({ ...datapointData, id });
        dp.validate();
        return await this.datapointRepository.saveDatapoint(dp);
    }

    async deleteDatapoint(id) {
        await this.datapointRepository.deactivateDatapoint(id);
    }

    async getDatapointTypes() { return await this.datapointRepository.findAllDatapointTypes(); }
    
    async getUnitTypes() { return await this.datapointRepository.findAllUnitTypes(); }

    async getDatapointHistory(id) {
        // Generiere realistische Dummy-Zeitreihendaten (letzte 24 Stunden, stündlich)
        const history = [];
        const now = new Date();
        let baseTemp = 20.0;
        let basePower = 100;
        let baseHumidity = 45;

        for (let i = 24; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
            
            // Leichte zufällige Schwankungen
            baseTemp += (Math.random() - 0.5) * 1.5;
            basePower += (Math.random() - 0.5) * 15;
            baseHumidity += (Math.random() - 0.5) * 4;

            history.push({
                value: parseFloat(baseTemp.toFixed(1)),
                temperature: parseFloat(baseTemp.toFixed(1)),
                power: Math.round(Math.max(0, basePower)), // Keine negative Energie
                humidity: Math.round(Math.max(0, Math.min(100, baseHumidity))), // 0-100%
                timestamp: timestamp.toISOString()
            });
        }
        return history;
    }

    async setDatapointState(id, stateData) {
        // Dummy-Erfolg für Schalter-Kacheln
        return { success: true, id, state: stateData.state };
    }
}