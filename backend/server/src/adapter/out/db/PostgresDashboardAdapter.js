import { IDashboardRepository } from '../../../ports/out/IDashboardRepository.js';

export class PostgresDashboardAdapter extends IDashboardRepository {
    constructor(pool) {
        super();
        this.pool = pool;
    }

    async getAllDashboards() {
        const query = `
            SELECT 
                p.app_page_id as id,
                p.name,
                p.slug,
                p.location_id as "locationId",
                p.user_id as "userId",
                p.sort_order as "sortOrder"
            FROM app_page p
            LEFT JOIN location l ON p.location_id = l.location_id
            WHERE p.location_id IS NULL OR l.is_active = true
            ORDER BY p.sort_order ASC, p.name ASC
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getTileTypes() {
        let res = await this.pool.query('SELECT tile_type_id as id, name, description FROM tile_type ORDER BY name');
        // Automatisches Einfügen der Basis-Typen, falls die Datenbank leer ist
        if (res.rowCount === 0) {
            const defaults = ['Value', 'Graph', 'Switch', 'Shutter 2-Way', 'Shutter 3-Way'];
            for (const t of defaults) {
                const check = await this.pool.query('SELECT tile_type_id FROM tile_type WHERE name = $1', [t]);
                if (check.rowCount === 0) await this.pool.query('INSERT INTO tile_type (name) VALUES ($1)', [t]);
            }
            res = await this.pool.query('SELECT tile_type_id as id, name, description FROM tile_type ORDER BY name');
        }
        return res.rows;
    }

    async getDashboardBySlug(slug) {
        return this._getDashboard("slug", slug);
    }

    async getDashboardById(id) {
        return this._getDashboard("app_page_id", id);
    }

    async getDashboardTilesBySlug(slug) {
        console.log(`[DB] getDashboardTilesBySlug called for slug: "${slug}"`);
        
        // 1. Hole alle Kacheln ohne komplexe JSON_AGG (Kugelsicher)
        const tileQuery = `
            SELECT 
                t.tile_id as id,
                tt.name as "tileTypeName",
                t.label,
                t.col_pos as col,
                t.row_pos as row,
                t.col_span as "colSpan",
                t.row_span as "rowSpan",
                t.config
            FROM tile t
            JOIN tile_type tt ON t.tile_type_id = tt.tile_type_id
            JOIN app_page p ON t.app_page_id = p.app_page_id
            WHERE p.slug = $1
            ORDER BY t.row_pos, t.col_pos
        `;
        const tileRes = await this.pool.query(tileQuery, [slug]);
        console.log(`[DB] Found ${tileRes.rowCount} tiles for slug "${slug}"`);

        if (tileRes.rowCount === 0) return [];

        const tiles = tileRes.rows;

        // 2. Hole alle Datenpunkte für diese Kacheln
        const tileIds = tiles.map(t => t.id);
        const dpQuery = `
            SELECT tile_id, role, datapoint_id
            FROM tile_datapoint
            WHERE tile_id = ANY($1::uuid[])
        `;
        const dpRes = await this.pool.query(dpQuery, [tileIds]);
        
        // 3. Mapping in JavaScript (100% sicher und einfach zu debuggen)
        for (const t of tiles) {
            const config = t.config || {};
            t.contentType = config.contentType || t.tileTypeName;
            t.unitFilter = config.unitFilter || null;
            
            // Datapoints aggregieren
            t.datapoint = config.datapoint || {};
            const dpsForTile = dpRes.rows.filter(dp => dp.tile_id === t.id);
            dpsForTile.forEach(dp => {
                if (t.datapoint[dp.role] && !t.datapoint[dp.role].includes(dp.datapoint_id)) {
                    t.datapoint[dp.role] += `,${dp.datapoint_id}`;
                } else if (!t.datapoint[dp.role]) {
                    t.datapoint[dp.role] = dp.datapoint_id;
                }
            });

            // UnitFilter Fallback für das Frontend
            if (t.unitFilter) t.datapoint.unitFilter = t.unitFilter;
            
            delete t.config; // Backend-intern, wird nicht ans Frontend gesendet
        }

        console.log(`[DB] Successfully mapped ${tiles.length} tiles to JSON.`);
        return tiles;
    }

    async _getDashboard(column, value) {
        const allowedColumns = ['slug', 'app_page_id'];
        if (!allowedColumns.includes(column)) {
            throw new Error(`Invalid search column: ${column}`);
        }
        // Verschachteltes JSON mit allen relevanten Daten aufbauen
        const query = `
            SELECT
                p.app_page_id as id,
                p.name,
                p.slug,
                p.location_id as "locationId",
                p.user_id as "userId",
                p.sort_order as "sortOrder"
            FROM app_page p
            LEFT JOIN location l ON p.location_id = l.location_id
            WHERE p.${column} = $1 AND (p.location_id IS NULL OR l.is_active = true)
        `;

        const result = await this.pool.query(query, [value]);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    }

    async saveDashboard(dashboardData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            let pageId = dashboardData.id;
            
            // App Page anlegen, falls nur ein Slug (z.B. "main") und keine UUID bekannt ist
            if (!pageId && dashboardData.slug) {
                const pageRes = await client.query('SELECT app_page_id FROM app_page WHERE slug = $1', [dashboardData.slug]);
                if (pageRes.rowCount > 0) {
                    pageId = pageRes.rows[0].app_page_id;
                } else {
                    const newPageRes = await client.query(
                        'INSERT INTO app_page (name, slug, location_id, user_id) VALUES ($1, $2, $3, $4) RETURNING app_page_id',
                        [dashboardData.name || 'Dashboard', dashboardData.slug, dashboardData.locationId || null, dashboardData.userId || null]
                    );
                    pageId = newPageRes.rows[0].app_page_id;
                }
            }

            if (!pageId) throw new Error("Dashboard ID oder Slug zwingend erforderlich.");

            // Metadaten des Dashboards aktualisieren
            const updates = [];
            const params = [];
            if (dashboardData.name) {
                params.push(dashboardData.name);
                updates.push(`name = $${params.length}`);
            }
            if (dashboardData.locationId) {
                params.push(dashboardData.locationId);
                updates.push(`location_id = $${params.length}`);
            }
            if (dashboardData.userId !== undefined) {
                params.push(dashboardData.userId);
                updates.push(`user_id = $${params.length}`);
            }
            if (updates.length > 0) {
                params.push(pageId);
                await client.query(`UPDATE app_page SET ${updates.join(', ')} WHERE app_page_id = $${params.length}`, params);
            }

            await client.query('COMMIT');
            return await this.getDashboardById(pageId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async saveDashboardTiles(slug, tiles) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const pageRes = await client.query('SELECT app_page_id FROM app_page WHERE slug = $1', [slug]);
            if (pageRes.rowCount === 0) {
                throw new Error(`Dashboard mit Slug "${slug}" nicht gefunden.`);
            }
            const pageId = pageRes.rows[0].app_page_id;

            if (!tiles || tiles.length === 0) {
                await client.query('DELETE FROM tile_datapoint WHERE tile_id IN (SELECT tile_id FROM tile WHERE app_page_id = $1)', [pageId]);
                await client.query('DELETE FROM tile WHERE app_page_id = $1', [pageId]);
                await client.query('COMMIT');
                return await this.getDashboardTilesBySlug(slug);
            }

            // 1. Resolve & create tile types using JSON array (Bulk Insert)
            const tileTypes = [...new Set(tiles.map(t => t.contentType || 'Value'))].map(name => ({ name }));
            await client.query(`
                INSERT INTO tile_type (name)
                SELECT name FROM json_to_recordset($1::json) AS x(name varchar)
                ON CONFLICT (name) DO NOTHING
            `, [JSON.stringify(tileTypes)]);

            // 2. Prepare payload for Tiles Bulk Upsert
            const tilePayload = tiles.map(t => ({
                tile_id: (t.id && !t.id.startsWith('tile-tmp-')) ? t.id : null,
                app_page_id: pageId,
                tile_type_name: t.contentType || 'Value',
                label: t.label || '',
                col_pos: t.col || 0,
                row_pos: t.row || 0,
                col_span: t.colSpan || 1,
                row_span: t.rowSpan || 1,
                config: { 
                    contentType: t.contentType || null,
                    unitFilter: t.unitFilter || (t.datapoint && t.datapoint.unitFilter) || null
                }
            }));

            // Execute Bulk Upsert for Tiles
            const upsertRes = await client.query(`
                WITH payload AS (
                    SELECT * FROM json_to_recordset($1::json) AS x(
                        tile_id uuid, app_page_id uuid, tile_type_name varchar, label varchar, 
                        col_pos smallint, row_pos smallint, col_span smallint, row_span smallint, config jsonb
                    )
                )
                INSERT INTO tile (tile_id, app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config, updated_at)
                SELECT 
                    COALESCE(p.tile_id, uuidv7()), 
                    p.app_page_id, 
                    tt.tile_type_id, 
                    p.label, p.col_pos, p.row_pos, p.col_span, p.row_span, p.config, NOW()
                FROM payload p
                JOIN tile_type tt ON tt.name = p.tile_type_name
                ON CONFLICT (tile_id) DO UPDATE SET
                    tile_type_id = EXCLUDED.tile_type_id,
                    label = EXCLUDED.label,
                    col_pos = EXCLUDED.col_pos,
                    row_pos = EXCLUDED.row_pos,
                    col_span = EXCLUDED.col_span,
                    row_span = EXCLUDED.row_span,
                    config = EXCLUDED.config,
                    updated_at = NOW()
                RETURNING tile_id, label, col_pos, row_pos
            `, [JSON.stringify(tilePayload)]);

            const activeTileIds = upsertRes.rows.map(r => r.tile_id);

            // 3. Prepare payload for Datapoints
            const dpPayload = [];
            for (const t of tiles) {
                let actualTileId = t.id && !t.id.startsWith('tile-tmp-') ? t.id : null;
                if (!actualTileId) {
                    const matchedRow = upsertRes.rows.find(r => r.label === (t.label || '') && r.col_pos === (t.col || 0) && r.row_pos === (t.row || 0));
                    if (matchedRow) actualTileId = matchedRow.tile_id;
                }
                if (actualTileId && t.datapoint && typeof t.datapoint === 'object') {
                    for (const [role, dpValue] of Object.entries(t.datapoint)) {
                        if (!dpValue || role === 'unitFilter') continue; // Ignorieren, verhindert UUID-Crash in Postgres!
                        const dpIds = Array.isArray(dpValue) ? dpValue : dpValue.split(',');
                        for (const dpId of dpIds) {
                            if (dpId.trim()) dpPayload.push({ tile_id: actualTileId, datapoint_id: dpId.trim(), role });
                        }
                    }
                }
            }

            // Bulk Delete & Insert Datapoints
            if (activeTileIds.length > 0) {
                await client.query('DELETE FROM tile_datapoint WHERE tile_id = ANY($1::uuid[])', [activeTileIds]);
            }
            if (dpPayload.length > 0) {
                await client.query(`
                    INSERT INTO tile_datapoint (tile_id, datapoint_id, role)
                    SELECT tile_id, datapoint_id, role 
                    FROM json_to_recordset($1::json) AS x(tile_id uuid, datapoint_id uuid, role varchar)
                `, [JSON.stringify(dpPayload)]);
            }

            // 4. Orphan-Kacheln und Verknüpfungen bereinigen
            await client.query('DELETE FROM tile_datapoint WHERE tile_id IN (SELECT tile_id FROM tile WHERE app_page_id = $1 AND tile_id != ALL($2::uuid[]))', [pageId, activeTileIds]);
            await client.query('DELETE FROM tile WHERE app_page_id = $1 AND tile_id != ALL($2::uuid[])', [pageId, activeTileIds]);

            await client.query('COMMIT');
            return await this.getDashboardTilesBySlug(slug);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

}