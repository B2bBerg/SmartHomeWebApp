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
        const client = await this.pool.connect();
        try {
            // Die Tabellen werden durch ein separates DB-Setup-Skript erstellt.
            console.log("PostgresLocationAdapter verbunden und bereit.");
        } catch (error) {
            console.error("Fehler bei der Adapter-Initialisierung:", error);
        } finally {
            client.release();
        }
    }

    async getLocations() {
        // Baut das verschachtelte JSON-Objekt exakt so auf, wie es das Frontend verlangt, 
        // unter Auslassung aller soft-gelöschten (deleted_at IS NOT NULL) Einträge.
        const query = `
            SELECT 
                l.id, l.name, 
                CASE WHEN a.id IS NOT NULL THEN
                    json_build_object(
                        'id', a.id,
                        'street', a.street, 'number', a.number, 
                        'zip', a.zip, 'city', a.city, 'country', a.country
                    )
                ELSE NULL END as address,
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'id', f.id,
                            'name', f.name,
                            'rooms', COALESCE(
                                (SELECT json_agg(
                                    json_build_object('id', r.id, 'name', r.name)
                                    ) FROM locations r 
                                    JOIN location_types rt ON r.location_type_id = rt.id 
                                    WHERE r.parent_id = f.id AND rt."group" = 'room' AND r.deleted_at IS NULL),
                                '[]'::json
                            )
                        )
                        ) FROM locations f 
                        JOIN location_types ft ON f.location_type_id = ft.id 
                        WHERE f.parent_id = l.id AND ft."group" = 'floor' AND f.deleted_at IS NULL),
                    '[]'::json
                ) as floors
            FROM locations l
            JOIN location_types lt ON l.location_type_id = lt.id
            LEFT JOIN addresses a ON l.address_id = a.id
            WHERE lt."group" = 'building' AND l.deleted_at IS NULL
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
            const typesRes = await client.query('SELECT id, "group" FROM location_types WHERE deleted_at IS NULL');
            const typeIds = {
                building: typesRes.rows.find(t => t.group === 'building')?.id || null,
                floor: typesRes.rows.find(t => t.group === 'floor')?.id || null,
                room: typesRes.rows.find(t => t.group === 'room')?.id || null
            };
            
            // 1. Rekursiver Upsert der aktiven Baumstruktur in einer einzigen Tabelle
            for (const loc of locationsData) {
                let addressId = null;
                if (loc.address) {
                    addressId = await this._upsertAddress(client, loc.address.id, loc.address);
                    loc.address.id = addressId; // Update der generierten ID im Payload
                }

                let locId = await this._upsertEntity(client, loc.id, null, typeIds.building, 
                    [loc.name, addressId], 
                    ['name', 'address_id']
                );
                loc.id = locId; // Aktualisieren für das Return-Objekt
                activeIds.push(locId);

                if (loc.floors) {
                    for (const floor of loc.floors) {
                        let floorId = await this._upsertEntity(client, floor.id, locId, typeIds.floor, 
                            [floor.name], 
                            ['name']
                        );
                        floor.id = floorId;
                        activeIds.push(floorId);

                        if (floor.rooms) {
                            for (const room of floor.rooms) {
                                let roomId = await this._upsertEntity(client, room.id, floorId, typeIds.room, 
                                    [room.name], 
                                    ['name']
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
                await client.query('UPDATE locations SET deleted_at = NOW() WHERE id != ALL($1::uuid[]) AND deleted_at IS NULL', [activeIds]);
            } else {
                await client.query('UPDATE locations SET deleted_at = NOW() WHERE deleted_at IS NULL');
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
    async _upsertEntity(client, id, parentId, locationTypeId, values, columns) {
        let exists = false;
        if (id) {
            try {
                    const check = await client.query('SELECT id FROM locations WHERE id = $1', [id]);
                exists = check.rowCount > 0;
            } catch (e) { exists = false; } // Z.B. falls die ID ein invalidier UUID String wie 'mock-uuid-1' ist
        }

        const allCols = ['parent_id', 'location_type_id', ...columns];
        const allVals = [parentId, locationTypeId, ...values];

        if (!exists) {
                const placeholders = allVals.map((_, i) => `$${i + 1}`).join(', ');
                const insertQuery = `INSERT INTO locations (${allCols.join(', ')}) VALUES (${placeholders}) RETURNING id`;
                const res = await client.query(insertQuery, allVals);
            return res.rows[0].id;
        } else {
                const setClause = allCols.map((col, i) => `${col} = $${i + 1}`).join(', ');
                const updateQuery = `UPDATE locations SET ${setClause}, deleted_at = NULL WHERE id = $${allVals.length + 1}`;
                await client.query(updateQuery, [...allVals, id]);
            return id;
        }
    }

    // Speichert Adressdaten beim Batch-Insert mit ab
    async _upsertAddress(client, id, addressData) {
        let exists = false;
        if (id) {
            try {
                const check = await client.query('SELECT id FROM addresses WHERE id = $1', [id]);
                exists = check.rowCount > 0;
            } catch (e) { exists = false; }
        }
        
        const cols = ['street', 'number', 'zip', 'city', 'country'];
        const vals = [addressData.street, addressData.number, addressData.zip, addressData.city, addressData.country];
        if (!exists) {
            const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
            const res = await client.query(`INSERT INTO addresses (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`, vals);
            return res.rows[0].id;
        } else {
            const setClause = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
            await client.query(`UPDATE addresses SET ${setClause}, deleted_at = NULL WHERE id = $${vals.length + 1}`, [...vals, id]);
            return id;
        }
    }

    async getLocationTypes(groupName) {
        if (groupName) {
            const result = await this.pool.query('SELECT id, name, "group" FROM location_types WHERE "group" = $1 AND deleted_at IS NULL', [groupName]);
            return result.rows;
        }
        const result = await this.pool.query('SELECT id, name, "group" FROM location_types WHERE deleted_at IS NULL');
        return result.rows;
    }

    async addLocationType(typeData) {
        const res = await this.pool.query(
            'INSERT INTO location_types (name, "group") VALUES ($1, $2) RETURNING id',
            [typeData.name, typeData.group]
        );
        return { success: true, id: res.rows[0].id };
    }

    async addLocation(locationData) {
        let typeId = locationData.location_type_id;
        if (!typeId) {
            // Falls kein Typ mitgegeben wird, suchen wir die Fallback-ID für ein Gebäude
            const resType = await this.pool.query(`SELECT id FROM location_types WHERE "group" = 'building' LIMIT 1`);
            typeId = resType.rows[0]?.id || null;
        }
        
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            let addressId = null;
            if (locationData.address) {
                addressId = await this._upsertAddress(client, locationData.address.id, locationData.address);
            }
            const res = await client.query(
                'INSERT INTO locations (parent_id, location_type_id, name, address_id) VALUES ($1, $2, $3, $4) RETURNING id',
                [null, typeId, locationData.name, addressId]
            );
            await client.query('COMMIT');
            return { success: true, id: res.rows[0].id };
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
                'UPDATE locations SET name = $1, address_id = $2, location_type_id = $3 WHERE id = $4 AND deleted_at IS NULL',
                [locationData.name, addressId, locationData.location_type_id, id]
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

    async deleteLocation(id) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Rekursiver Soft-Delete (CTE für PostgreSQL 18), löscht das Hauptobjekt 
            // und kaskadierend alle verknüpften Kind-Objekte (Floors, Rooms)
            const result = await client.query(`
                WITH RECURSIVE descendants AS (
                    SELECT id FROM locations WHERE id = $1 AND deleted_at IS NULL
                    UNION ALL
                    SELECT l.id FROM locations l
                    INNER JOIN descendants d ON l.parent_id = d.id
                    WHERE l.deleted_at IS NULL
                )
                UPDATE locations SET deleted_at = NOW() 
                WHERE id IN (SELECT id FROM descendants)
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