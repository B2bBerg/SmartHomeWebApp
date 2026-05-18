-- =========================================================================================
-- INITIAL DATA: Datapoint Types
-- =========================================================================================
INSERT INTO datapoint_type (datapoint_type)
VALUES 
    -- Klima & Luft
    ('Temperatur'), ('Luftfeuchtigkeit'), ('CO2'), ('VOC'), ('Luftqualität'), ('Druck'),
    
    -- Licht & Beleuchtung
    ('Helligkeit'), ('Dimmer'), ('Farbtemperatur'), ('Farbe'),
    
    -- Sicherheit & Zustand
    ('Präsenz'), ('Kontakt'), ('Zustand'), ('Alarm'),
    
    -- Energie & Elektrik
    ('Leistung'), ('Energie'), ('Spannung'), ('Stromstärke'), ('Batteriestand'),
    
    -- Wasser & Sanitär
    ('Wasserdurchfluss'), ('Wassermenge'),
    
    -- Wetter & Außenbereich
    ('Windgeschwindigkeit'), ('Windrichtung'), ('Regen'), ('Niederschlagsmenge'),
    ('UV-Index'), ('Sonneneinstrahlung'), ('Bodenfeuchtigkeit'), ('Taupunkt'),
    
    -- Steuerung & Aktoren
    ('Schalter'), ('Ventilposition'), ('Lautstärke');