-- =========================================================================================
-- INITIAL DATA: Dashboards & Tiles (testInserts/dashboard.sql)
-- =========================================================================================
DO $$
DECLARE
    v_page_main uuid;
    v_typ_value uuid; v_typ_graph uuid; v_typ_switch uuid; v_typ_shutter2 uuid;
    
    v_dp_licht uuid;
    v_dp_hue uuid;
    v_dp_strom_gesamt uuid;
    v_dp_strom_aktuell uuid;
    v_dp_wasser_gesamt uuid;
    v_dp_wasser_aktuell uuid;
    v_dp_roll_auf uuid;
    v_dp_roll_ab uuid;
    
    v_tile_id uuid;
    v_user_id uuid;
    v_page_room uuid;
    v_page_build uuid;
    v_haus_id uuid;
    v_typ_shutter3 uuid;
    r RECORD;
    v_dp_room_licht uuid;
    v_dp_room_auf uuid; v_dp_room_ab uuid; v_dp_room_stop uuid;
    v_dp_room_temp uuid;
BEGIN
    -- 0. Test-Benutzer ermitteln (Verknüpft das Dashboard mit deinem eingeloggten Account)
    SELECT user_id INTO v_user_id FROM users LIMIT 1;

    -- 1. App Page "Main Dashboard" anlegen
    SELECT app_page_id INTO v_page_main FROM app_page WHERE slug = 'main' LIMIT 1;
    IF v_page_main IS NULL THEN
        INSERT INTO app_page (name, slug, sort_order, user_id) VALUES ('Haupt-Dashboard', 'main', 10, v_user_id) RETURNING app_page_id INTO v_page_main;
    ELSE
        -- Falls die Page schon existierte, erzwingen wir nachträglich die Zuweisung zum Test-User!
        UPDATE app_page SET user_id = v_user_id WHERE app_page_id = v_page_main;
    END IF;

    -- 2. Kacheltypen auflösen
    SELECT tile_type_id INTO v_typ_value FROM tile_type WHERE name = 'Value' LIMIT 1;
    SELECT tile_type_id INTO v_typ_graph FROM tile_type WHERE name = 'Graph' LIMIT 1;
    SELECT tile_type_id INTO v_typ_switch FROM tile_type WHERE name = 'Switch' LIMIT 1;
    SELECT tile_type_id INTO v_typ_shutter2 FROM tile_type WHERE name = 'Shutter 2-Way' LIMIT 1;
    SELECT tile_type_id INTO v_typ_shutter3 FROM tile_type WHERE name = 'Shutter 3-Way' LIMIT 1;

    -- 3. Datenpunkte auflösen (Mit Fallbacks, falls Namen in datapoints.sql abweichen)
    SELECT datapoint_id INTO v_dp_licht FROM datapoint WHERE datapoint_name ILIKE '%Licht%' AND is_actuator = true LIMIT 1;
    IF v_dp_licht IS NULL THEN SELECT datapoint_id INTO v_dp_licht FROM datapoint WHERE is_actuator = true LIMIT 1; END IF;

    SELECT datapoint_id INTO v_dp_hue FROM datapoint WHERE datapoint_name ILIKE '%Hue%' LIMIT 1;

    SELECT datapoint_id INTO v_dp_strom_gesamt FROM datapoint WHERE datapoint_name ILIKE '%Strom%Gesamt%' LIMIT 1;
    IF v_dp_strom_gesamt IS NULL THEN SELECT datapoint_id INTO v_dp_strom_gesamt FROM datapoint WHERE is_sensor = true LIMIT 1; END IF;

    SELECT datapoint_id INTO v_dp_strom_aktuell FROM datapoint WHERE datapoint_name ILIKE '%Leistung%' LIMIT 1;
    IF v_dp_strom_aktuell IS NULL THEN SELECT datapoint_id INTO v_dp_strom_aktuell FROM datapoint WHERE is_sensor = true LIMIT 1; END IF;

    SELECT datapoint_id INTO v_dp_wasser_gesamt FROM datapoint WHERE datapoint_name ILIKE '%Wasser%Gesamt%' LIMIT 1;

    SELECT datapoint_id INTO v_dp_wasser_aktuell FROM datapoint WHERE datapoint_name ILIKE '%Wasserdurchfluss%' LIMIT 1;
    IF v_dp_wasser_aktuell IS NULL THEN SELECT datapoint_id INTO v_dp_wasser_aktuell FROM datapoint WHERE is_sensor = true LIMIT 1; END IF;

    SELECT datapoint_id INTO v_dp_roll_auf FROM datapoint WHERE datapoint_name ILIKE '%Roll%Auf%' LIMIT 1;
    IF v_dp_roll_auf IS NULL THEN SELECT datapoint_id INTO v_dp_roll_auf FROM datapoint WHERE is_actuator = true LIMIT 1; END IF;

    SELECT datapoint_id INTO v_dp_roll_ab FROM datapoint WHERE datapoint_name ILIKE '%Roll%Ab%' LIMIT 1;
    IF v_dp_roll_ab IS NULL THEN SELECT datapoint_id INTO v_dp_roll_ab FROM datapoint WHERE is_actuator = true LIMIT 1; END IF;

    -- 4. Kacheln einfügen (Positionierung auf einem 6-Spalten-Gitter ohne Überlappungen)
    
    -- Kachel 1 (1x1): Aktuelle Leistung (Spalte 1, Zeile 1)
    IF v_dp_strom_aktuell IS NOT NULL AND v_typ_value IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_main AND label = 'Aktuelle Leistung') THEN
        INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
        VALUES (v_page_main, v_typ_value, 'Aktuelle Leistung', 1, 1, 1, 1, jsonb_build_object('contentType', 'Value', 'datapoint', jsonb_build_object('main', v_dp_strom_aktuell))) RETURNING tile_id INTO v_tile_id;
        INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_strom_aktuell, 'main');
    END IF;

    -- Kachel 2 (3x3): Strom Graph (Nimmt Spalten 2-4 ein, Zeilen 1-3)
    IF v_dp_strom_aktuell IS NOT NULL AND v_dp_strom_gesamt IS NOT NULL AND v_typ_graph IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_main AND label = 'Stromverbrauch Historie') THEN
        INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
        VALUES (v_page_main, v_typ_graph, 'Stromverbrauch Historie', 2, 1, 3, 3, jsonb_build_object('contentType', 'Graph', 'datapoint', jsonb_build_object('main', v_dp_strom_aktuell::text || ',' || v_dp_strom_gesamt::text))) RETURNING tile_id INTO v_tile_id;
        INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_strom_aktuell, 'main');
        INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_strom_gesamt, 'main');
    END IF;

    -- Kachel 3 (1x1): Licht Wohnzimmer (Spalte 5, Zeile 1)
    IF v_dp_licht IS NOT NULL AND v_typ_switch IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_main AND label = 'Deckenlicht') THEN
        INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
        VALUES (v_page_main, v_typ_switch, 'Deckenlicht', 5, 1, 1, 1, jsonb_build_object('contentType', 'Switch', 'datapoint', jsonb_build_object('main', v_dp_licht))) RETURNING tile_id INTO v_tile_id;
        INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_licht, 'main');
    END IF;

    -- Kachel 4 (1x1): Rollladen (Spalte 6, Zeile 1)
    IF v_dp_roll_auf IS NOT NULL AND v_dp_roll_ab IS NOT NULL AND v_typ_shutter2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_main AND label = 'Rollladen Terrasse') THEN
        INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
        VALUES (v_page_main, v_typ_shutter2, 'Rollladen Terrasse', 6, 1, 1, 1, jsonb_build_object('contentType', 'Shutter 2-Way', 'datapoint', jsonb_build_object('up', v_dp_roll_auf, 'down', v_dp_roll_ab))) RETURNING tile_id INTO v_tile_id;
        INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_roll_auf, 'up');
        INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_roll_ab, 'down');
    END IF;

    -- Kachel 5 (1x1): Wasserverbrauch (Spalte 1, Zeile 2)
    IF v_dp_wasser_aktuell IS NOT NULL AND v_typ_value IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_main AND label = 'Aktueller Wasserverbrauch') THEN
        INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
        VALUES (v_page_main, v_typ_value, 'Aktueller Wasserverbrauch', 1, 2, 1, 1, jsonb_build_object('contentType', 'Value', 'datapoint', jsonb_build_object('main', v_dp_wasser_aktuell))) RETURNING tile_id INTO v_tile_id;
        INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_wasser_aktuell, 'main');
    END IF;
    
    -- ==========================================================
    -- 5. GEBÄUDE-DASHBOARD (Energie/Wasser Übersicht)
    -- ==========================================================
    SELECT location_id INTO v_haus_id FROM location WHERE location_type_id = (SELECT location_type_id FROM location_type WHERE name = 'Haus' LIMIT 1) LIMIT 1;
    IF v_haus_id IS NOT NULL THEN
        SELECT app_page_id INTO v_page_build FROM app_page WHERE slug = 'dashboard_building_' || v_haus_id LIMIT 1;
        IF v_page_build IS NULL THEN
            INSERT INTO app_page (name, slug, location_id, user_id) VALUES ('Gebäude Übersicht', 'dashboard_building_' || v_haus_id, v_haus_id, v_user_id) RETURNING app_page_id INTO v_page_build;
        ELSE
            UPDATE app_page SET user_id = v_user_id WHERE app_page_id = v_page_build;
        END IF;

        -- Haus: Wasser Graph (3x3)
        IF v_dp_wasser_aktuell IS NOT NULL AND v_dp_wasser_gesamt IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_build AND label = 'Wasserverbrauch Haus') THEN
            INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
            VALUES (v_page_build, v_typ_graph, 'Wasserverbrauch Haus', 1, 1, 3, 3, jsonb_build_object('contentType', 'Graph', 'datapoint', jsonb_build_object('main', v_dp_wasser_aktuell::text || ',' || v_dp_wasser_gesamt::text))) RETURNING tile_id INTO v_tile_id;
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_wasser_aktuell, 'main');
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_wasser_gesamt, 'main');
        END IF;

        -- Haus: Strom Graph (3x3)
        IF v_dp_strom_aktuell IS NOT NULL AND v_dp_strom_gesamt IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_build AND label = 'Stromverbrauch Haus') THEN
            INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
            VALUES (v_page_build, v_typ_graph, 'Stromverbrauch Haus', 4, 1, 3, 3, jsonb_build_object('contentType', 'Graph', 'datapoint', jsonb_build_object('main', v_dp_strom_aktuell::text || ',' || v_dp_strom_gesamt::text))) RETURNING tile_id INTO v_tile_id;
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_strom_aktuell, 'main');
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_strom_gesamt, 'main');
        END IF;
    END IF;

    -- ==========================================================
    -- 6. DYNAMISCHE RAUM-DASHBOARDS (Schleife durch alle Zimmer)
    -- ==========================================================
    FOR r IN SELECT location_id, location_name FROM location WHERE location_type_id = (SELECT location_type_id FROM location_type WHERE name = 'Zimmer' LIMIT 1) LOOP
        SELECT app_page_id INTO v_page_room FROM app_page WHERE slug = 'dashboard_room_' || r.location_id LIMIT 1;
        IF v_page_room IS NULL THEN
            INSERT INTO app_page (name, slug, location_id, user_id) VALUES (r.location_name, 'dashboard_room_' || r.location_id, r.location_id, v_user_id) RETURNING app_page_id INTO v_page_room;
        ELSE
            UPDATE app_page SET user_id = v_user_id WHERE app_page_id = v_page_room;
        END IF;

        -- Datenpunkte für diesen spezifischen Raum laden
        SELECT dp.datapoint_id INTO v_dp_room_licht FROM datapoint dp JOIN device_channel dc ON dp.device_channel_id = dc.device_channel_id JOIN devices d ON d.device_id = dc.device_id WHERE d.location_id = r.location_id AND dp.datapoint_name ILIKE 'Licht%' LIMIT 1;
        SELECT dp.datapoint_id INTO v_dp_room_auf FROM datapoint dp JOIN device_channel dc ON dp.device_channel_id = dc.device_channel_id JOIN devices d ON d.device_id = dc.device_id WHERE d.location_id = r.location_id AND dp.datapoint_name ILIKE 'Storen Auf%' LIMIT 1;
        SELECT dp.datapoint_id INTO v_dp_room_ab FROM datapoint dp JOIN device_channel dc ON dp.device_channel_id = dc.device_channel_id JOIN devices d ON d.device_id = dc.device_id WHERE d.location_id = r.location_id AND dp.datapoint_name ILIKE 'Storen Ab%' LIMIT 1;
        SELECT dp.datapoint_id INTO v_dp_room_stop FROM datapoint dp JOIN device_channel dc ON dp.device_channel_id = dc.device_channel_id JOIN devices d ON d.device_id = dc.device_id WHERE d.location_id = r.location_id AND dp.datapoint_name ILIKE 'Storen Stop%' LIMIT 1;
        SELECT dp.datapoint_id INTO v_dp_room_temp FROM datapoint dp JOIN device_channel dc ON dp.device_channel_id = dc.device_channel_id JOIN devices d ON d.device_id = dc.device_id WHERE d.location_id = r.location_id AND dp.datapoint_name ILIKE 'Temperatur%' LIMIT 1;

        -- Licht Kachel (Switch)
        IF v_dp_room_licht IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_room AND label = 'Licht ' || r.location_name) THEN
            INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
            VALUES (v_page_room, v_typ_switch, 'Licht ' || r.location_name, 1, 1, 1, 1, jsonb_build_object('contentType', 'Switch', 'datapoint', jsonb_build_object('main', v_dp_room_licht))) RETURNING tile_id INTO v_tile_id;
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_room_licht, 'main');
        END IF;

        -- Storen Kachel (Shutter 3-Way)
        IF v_dp_room_auf IS NOT NULL AND v_dp_room_ab IS NOT NULL AND v_dp_room_stop IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_room AND label = 'Storen ' || r.location_name) THEN
            INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
            VALUES (v_page_room, v_typ_shutter3, 'Storen ' || r.location_name, 2, 1, 1, 1, jsonb_build_object('contentType', 'Shutter 3-Way', 'datapoint', jsonb_build_object('up', v_dp_room_auf, 'down', v_dp_room_ab, 'stop', v_dp_room_stop))) RETURNING tile_id INTO v_tile_id;
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_room_auf, 'up');
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_room_ab, 'down');
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_room_stop, 'stop');
        END IF;

        -- Temperatur Kachel (Value)
        IF v_dp_room_temp IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_room AND label = 'Temperatur') THEN
            INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
            VALUES (v_page_room, v_typ_value, 'Temperatur', 3, 1, 1, 1, jsonb_build_object('contentType', 'Value', 'unitFilter', '°C', 'datapoint', jsonb_build_object('main', v_dp_room_temp))) RETURNING tile_id INTO v_tile_id;
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_room_temp, 'main');
        END IF;

        -- Temperatur Kachel (Graph, Zeile 2, 3x3 gross)
        IF v_dp_room_temp IS NOT NULL AND v_typ_graph IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tile WHERE app_page_id = v_page_room AND label = 'Temperatur Historie') THEN
            INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config)
            VALUES (v_page_room, v_typ_graph, 'Temperatur Historie', 1, 2, 3, 3, jsonb_build_object('contentType', 'Graph', 'unitFilter', '°C', 'datapoint', jsonb_build_object('main', v_dp_room_temp))) RETURNING tile_id INTO v_tile_id;
            INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES (v_tile_id, v_dp_room_temp, 'main');
        END IF;

    END LOOP;

    RAISE NOTICE 'Dashboard-Kacheln erfolgreich in das 6er Gitter eingefügt.';
END $$;