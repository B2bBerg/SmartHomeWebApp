-- =========================================================================================
-- INITIAL DATA: Datapoints
-- =========================================================================================

-- 1. Benötigte Datapoint Types sicherstellen (falls nicht vorhanden)
INSERT INTO datapoint_type (datapoint_type)
SELECT 'Schalter' WHERE NOT EXISTS (SELECT 1 FROM datapoint_type WHERE datapoint_type = 'Schalter');

INSERT INTO datapoint_type (datapoint_type)
SELECT 'Energie' WHERE NOT EXISTS (SELECT 1 FROM datapoint_type WHERE datapoint_type = 'Energie');

INSERT INTO datapoint_type (datapoint_type)
SELECT 'Leistung' WHERE NOT EXISTS (SELECT 1 FROM datapoint_type WHERE datapoint_type = 'Leistung');

INSERT INTO datapoint_type (datapoint_type)
SELECT 'Wassermenge' WHERE NOT EXISTS (SELECT 1 FROM datapoint_type WHERE datapoint_type = 'Wassermenge');

INSERT INTO datapoint_type (datapoint_type)
SELECT 'Wasserdurchfluss' WHERE NOT EXISTS (SELECT 1 FROM datapoint_type WHERE datapoint_type = 'Wasserdurchfluss');

-- 2. Benötigte Unit Types sicherstellen (falls nicht vorhanden)
INSERT INTO unit_type (unit_type)
SELECT 'None' WHERE NOT EXISTS (SELECT 1 FROM unit_type WHERE unit_type = 'None');

INSERT INTO unit_type (unit_type)
SELECT 'kWh' WHERE NOT EXISTS (SELECT 1 FROM unit_type WHERE unit_type = 'kWh');

INSERT INTO unit_type (unit_type)
SELECT 'W' WHERE NOT EXISTS (SELECT 1 FROM unit_type WHERE unit_type = 'W');

INSERT INTO unit_type (unit_type)
SELECT 'm³' WHERE NOT EXISTS (SELECT 1 FROM unit_type WHERE unit_type = 'm³');

INSERT INTO unit_type (unit_type)
SELECT 'l/h' WHERE NOT EXISTS (SELECT 1 FROM unit_type WHERE unit_type = 'l/h');

DO $$
DECLARE
    v_type_switch uuid;
    v_type_energy uuid; v_type_power uuid;
    v_type_volume uuid; v_type_flow uuid;

    v_unit_none uuid;
    v_unit_kwh uuid; v_unit_w uuid;
    v_unit_m3 uuid; v_unit_lh uuid;
    
    v_dev_shelly1 uuid; v_dev_shelly25 uuid; v_dev_hue uuid;
    v_dev_emeter uuid; v_dev_wmeter uuid;

    v_ch_s1_1 uuid; v_ch_s1_2 uuid;
    v_ch_s25_1 uuid; v_ch_s25_2 uuid; v_ch_s25_3 uuid; v_ch_s25_4 uuid;
    v_ch_hue_1 uuid;
    v_ch_em_1 uuid; v_ch_em_2 uuid;
    v_ch_wm_1 uuid; v_ch_wm_2 uuid;
BEGIN
    -- Referenz-IDs für Typen und Einheiten laden
    SELECT datapoint_type_id INTO v_type_switch FROM datapoint_type WHERE datapoint_type = 'Schalter' LIMIT 1;
    SELECT datapoint_type_id INTO v_type_energy FROM datapoint_type WHERE datapoint_type = 'Energie' LIMIT 1;
    SELECT datapoint_type_id INTO v_type_power FROM datapoint_type WHERE datapoint_type = 'Leistung' LIMIT 1;
    SELECT datapoint_type_id INTO v_type_volume FROM datapoint_type WHERE datapoint_type = 'Wassermenge' LIMIT 1;
    SELECT datapoint_type_id INTO v_type_flow FROM datapoint_type WHERE datapoint_type = 'Wasserdurchfluss' LIMIT 1;

    SELECT unit_type_id INTO v_unit_none FROM unit_type WHERE unit_type = 'None' LIMIT 1;
    SELECT unit_type_id INTO v_unit_kwh FROM unit_type WHERE unit_type = 'kWh' LIMIT 1;
    SELECT unit_type_id INTO v_unit_w FROM unit_type WHERE unit_type = 'W' LIMIT 1;
    SELECT unit_type_id INTO v_unit_m3 FROM unit_type WHERE unit_type = 'm³' LIMIT 1;
    SELECT unit_type_id INTO v_unit_lh FROM unit_type WHERE unit_type = 'l/h' LIMIT 1;

    -- Referenz-IDs der erstellten Devices (anhand der MAC-Adresse) laden
    SELECT device_id INTO v_dev_shelly1 FROM devices WHERE mac_address = 'E8:DB:84:12:34:56' LIMIT 1;
    SELECT device_id INTO v_dev_shelly25 FROM devices WHERE mac_address = 'E8:DB:84:65:43:21' LIMIT 1;
    SELECT device_id INTO v_dev_hue FROM devices WHERE mac_address = '00:17:88:01:02:03' LIMIT 1;
    SELECT device_id INTO v_dev_emeter FROM devices WHERE mac_address = 'E8:DB:84:99:88:77' LIMIT 1;
    SELECT device_id INTO v_dev_wmeter FROM devices WHERE mac_address = 'A4:C1:38:11:22:33' LIMIT 1;

    IF v_dev_shelly1 IS NULL OR v_dev_shelly25 IS NULL OR v_dev_hue IS NULL THEN
        RAISE NOTICE 'Abbruch: Mindestens ein Device wurde nicht gefunden. Bitte zuerst device.sql ausführen.';
        RETURN;
    END IF;

    -- Channel-IDs für Shelly 1 laden
    SELECT device_channel_id INTO v_ch_s1_1 FROM device_channel WHERE device_id = v_dev_shelly1 AND channel_number = 1;
    SELECT device_channel_id INTO v_ch_s1_2 FROM device_channel WHERE device_id = v_dev_shelly1 AND channel_number = 2;

    -- Channel-IDs für Shelly 2.5 laden
    SELECT device_channel_id INTO v_ch_s25_1 FROM device_channel WHERE device_id = v_dev_shelly25 AND channel_number = 1;
    SELECT device_channel_id INTO v_ch_s25_2 FROM device_channel WHERE device_id = v_dev_shelly25 AND channel_number = 2;
    SELECT device_channel_id INTO v_ch_s25_3 FROM device_channel WHERE device_id = v_dev_shelly25 AND channel_number = 3;
    SELECT device_channel_id INTO v_ch_s25_4 FROM device_channel WHERE device_id = v_dev_shelly25 AND channel_number = 4;

    -- Channel-IDs für Philips Hue laden
    SELECT device_channel_id INTO v_ch_hue_1 FROM device_channel WHERE device_id = v_dev_hue AND channel_number = 1;

    -- Channel-IDs für Stromzähler laden
    IF v_dev_emeter IS NOT NULL THEN
        SELECT device_channel_id INTO v_ch_em_1 FROM device_channel WHERE device_id = v_dev_emeter AND channel_number = 1;
        SELECT device_channel_id INTO v_ch_em_2 FROM device_channel WHERE device_id = v_dev_emeter AND channel_number = 2;
    END IF;

    -- Channel-IDs für Wasserzähler laden
    IF v_dev_wmeter IS NOT NULL THEN
        SELECT device_channel_id INTO v_ch_wm_1 FROM device_channel WHERE device_id = v_dev_wmeter AND channel_number = 1;
        SELECT device_channel_id INTO v_ch_wm_2 FROM device_channel WHERE device_id = v_dev_wmeter AND channel_number = 2;
    END IF;

    -- ==========================================
    -- DATAPOINTS: Shelly 1
    -- ==========================================
    IF v_ch_s1_1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_s1_1) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor)
        VALUES ('Licht Schalter (Relais)', v_ch_s1_1, v_type_switch, v_unit_none, true, false);
    END IF;
    IF v_ch_s1_2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_s1_2) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor)
        VALUES ('Wandschalter (Zustand)', v_ch_s1_2, v_type_switch, v_unit_none, false, true);
    END IF;

    -- ==========================================
    -- DATAPOINTS: Shelly 2.5
    -- ==========================================
    IF v_ch_s25_1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_s25_1) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor)
        VALUES ('Rollladen Motor Auf', v_ch_s25_1, v_type_switch, v_unit_none, true, false);
    END IF;
    IF v_ch_s25_2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_s25_2) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor)
        VALUES ('Rollladen Motor Ab', v_ch_s25_2, v_type_switch, v_unit_none, true, false);
    END IF;
    IF v_ch_s25_3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_s25_3) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor)
        VALUES ('Taster Auf (Eingang)', v_ch_s25_3, v_type_switch, v_unit_none, false, true);
    END IF;
    IF v_ch_s25_4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_s25_4) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor)
        VALUES ('Taster Ab (Eingang)', v_ch_s25_4, v_type_switch, v_unit_none, false, true);
    END IF;

    -- ==========================================
    -- DATAPOINTS: Philips Hue
    -- ==========================================
    IF v_ch_hue_1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_hue_1) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor)
        VALUES ('Hue Power Schalter', v_ch_hue_1, v_type_switch, v_unit_none, true, false);
    END IF;

    -- ==========================================
    -- DATAPOINTS: Stromzähler
    -- ==========================================
    IF v_ch_em_1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_em_1) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor, obis_code)
        VALUES ('Haus Stromverbrauch Gesamt', v_ch_em_1, v_type_energy, v_unit_kwh, false, true, '1-0:1.8.0');
    END IF;
    IF v_ch_em_2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_em_2) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor, obis_code)
        VALUES ('Haus Aktuelle Leistung', v_ch_em_2, v_type_power, v_unit_w, false, true, '1-0:16.7.0');
    END IF;

    -- ==========================================
    -- DATAPOINTS: Wasserzähler
    -- ==========================================
    IF v_ch_wm_1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_wm_1) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor, obis_code)
        VALUES ('Haus Wasserverbrauch Gesamt', v_ch_wm_1, v_type_volume, v_unit_m3, false, true, '8-0:1.0.0');
    END IF;
    IF v_ch_wm_2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM datapoint WHERE device_channel_id = v_ch_wm_2) THEN
        INSERT INTO datapoint (datapoint_name, device_channel_id, datapoint_type_id, unit_type_id, is_actuator, is_sensor, obis_code)
        VALUES ('Haus Aktueller Wasserdurchfluss', v_ch_wm_2, v_type_flow, v_unit_lh, false, true, '8-0:2.0.0');
    END IF;

    RAISE NOTICE 'Datapoints erfolgreich eingefügt.';
END $$;