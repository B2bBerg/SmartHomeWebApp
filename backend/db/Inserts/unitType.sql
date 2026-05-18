-- =========================================================================================
-- INITIAL DATA: Unit Types
-- =========================================================================================
INSERT INTO unit_type (unit_type)
VALUES 
    -- Prozentuales & Konzentration (Feuchtigkeit, Batterie, Ventile, Luftqualität)
    ('%'), ('ppm'), ('ppb'), ('µg/m³'),
    
    -- Temperatur & Klima
    ('°C'), ('°F'), ('K'),
    
    -- Energie & Elektrik
    ('W'), ('kW'), ('MW'), ('Wh'), ('kWh'), ('MWh'), ('V'), ('kV'), ('A'), ('mA'), ('VA'), ('kVA'), ('var'), ('kvar'), ('Hz'),
    
    -- Licht & Akustik
    ('lux'), ('lm'), ('cd'), ('dB'), ('dBA'),
    
    -- Wasser, Flüssigkeiten & Volumen
    ('l'), ('l/min'), ('l/h'), ('m³'), ('m³/h'),
    
    -- Wetter, Wind & Druck
    ('km/h'), ('m/s'), ('mph'), ('kn'), ('mm'), ('mm/h'), ('Pa'), ('hPa'), ('kPa'), ('bar'), ('mbar'), ('psi'), ('°'),
    
    -- Zeit & Dauer
    ('ms'), ('s'), ('min'), ('h'), ('d'),
    
    -- Daten & Netzwerk
    ('bps'), ('Kbps'), ('Mbps'), ('B'), ('KB'), ('MB'), ('GB'),
    
    -- Gewicht & Masse
    ('mg'), ('g'), ('kg'), ('t');