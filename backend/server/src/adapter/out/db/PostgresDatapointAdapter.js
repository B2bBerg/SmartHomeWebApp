import { IDatapointRepository } from '../../../ports/out/IDatapointRepository.js';

export class PostgresDatapointAdapter extends IDatapointRepository {
    constructor(pool) {
        super();
        this.pool = pool;
    }

    async findAllDatapoints(type = null) {
        let query = `
            SELECT 
                dp.datapoint_id as id,
                dp.datapoint_name as name,
                dp.device_channel_id as "deviceChannelId",
                dp.datapoint_type_id as "datapointTypeId",
                dp.unit_type_id as "unitTypeId",
                dp.is_actuator as "isActuator",
                dp.is_sensor as "isSensor",
                dp.is_active as "isActive",
                dp.updated_at as "updatedAt",
                dc.channel_number as channel,
                dev.device_id as "deviceId",
                dev.device_name as "deviceName",
                loc.location_name as location,
                loc.location_id as "locationId",
                dt.datapoint_type as type,
                ut.unit_type as unit
            FROM datapoint dp
            LEFT JOIN device_channel dc ON dp.device_channel_id = dc.device_channel_id
            LEFT JOIN devices dev ON dc.device_id = dev.device_id
            LEFT JOIN location loc ON dev.location_id = loc.location_id
            LEFT JOIN datapoint_type dt ON dp.datapoint_type_id = dt.datapoint_type_id
            LEFT JOIN unit_type ut ON dp.unit_type_id = ut.unit_type_id
            WHERE dp.is_active = true
        `;
        
        if (type === 'sensor') {
            query += ` AND dp.is_sensor = true`;
        } else if (type === 'actuator') {
            query += ` AND dp.is_actuator = true`;
        }
        
        query += ` ORDER BY dp.datapoint_name ASC`;
        
        const result = await this.pool.query(query);
        return result.rows;
    }

    async saveDatapoint(dp) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            let channelId = dp.deviceChannelId;
            
            // Auto-Link: DeviceChannel-Referenz aus deviceId und Portnummer ermitteln
            if (!channelId && dp.deviceId && dp.channel) {
                const chRes = await client.query(
                    'SELECT device_channel_id FROM device_channel WHERE device_id = $1 AND channel_number = $2',
                    [dp.deviceId, parseInt(dp.channel, 10)]
                );
                if (chRes.rowCount > 0) {
                    channelId = chRes.rows[0].device_channel_id;
                } else {
                    const newCh = await client.query(
                        'INSERT INTO device_channel (device_id, channel_id, channel_number) VALUES ($1, (SELECT channel_id FROM channel_type LIMIT 1), $2) RETURNING device_channel_id',
                        [dp.deviceId, parseInt(dp.channel, 10)]
                    );
                    channelId = newCh.rows[0].device_channel_id;
                }
            }

            let newId = dp.id;
            if (!newId) {
                const res = await client.query(
                    `INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING datapoint_id`,
                    [dp.name, channelId, dp.datapointTypeId, dp.unitTypeId, dp.isActuator, dp.isSensor]
                );
                newId = res.rows[0].datapoint_id;
            } else {
                await client.query(
                    `UPDATE datapoint SET datapoint_name = $1, device_channel_id = $2, datapoint_type_id = $3, 
                     unit_type_id = $4, is_actuator = $5, is_sensor = $6, updated_at = now() 
                     WHERE datapoint_id = $7`,
                    [dp.name, channelId, dp.datapointTypeId, dp.unitTypeId, dp.isActuator, dp.isSensor, newId]
                );
            }

            await client.query('COMMIT');
            return { ...dp, id: newId }; // Hier könnte man optional nochmal den Datensatz mit allen JOINs abfragen
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async deactivateDatapoint(id) {
        await this.pool.query('UPDATE datapoint SET deactivated_at = now(), is_active = false WHERE datapoint_id = $1', [id]);
    }

    async findAllDatapointTypes() { return (await this.pool.query('SELECT datapoint_type_id as id, datapoint_type as name FROM datapoint_type ORDER BY datapoint_type')).rows; }
    async findAllUnitTypes() { return (await this.pool.query('SELECT unit_type_id as id, unit_type as name FROM unit_type ORDER BY unit_type')).rows; }
}