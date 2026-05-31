-- =========================================================================================
-- INITIAL DATA: Devices & Device Channels
-- =========================================================================================

-- 1. Sicherstellen, dass benötigte Bus-Typen (Netzwerk-Protokolle) existieren
INSERT INTO bus_type (bus_name) VALUES ('WIFI'), ('Zigbee'), ('Z-Wave'), ('KNX') 
ON CONFLICT (bus_name) DO NOTHING;

DO $$
DECLARE
    v_loc_id uuid;
    v_wohn_id uuid;
    v_technik_id uuid;
    v_kueche_id uuid;
    v_schlaf_id uuid;
    v_bad_id uuid;
    v_buero_id uuid;
    
    v_bus_wifi uuid;
    v_bus_zigbee uuid;
    
    v_model_shelly1 uuid;
    v_model_shelly25 uuid;
    v_model_hue uuid;
    v_model_emeter uuid;
    v_model_wmeter uuid;
    v_model_shutter3 uuid;
    v_model_temp uuid;
    
    v_dev_shelly1 uuid;
    v_dev_shelly25 uuid;
    v_dev_hue uuid;
    v_dev_emeter uuid;
    v_dev_wmeter uuid;
    
    v_ch_do01 uuid;
    v_ch_do02 uuid;
    v_ch_do03 uuid;
    v_ch_di01 uuid;
    v_ch_di02 uuid;
    v_ch_ai01 uuid;
    v_ch_ai02 uuid;
    v_manuf_id uuid;
    
    r RECORD;
    new_dev uuid;
BEGIN
    -- 2. Standorte laden (Erstellt durch location.sql)
    SELECT location_id INTO v_wohn_id FROM location WHERE location_name = 'Wohnzimmer' LIMIT 1;
    SELECT location_id INTO v_technik_id FROM location WHERE location_name = 'Technikraum' LIMIT 1;
    SELECT location_id INTO v_kueche_id FROM location WHERE location_name = 'Küche' LIMIT 1;
    SELECT location_id INTO v_schlaf_id FROM location WHERE location_name = 'Schlafzimmer' LIMIT 1;
    SELECT location_id INTO v_bad_id FROM location WHERE location_name = 'Badezimmer' LIMIT 1;
    SELECT location_id INTO v_buero_id FROM location WHERE location_name = 'Büro' LIMIT 1;
    
    -- Fallback
    SELECT location_id INTO v_loc_id FROM location LIMIT 1;
    
    IF v_loc_id IS NULL THEN
        RAISE NOTICE 'Abbruch: Es muss mindestens eine Location existieren. Bitte zuerst location.sql ausführen.';
        RETURN;
    END IF;

    -- Falls Wohnzimmer/Technikraum fehlen, nutze den Fallback
    IF v_wohn_id IS NULL THEN v_wohn_id := v_loc_id; END IF;
    IF v_technik_id IS NULL THEN v_technik_id := v_loc_id; END IF;

    -- 3. Referenz-IDs für Bus-Protokolle auflösen
    SELECT bus_type_id INTO v_bus_wifi FROM bus_type WHERE bus_name = 'WIFI';
    SELECT bus_type_id INTO v_bus_zigbee FROM bus_type WHERE bus_name = 'Zigbee';

    -- 4. Referenz-IDs für Model-Typen auflösen (aus modelType.sql)
    SELECT model_type_id INTO v_model_shelly1 FROM model_type WHERE model_name = 'Shelly 1' LIMIT 1;
    SELECT model_type_id INTO v_model_shelly25 FROM model_type WHERE model_name = 'Shelly 2.5' LIMIT 1;
    SELECT model_type_id INTO v_model_hue FROM model_type WHERE model_name = 'Hue Color Ambiance' LIMIT 1;
    
    -- 4a. Hersteller sicherstellen (Verhindert Absturz, falls Tabelle leer ist)
    SELECT manufacturer_id INTO v_manuf_id FROM manufacturer LIMIT 1;
    IF v_manuf_id IS NULL THEN
        INSERT INTO manufacturer (manufacturer_name) VALUES ('SmartHome Systems') RETURNING manufacturer_id INTO v_manuf_id;
    END IF;

    -- Modelle für Zähler suchen oder anlegen
    SELECT model_type_id INTO v_model_emeter FROM model_type WHERE model_name = 'Shelly 3EM' LIMIT 1;
    IF v_model_emeter IS NULL THEN
        INSERT INTO model_type (model_name, manufacturer_id) 
        VALUES ('Shelly 3EM', v_manuf_id)
        RETURNING model_type_id INTO v_model_emeter;
    END IF;

    SELECT model_type_id INTO v_model_wmeter FROM model_type WHERE model_name = 'Smart Water Meter' LIMIT 1;
    IF v_model_wmeter IS NULL THEN
        INSERT INTO model_type (model_name, manufacturer_id) 
        VALUES ('Smart Water Meter', v_manuf_id)
        RETURNING model_type_id INTO v_model_wmeter;
    END IF;

    SELECT model_type_id INTO v_model_shutter3 FROM model_type WHERE model_name = 'Smart Shutter 3-Way' LIMIT 1;
    IF v_model_shutter3 IS NULL THEN
        INSERT INTO model_type (model_name, manufacturer_id) VALUES ('Smart Shutter 3-Way', v_manuf_id) RETURNING model_type_id INTO v_model_shutter3;
    END IF;

    SELECT model_type_id INTO v_model_temp FROM model_type WHERE model_name = 'Smart Temp Sensor' LIMIT 1;
    IF v_model_temp IS NULL THEN
        INSERT INTO model_type (model_name, manufacturer_id) VALUES ('Smart Temp Sensor', v_manuf_id) RETURNING model_type_id INTO v_model_temp;
    END IF;

    -- 5. Referenz-IDs für Kanal-Typen auflösen (aus channelType.sql)
    SELECT channel_id INTO v_ch_do01 FROM channel_type WHERE channel_name = 'DO_01';
    SELECT channel_id INTO v_ch_do02 FROM channel_type WHERE channel_name = 'DO_02';
    IF NOT EXISTS (SELECT 1 FROM channel_type WHERE channel_name = 'DO_03') THEN INSERT INTO channel_type (channel_name, description) VALUES ('DO_03', 'Digital Output 3'); END IF;
    SELECT channel_id INTO v_ch_do03 FROM channel_type WHERE channel_name = 'DO_03';
    SELECT channel_id INTO v_ch_di01 FROM channel_type WHERE channel_name = 'DI_01';
    SELECT channel_id INTO v_ch_di02 FROM channel_type WHERE channel_name = 'DI_02';
    SELECT channel_id INTO v_ch_ai01 FROM channel_type WHERE channel_name = 'AI_01';
    SELECT channel_id INTO v_ch_ai02 FROM channel_type WHERE channel_name = 'AI_02';

    -- ==========================================
    -- DEVICE 1: Shelly 1 (Ein einfaches Relais)
    -- ==========================================
    IF v_model_shelly1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM devices WHERE mac_address = 'E8:DB:84:12:34:56') THEN
        INSERT INTO devices (device_name, serial_number, mac_address, status, model_type_id, bus_type_id, location_id, signal_level)
        VALUES ('Deckenlicht Wohnzimmer', 'SH1-987654', 'E8:DB:84:12:34:56', 'ONLINE', v_model_shelly1, v_bus_wifi, v_wohn_id, -65)
        RETURNING device_id INTO v_dev_shelly1;

        -- Hat einen Digital Output (Relais) und einen Digital Input (Schalter an der Wand)
        INSERT INTO device_channel (device_id, channel_id, channel_number, description, can_switch) VALUES 
        (v_dev_shelly1, v_ch_do01, 1, 'Licht Relais Ausgang', false),
        (v_dev_shelly1, v_ch_di01, 2, 'Wandschalter Eingang', true);
        
        RAISE NOTICE 'Device Shelly 1 eingefügt.';
    END IF;

    -- ==========================================
    -- DEVICE 2: Shelly 2.5 (Rollladen-Steuerung)
    -- ==========================================
    IF v_model_shelly25 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM devices WHERE mac_address = 'E8:DB:84:65:43:21') THEN
        INSERT INTO devices (device_name, serial_number, mac_address, status, model_type_id, bus_type_id, location_id, signal_level)
        VALUES ('Rollladen Terrasse', 'SH25-112233', 'E8:DB:84:65:43:21', 'ONLINE', v_model_shelly25, v_bus_wifi, v_wohn_id, -58)
        RETURNING device_id INTO v_dev_shelly25;

        -- Hat zwei Outputs (Motor Auf/Ab) und zwei Inputs (Taster Auf/Ab)
        INSERT INTO device_channel (device_id, channel_id, channel_number, description) VALUES 
        (v_dev_shelly25, v_ch_do01, 1, 'Motor Auf'),
        (v_dev_shelly25, v_ch_do02, 2, 'Motor Ab'),
        (v_dev_shelly25, v_ch_di01, 3, 'Taster Auf'),
        (v_dev_shelly25, v_ch_di02, 4, 'Taster Ab');
        
        RAISE NOTICE 'Device Shelly 2.5 eingefügt.';
    END IF;

    -- ==========================================
    -- DEVICE 3: Philips Hue Lampe (Zigbee)
    -- ==========================================
    IF v_model_hue IS NOT NULL AND NOT EXISTS (SELECT 1 FROM devices WHERE mac_address = '00:17:88:01:02:03') THEN
        INSERT INTO devices (device_name, serial_number, mac_address, status, model_type_id, bus_type_id, location_id, battery_level)
        VALUES ('Stehlampe Sofa', 'HUE-ABCDEF', '00:17:88:01:02:03', 'ONLINE', v_model_hue, v_bus_zigbee, v_wohn_id, 100)
        RETURNING device_id INTO v_dev_hue;

        -- Hat momentan nur einen Digital Output (Ein/Aus) - Dimmen folgt später
        INSERT INTO device_channel (device_id, channel_id, channel_number, description) VALUES 
        (v_dev_hue, v_ch_do01, 1, 'Power Schalter');
        
        RAISE NOTICE 'Device Philips Hue eingefügt.';
    END IF;

    -- ==========================================
    -- DEVICE 4: Stromzähler (Shelly 3EM)
    -- ==========================================
    IF v_model_emeter IS NOT NULL AND NOT EXISTS (SELECT 1 FROM devices WHERE mac_address = 'E8:DB:84:99:88:77') THEN
        INSERT INTO devices (device_name, serial_number, mac_address, status, model_type_id, bus_type_id, location_id, signal_level)
        VALUES ('Stromzähler Haus', 'SHEM-334455', 'E8:DB:84:99:88:77', 'ONLINE', v_model_emeter, v_bus_wifi, v_technik_id, -45)
        RETURNING device_id INTO v_dev_emeter;

        -- AI_01: Gesamtenergie (kWh), AI_02: Aktuelle Leistung (W)
        INSERT INTO device_channel (device_id, channel_id, channel_number, description) VALUES 
        (v_dev_emeter, v_ch_ai01, 1, 'Gesamtenergie'),
        (v_dev_emeter, v_ch_ai02, 2, 'Aktuelle Leistung');
        
        RAISE NOTICE 'Device Stromzähler (Shelly 3EM) eingefügt.';
    END IF;

    -- ==========================================
    -- DEVICE 5: Wasserzähler (Smart Water Meter)
    -- ==========================================
    IF v_model_wmeter IS NOT NULL AND NOT EXISTS (SELECT 1 FROM devices WHERE mac_address = 'A4:C1:38:11:22:33') THEN
        INSERT INTO devices (device_name, serial_number, mac_address, status, model_type_id, bus_type_id, location_id, signal_level)
        VALUES ('Wasserzähler Haus', 'WM-667788', 'A4:C1:38:11:22:33', 'ONLINE', v_model_wmeter, v_bus_wifi, v_technik_id, -60)
        RETURNING device_id INTO v_dev_wmeter;

        -- AI_01: Volumen (m³), AI_02: Durchfluss (L/h)
        INSERT INTO device_channel (device_id, channel_id, channel_number, description) VALUES 
        (v_dev_wmeter, v_ch_ai01, 1, 'Gesamtvolumen'),
        (v_dev_wmeter, v_ch_ai02, 2, 'Aktueller Durchfluss');
        
        RAISE NOTICE 'Device Smart Water Meter eingefügt.';
    END IF;

    -- ==========================================
    -- 6. Dynamische Raumbestückung (Alle Räume)
    -- ==========================================
    FOR r IN 
        SELECT * FROM (VALUES 
            ('Küche'::text, v_kueche_id::uuid, 'AA:01'::text), 
            ('Schlafzimmer'::text, v_schlaf_id::uuid, 'AA:02'::text), 
            ('Badezimmer'::text, v_bad_id::uuid, 'AA:03'::text), 
            ('Büro'::text, v_buero_id::uuid, 'AA:04'::text), 
            ('Wohnzimmer'::text, v_wohn_id::uuid, 'AA:05'::text),
            ('Technikraum'::text, v_technik_id::uuid, 'AA:06'::text)
        ) AS t(r_name, r_id, mac_pfx) 
        WHERE r_id IS NOT NULL 
    LOOP
        -- 1. Deckenlicht (falls noch keins existiert)
        IF NOT EXISTS (SELECT 1 FROM devices WHERE location_id = r.r_id AND device_name ILIKE 'Deckenlicht%') THEN
            INSERT INTO devices (device_name, serial_number, mac_address, status, model_type_id, bus_type_id, location_id)
            VALUES ('Deckenlicht ' || r.r_name, 'L-' || r.r_name, (r.mac_pfx || ':00:00:00:01')::macaddr, 'ONLINE', v_model_shelly1, v_bus_wifi, r.r_id)
            RETURNING device_id INTO new_dev;
            INSERT INTO device_channel (device_id, channel_id, channel_number, description, can_switch) VALUES 
            (new_dev, v_ch_do01, 1, 'Licht Relais', false);
        END IF;

        -- 2. 3-Way Storen (Auf/Ab/Stop) - NICHT im Technikraum!
        IF r.r_name != 'Technikraum' THEN
            IF NOT EXISTS (SELECT 1 FROM devices WHERE location_id = r.r_id AND device_name ILIKE 'Storen%') THEN
                INSERT INTO devices (device_name, serial_number, mac_address, status, model_type_id, bus_type_id, location_id)
                VALUES ('Storen ' || r.r_name, 'S3-' || r.r_name, (r.mac_pfx || ':00:00:00:02')::macaddr, 'ONLINE', v_model_shutter3, v_bus_wifi, r.r_id)
                RETURNING device_id INTO new_dev;
                INSERT INTO device_channel (device_id, channel_id, channel_number, description) VALUES 
                (new_dev, v_ch_do01, 1, 'Auf'), (new_dev, v_ch_do02, 2, 'Ab'), (new_dev, v_ch_do03, 3, 'Stop');
            END IF;
        END IF;

        -- 3. Temp Sensor
        IF NOT EXISTS (SELECT 1 FROM devices WHERE location_id = r.r_id AND device_name ILIKE 'Raumklima%') THEN
            INSERT INTO devices (device_name, serial_number, mac_address, status, model_type_id, bus_type_id, location_id)
            VALUES ('Raumklima ' || r.r_name, 'T-' || r.r_name, (r.mac_pfx || ':00:00:00:03')::macaddr, 'ONLINE', v_model_temp, v_bus_zigbee, r.r_id)
            RETURNING device_id INTO new_dev;
            INSERT INTO device_channel (device_id, channel_id, channel_number, description) VALUES 
            (new_dev, v_ch_ai01, 1, 'Temperatur');
        END IF;
    END LOOP;
    
END $$;