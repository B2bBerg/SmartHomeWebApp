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
    
    v_bus_wifi uuid;
    v_bus_zigbee uuid;
    
    v_model_shelly1 uuid;
    v_model_shelly25 uuid;
    v_model_hue uuid;
    v_model_emeter uuid;
    v_model_wmeter uuid;
    
    v_dev_shelly1 uuid;
    v_dev_shelly25 uuid;
    v_dev_hue uuid;
    v_dev_emeter uuid;
    v_dev_wmeter uuid;
    
    v_ch_do01 uuid;
    v_ch_do02 uuid;
    v_ch_di01 uuid;
    v_ch_di02 uuid;
    v_ch_ai01 uuid;
    v_ch_ai02 uuid;
BEGIN
    -- 2. Standorte laden (Erstellt durch location.sql)
    SELECT location_id INTO v_wohn_id FROM location WHERE location_name = 'Wohnzimmer' LIMIT 1;
    SELECT location_id INTO v_technik_id FROM location WHERE location_name = 'Technikraum' LIMIT 1;
    
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
    
    -- Modelle für Zähler suchen oder anlegen
    SELECT model_type_id INTO v_model_emeter FROM model_type WHERE model_name = 'Shelly 3EM' LIMIT 1;
    IF v_model_emeter IS NULL THEN
        INSERT INTO model_type (model_name, manufacturer_id) 
        SELECT 'Shelly 3EM', manufacturer_id FROM manufacturer WHERE manufacturer_name = 'Shelly' LIMIT 1
        RETURNING model_type_id INTO v_model_emeter;
    END IF;

    SELECT model_type_id INTO v_model_wmeter FROM model_type WHERE model_name = 'Smart Water Meter' LIMIT 1;
    IF v_model_wmeter IS NULL THEN
        INSERT INTO model_type (model_name, manufacturer_id) 
        SELECT 'Smart Water Meter', manufacturer_id FROM manufacturer LIMIT 1
        RETURNING model_type_id INTO v_model_wmeter;
    END IF;

    -- 5. Referenz-IDs für Kanal-Typen auflösen (aus channelType.sql)
    SELECT channel_id INTO v_ch_do01 FROM channel_type WHERE channel_name = 'DO_01';
    SELECT channel_id INTO v_ch_do02 FROM channel_type WHERE channel_name = 'DO_02';
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

END $$;