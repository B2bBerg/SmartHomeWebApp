-- =========================================================================================
-- INITIAL DATA: OBIS Definitions (Smart Metering)
-- =========================================================================================
INSERT INTO obis_definition (obis_code, name, medium, description, default_type_id, default_unit_id)
SELECT v.obis_code, v.name, v.medium, v.description, dt.datapoint_type_id, ut.unit_type_id
FROM (VALUES 
    -- ⚡ Strom: Energie (Bezug)
    ('1-0:1.8.0', 'Wirkenergie Bezug Total', 'Strom', 'Gesamter Strombezug aus dem Netz', 'Energie', 'kWh'),
    ('1-0:1.8.1', 'Wirkenergie Bezug (Tarif 1)', 'Strom', 'Strombezug im Hochtarif (HT)', 'Energie', 'kWh'),
    ('1-0:1.8.2', 'Wirkenergie Bezug (Tarif 2)', 'Strom', 'Strombezug im Niedertarif (NT)', 'Energie', 'kWh'),
    ('1-0:1.9.0', 'Wirkenergie Bezug Vorschub', 'Strom', 'Wirkenergie Bezug fortlaufend (tariflos)', 'Energie', 'kWh'),
    
    -- ⚡ Strom: Energie (Lieferung)
    ('1-0:2.8.0', 'Wirkenergie Lieferung Total', 'Strom', 'Gesamte Stromeinspeisung ins Netz', 'Energie', 'kWh'),
    ('1-0:2.8.1', 'Wirkenergie Lieferung (Tarif 1)', 'Strom', 'Stromeinspeisung im Hochtarif (HT)', 'Energie', 'kWh'),
    ('1-0:2.8.2', 'Wirkenergie Lieferung (Tarif 2)', 'Strom', 'Stromeinspeisung im Niedertarif (NT)', 'Energie', 'kWh'),
    ('1-0:2.9.0', 'Wirkenergie Lieferung Vorschub', 'Strom', 'Wirkenergie Lieferung fortlaufend (tariflos)', 'Energie', 'kWh'),
    
    -- ⚡ Strom: Leistung (Momentanwerte)
    ('1-0:16.7.0', 'Wirkleistung aktuell Total', 'Strom', 'Aktuelle Gesamtleistung über alle Phasen', 'Leistung', 'W'),
    ('1-0:1.7.0', 'Wirkleistung Bezug aktuell', 'Strom', 'Aktueller Gesamtbezug aus dem Netz', 'Leistung', 'W'),
    ('1-0:2.7.0', 'Wirkleistung Lieferung aktuell', 'Strom', 'Aktuelle Gesamteinspeisung ins Netz', 'Leistung', 'W'),
    
    -- ⚡ Strom: Leistungsmaximum (Peak)
    ('1-0:1.6.0', 'Wirkleistung Bezug Maximum', 'Strom', 'Maximal bezogene Leistung', 'Leistung', 'W'),
    ('1-0:2.6.0', 'Wirkleistung Lieferung Maximum', 'Strom', 'Maximal gelieferte Leistung', 'Leistung', 'W'),

    -- ⚡ Strom: Leistung pro Phase
    ('1-0:36.7.0', 'Wirkleistung aktuell L1', 'Strom', 'Aktuelle Leistung auf Phase 1', 'Leistung', 'W'),
    ('1-0:56.7.0', 'Wirkleistung aktuell L2', 'Strom', 'Aktuelle Leistung auf Phase 2', 'Leistung', 'W'),
    ('1-0:76.7.0', 'Wirkleistung aktuell L3', 'Strom', 'Aktuelle Leistung auf Phase 3', 'Leistung', 'W'),
    ('1-0:21.7.0', 'Wirkleistung Bezug L1', 'Strom', 'Aktueller Bezug auf Phase 1', 'Leistung', 'W'),
    ('1-0:41.7.0', 'Wirkleistung Bezug L2', 'Strom', 'Aktueller Bezug auf Phase 2', 'Leistung', 'W'),
    ('1-0:61.7.0', 'Wirkleistung Bezug L3', 'Strom', 'Aktueller Bezug auf Phase 3', 'Leistung', 'W'),
    ('1-0:22.7.0', 'Wirkleistung Lieferung L1', 'Strom', 'Aktuelle Lieferung auf Phase 1', 'Leistung', 'W'),
    ('1-0:42.7.0', 'Wirkleistung Lieferung L2', 'Strom', 'Aktuelle Lieferung auf Phase 2', 'Leistung', 'W'),
    ('1-0:62.7.0', 'Wirkleistung Lieferung L3', 'Strom', 'Aktuelle Lieferung auf Phase 3', 'Leistung', 'W'),
    
    -- ⚡ Strom: Netzqualität (Spannung)
    ('1-0:32.7.0', 'Spannung L1', 'Strom', 'Aktuelle Spannung auf Phase 1', 'Spannung', 'V'),
    ('1-0:52.7.0', 'Spannung L2', 'Strom', 'Aktuelle Spannung auf Phase 2', 'Spannung', 'V'),
    ('1-0:72.7.0', 'Spannung L3', 'Strom', 'Aktuelle Spannung auf Phase 3', 'Spannung', 'V'),
    
    -- ⚡ Strom: Netzqualität (Stromstärke)
    ('1-0:31.7.0', 'Stromstärke L1', 'Strom', 'Aktuelle Stromstärke auf Phase 1', 'Stromstärke', 'A'),
    ('1-0:51.7.0', 'Stromstärke L2', 'Strom', 'Aktuelle Stromstärke auf Phase 2', 'Stromstärke', 'A'),
    ('1-0:71.7.0', 'Stromstärke L3', 'Strom', 'Aktuelle Stromstärke auf Phase 3', 'Stromstärke', 'A'),
    
    -- 💧 Wasser
    ('8-0:1.0.0', 'Wasser Volumen Total', 'Wasser', 'Gesamter Wasserverbrauch', 'Wassermenge', 'm³'),
    ('8-0:2.0.0', 'Wasserdurchfluss', 'Wasser', 'Aktueller Wasserdurchfluss', 'Wasserdurchfluss', 'l/h'),
    
    -- 🔥 Wärme / Kälte (Wärmemengenzähler)
    ('6-0:1.8.0', 'Wärmeenergie Bezug', 'Wärme', 'Bezogene Wärmeenergie', 'Energie', 'kWh'),
    ('6-0:2.8.0', 'Kälteenergie Bezug', 'Kälte', 'Bezogene Kälteenergie', 'Energie', 'kWh'),
    ('6-0:1.4.0', 'Aktuelle Wärmeleistung', 'Wärme', 'Momentane Wärmeleistung', 'Leistung', 'kW'),
    ('6-0:29.2.0', 'Vorlauftemperatur', 'Wärme', 'Temperatur des Vorlaufs', 'Temperatur', '°C'),
    ('6-0:29.3.0', 'Rücklauftemperatur', 'Wärme', 'Temperatur des Rücklaufs', 'Temperatur', '°C'),
    
    -- 💨 Gas
    ('7-0:3.2.0', 'Gas Energie', 'Gas', 'Bezug Gasenergie', 'Energie', 'kWh')
) AS v(obis_code, name, medium, description, dp_type, u_type)
JOIN datapoint_type dt ON dt.datapoint_type = v.dp_type
JOIN unit_type ut ON ut.unit_type = v.u_type;