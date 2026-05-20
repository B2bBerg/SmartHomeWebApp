import { IDeviceRepository } from '../../../ports/out/IDeviceRepository.js';

export class PostgresDeviceAdapter extends IDeviceRepository {
    constructor(pool) {
        super();
        this.pool = pool;
    }

    async getDevices(busType) {
        // This query joins the necessary tables to get the flat structure the frontend expects.
        let baseQuery = `
            SELECT 
                d.device_id as id,
                d.device_name as name,
                mt.model_name as "modelName",
                m.manufacturer_name as "manufacturerName",
                d.serial_number,
                bt.bus_name as "busTypeName",
                l.location_name as "locationName",
                d.mac_address,
                d.bus_address,
                d.battery_level,
                d.signal_level,
                d.status,
                (
                    SELECT COALESCE(json_agg(DISTINCT dc.channel_number ORDER BY dc.channel_number), '[]'::json)
                    FROM device_channel dc
                    WHERE dc.device_id = d.device_id
                ) as channels,
                (
                    SELECT COALESCE(json_agg(DISTINCT dc.channel_number ORDER BY dc.channel_number), '[]'::json)
                    FROM datapoint dp
                    JOIN device_channel dc ON dp.device_channel_id = dc.device_channel_id
                    WHERE dc.device_id = d.device_id AND dp.is_active = true
                ) as "usedChannels",
                d.model_type_id,
                d.bus_type_id,
                d.location_id
            FROM devices d
            JOIN model_type mt ON d.model_type_id = mt.model_type_id
            JOIN manufacturer m ON mt.manufacturer_id = m.manufacturer_id
            JOIN bus_type bt ON d.bus_type_id = bt.bus_type_id
            JOIN location l ON d.location_id = l.location_id
            WHERE d.is_active = true
        `;
        
        const params = [];
        if (busType) {
            baseQuery += ' AND bt.bus_name = $1';
            params.push(busType);
        }
        
        const result = await this.pool.query(baseQuery, params);
        return result.rows;
    }

    async getBusTypes() {
        const result = await this.pool.query('SELECT bus_name FROM bus_type ORDER BY bus_name');
        // The frontend API expects an array of strings.
        return result.rows.map(row => row.bus_name);
    }

    async getModelTypes() {
        const result = await this.pool.query(`
            SELECT 
                mt.model_type_id as id, 
                mt.model_name as name, 
                m.manufacturer_name as manufacturer 
            FROM model_type mt 
            JOIN manufacturer m ON mt.manufacturer_id = m.manufacturer_id 
            ORDER BY m.manufacturer_name, mt.model_name
        `);
        return result.rows;
    }

    async addDevice(deviceData) {
        const res = await this.pool.query(
            `INSERT INTO devices (device_name, model_type_id, serial_number, bus_type_id, location_id, mac_address, bus_address, status, metadata) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING device_id as id`,
            [
                deviceData.device_name, 
                deviceData.model_type_id, 
                deviceData.serial_number, 
                deviceData.bus_type_id, 
                deviceData.location_id, 
                deviceData.mac_address, 
                deviceData.bus_address, 
                deviceData.status, 
                deviceData.metadata
            ]
        );
        return { success: true, id: res.rows[0].id };
    }

    async updateDevice(id, deviceData) {
        const result = await this.pool.query(
            `UPDATE devices SET 
                device_name = $1, 
                model_type_id = $2, 
                location_id = $3, 
                mac_address = $4, 
                bus_address = $5, 
                status = $6, 
                metadata = $7,
                updated_at = NOW() 
             WHERE device_id = $8 AND is_active = true`,
            [
                deviceData.device_name, 
                deviceData.model_type_id, 
                deviceData.location_id, 
                deviceData.mac_address, 
                deviceData.bus_address, 
                deviceData.status, 
                deviceData.metadata, 
                id
            ]
        );
        if (result.rowCount === 0) throw { status: 404, message: "Device not found" };
        return { success: true };
    }

    async deactivateDevice(id) {
        const result = await this.pool.query(
            'UPDATE devices SET is_active = false, deactivated_at = NOW() WHERE device_id = $1 AND is_active = true', 
            [id]
        );
        if (result.rowCount === 0) throw { status: 404, message: "Device not found" };
        return { success: true };
    }
}