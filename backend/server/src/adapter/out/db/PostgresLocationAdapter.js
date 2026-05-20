import { ILocationRepository } from '../../../ports/out/ILocationRepository.js';

/**
 * adapters/out/db/PostgresLocationAdapter.js
 *
 * Implementiert den ILocationRepository Port für eine PostgreSQL-Datenbank.
 */
export class PostgresLocationAdapter extends ILocationRepository {
    constructor(pool) {
        super();
        this.pool = pool;
        this.initDb();
    }

    // Erstellt die Tabellen, falls diese noch nicht existieren
    async initDb() {
        let client;
        try {
            client = await this.pool.connect();
            // Die Tabellen werden durch ein separates DB-Setup-Skript erstellt.
            console.log("PostgresLocationAdapter verbunden und bereit.");
        } catch (error) {
            console.error("Fehler bei der Adapter-Initialisierung:", error);
        } finally {
            if (client) client.release();
        }
    }

    async getLocations() {
        // Baut das verschachtelte JSON-Objekt exakt so auf, wie es das Frontend verlangt, 
        // unter Auslassung aller soft-gelöschten (deleted_at IS NOT NULL) Einträge.
        const query = `
            SELECT 
                l.location_id as id, l.location_name as name, l.created_at as timestamp, l.location_type_id as "locationTypeId", l.metadata as metadata,
                CASE WHEN a.address_id IS NOT NULL THEN
                    json_build_object(
                        'id', a.address_id,
                        'street', a.street, 'street_number', a.street_number, 
                        'zip_code', a.zip_code, 'city', a.city, 'country', a.country, 'state', a.state
                    )
                ELSE NULL END as address,
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'id', f.location_id,
                            'name', f.location_name,
                            'locationTypeId', f.location_type_id,
                            'timestamp', f.created_at,
                            'metadata', f.metadata,
                            'rooms', COALESCE(
                                (SELECT json_agg(
                                    json_build_object('id', r.location_id, 'name', r.location_name, 'locationTypeId', r.location_type_id, 'timestamp', r.created_at, 'metadata', r.metadata)
                                    ) FROM location r 
                                    JOIN location_type rt ON r.location_type_id = rt.location_type_id
                                    JOIN location_group rtg ON rt.location_group_id = rtg.location_group_id
                                    WHERE r.parent_location_id = f.location_id AND rtg.name = 'room' AND r.is_active = true),
                                '[]'::json
                            )
                        )
                        ) FROM location f 
                        JOIN location_type ft ON f.location_type_id = ft.location_type_id
                        JOIN location_group ftg ON ft.location_group_id = ftg.location_group_id
                        WHERE f.parent_location_id = l.location_id AND ftg.name IN ('floor', 'appartment') AND f.is_active = true),
                    '[]'::json
                ) as floors
            FROM location l
            LEFT JOIN location_type lt ON l.location_type_id = lt.location_type_id
            LEFT JOIN location_group lg ON lt.location_group_id = lg.location_group_id
            LEFT JOIN address a ON l.address_id = a.address_id
            WHERE lg.name = 'building' AND l.is_active = true
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async saveLocationsBatch(locationsData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const activeIds = [];
            
            // Hole die Standard-Typ-IDs für das Mapping der Hierarchien
            const typesRes = await client.query('SELECT lt.location_type_id as id, lg.name as "group" FROM location_type lt JOIN location_group lg ON lt.location_group_id = lg.location_group_id');
            const typeIds = {
                building: typesRes.rows.find(t => t.group === 'building')?.id || null,
                floor: typesRes.rows.find(t => t.group === 'floor')?.id || null,
                appartment: typesRes.rows.find(t => t.group === 'appartment')?.id || null,
                room: typesRes.rows.find(t => t.group === 'room')?.id || null
            };
            
            // 1. Rekursiver Upsert der aktiven Baumstruktur in einer einzigen Tabelle
            for (const loc of locationsData) {
                let addressId = null;
                if (loc.address) {
                    addressId = await this._upsertAddress(client, loc.address.id, loc.address);
                    loc.address.id = addressId; // Update der generierten ID im Payload
                }

            let locId = await this._upsertEntity(client, loc.id, null, loc.locationTypeId || typeIds.building, loc.metadata || null, 
                    [loc.name, addressId],
                    ['location_name', 'address_id']
                );
                loc.id = locId; // Aktualisieren für das Return-Objekt
                activeIds.push(locId);

                if (loc.floors) {
                    for (const floor of loc.floors) {
                    let typeFallback = floor.type === 'appartment' ? typeIds.appartment : typeIds.floor;
                    let floorId = await this._upsertEntity(client, floor.id, locId, floor.locationTypeId || typeFallback, floor.metadata || null, 
                            [floor.name],
                            ['location_name']
                        );
                        floor.id = floorId;
                        activeIds.push(floorId);

                        if (floor.rooms) {
                            for (const room of floor.rooms) {
                            let roomId = await this._upsertEntity(client, room.id, floorId, room.locationTypeId || typeIds.room, room.metadata || null,
                                    [room.name],
                                    ['location_name']
                                );
                                room.id = roomId;
                                activeIds.push(roomId);
                            }
                        }
                    }
                }
            }

            // 2. Soft-Delete für alle Elemente (Gebäude, Stockwerke, Räume), die nicht mehr übermittelt wurden
            if (activeIds.length > 0) {
                await client.query('UPDATE location SET is_active = false, deactivated_at = NOW() WHERE location_id != ALL($1::uuid[]) AND is_active = true', [activeIds]);
            } else {
                await client.query('UPDATE location SET is_active = false, deactivated_at = NOW() WHERE is_active = true');
            }

            await client.query('COMMIT');
            return { success: true, updatedData: locationsData };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Hilfsmethode: Verifiziert, ob eine ID wirklich existiert. Falls nicht (z.B. Frontend-Mock-ID), 
    // wird ein INSERT (mit DB-UUIDv7) ausgeführt, andernfalls ein UPDATE.
    async _upsertEntity(client, id, parentId, locationTypeId, metadata, values, columns) {
        let exists = false;
        if (id) {
            try {
                    const check = await client.query('SELECT location_id FROM location WHERE location_id = $1', [id]);
                exists = check.rowCount > 0;
            } catch (e) { exists = false; } // Z.B. falls die ID ein invalidier UUID String wie 'mock-uuid-1' ist
        }

        const allCols = ['parent_location_id', 'location_type_id', 'metadata', ...columns];
        const allVals = [parentId, locationTypeId, metadata, ...values];

        if (!exists) {
                const placeholders = allVals.map((_, i) => `$${i + 1}`).join(', ');
                const insertQuery = `INSERT INTO location (${allCols.join(', ')}) VALUES (${placeholders}) RETURNING location_id`;
                const res = await client.query(insertQuery, allVals);
            return res.rows[0].location_id;
        } else {
                const setClause = allCols.map((col, i) => `${col} = $${i + 1}`).join(', ');
                const updateQuery = `UPDATE location SET ${setClause}, is_active = true, deactivated_at = NULL WHERE location_id = $${allVals.length + 1}`;
                await client.query(updateQuery, [...allVals, id]);
            return id;
        }
    }

    // Speichert Adressdaten beim Batch-Insert mit ab
    async _upsertAddress(client, id, addressData) {
        let exists = false;
        if (id) {
            try {
                const check = await client.query('SELECT address_id FROM address WHERE address_id = $1', [id]);
                exists = check.rowCount > 0;
            } catch (e) { exists = false; }
        }
        
        const cols = ['street', 'street_number', 'zip_code', 'city', 'country', 'state'];
        const vals = [addressData.street, addressData.street_number, addressData.zip_code, addressData.city, addressData.country, addressData.state];
        if (!exists) {
            const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
            const res = await client.query(`INSERT INTO address (${cols.join(', ')}) VALUES (${placeholders}) RETURNING address_id`, vals);
            return res.rows[0].address_id;
        } else {
            const setClause = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
            await client.query(`UPDATE address SET ${setClause}, is_active = true, deactivated_at = NULL WHERE address_id = $${vals.length + 1}`, [...vals, id]);
            return id;
        }
    }

    async getLocationTypes(groupName) {
        const baseQuery = `
            SELECT lt.location_type_id as id, lt.name, lg.name as "group" 
            FROM location_type lt 
            JOIN location_group lg ON lt.location_group_id = lg.location_group_id
        `;
        if (groupName) {
            const result = await this.pool.query(`${baseQuery} WHERE lg.name = $1`, [groupName]);
            return result.rows;
        }
        const result = await this.pool.query(baseQuery);
        return result.rows;
    }

    async addLocationType(typeData) {
        // Annahme: groupName (z.B. 'building') wird übergeben und muss in eine ID aufgelöst werden
        const groupRes = await this.pool.query('SELECT location_group_id FROM location_group WHERE name = $1', [typeData.group]);
        if (groupRes.rowCount === 0) {
            throw new Error(`Location group '${typeData.group}' not found.`);
        }
        const groupId = groupRes.rows[0].location_group_id;

        const res = await this.pool.query(
            'INSERT INTO location_type (name, location_group_id) VALUES ($1, $2) RETURNING location_type_id',
            [typeData.name, groupId]
        );
        return { success: true, id: res.rows[0].location_type_id };
    }

    async addLocation(locationData) {
        let typeId = locationData.locationTypeId;
        if (!typeId) {
            // Falls kein expliziter Typ mitgegeben wird, suchen wir die Fallback-ID basierend auf der Hierarchie (building, floor, room)
            const groupName = locationData.type || 'building';
            const resType = await this.pool.query(`
                SELECT lt.location_type_id FROM location_type lt
                JOIN location_group lg ON lt.location_group_id = lg.location_group_id
                WHERE lg.name = $1 LIMIT 1
            `, [groupName]);
            typeId = resType.rows[0]?.location_type_id || null;
        }
        
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            let addressId = null;
            if (locationData.address) {
                addressId = await this._upsertAddress(client, locationData.address.id, locationData.address);
            }
            const res = await client.query(
                'INSERT INTO location (parent_location_id, location_type_id, location_name, address_id, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING location_id',
                [locationData.parentId || null, typeId, locationData.name, addressId, locationData.metadata || null]
            );
            await client.query('COMMIT');
            return { success: true, id: res.rows[0].location_id };
        } catch(error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateLocation(id, locationData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            let addressId = null;
            if (locationData.address) {
                addressId = await this._upsertAddress(client, locationData.address.id, locationData.address);
            }
            const result = await client.query(
                'UPDATE location SET parent_location_id = $1, location_name = $2, address_id = $3, location_type_id = $4, metadata = $5, updated_at = NOW() WHERE location_id = $6 AND is_active = true',
                [locationData.parentId || null, locationData.name, addressId, locationData.locationTypeId, locationData.metadata || null, id]
            );
            if (result.rowCount === 0) {
                throw { status: 404, message: "Location not found" };
            }
            await client.query('COMMIT');
            return { success: true };
        } catch(error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deactivateLocation(id) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Rekursiver Soft-Delete (CTE), löscht das Hauptobjekt 
            // und kaskadierend alle verknüpften Kind-Objekte (Floors, Rooms)
            const result = await client.query(`
                WITH RECURSIVE descendants AS (
                    SELECT location_id FROM location WHERE location_id = $1 AND is_active = true
                    UNION ALL
                    SELECT l.location_id FROM location l
                    INNER JOIN descendants d ON l.parent_location_id = d.location_id
                    WHERE l.is_active = true
                )
                UPDATE location SET is_active = false, deactivated_at = NOW() 
                WHERE location_id IN (SELECT location_id FROM descendants)
            `, [id]);
            
            if (result.rowCount === 0) {
                throw { status: 404, message: "Location not found" };
            }

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}