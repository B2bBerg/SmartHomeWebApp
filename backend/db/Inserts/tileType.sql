-- =========================================================================================
-- INITIAL DATA: Tile Types
-- =========================================================================================
INSERT INTO tile_type (name, description, default_col_span, default_row_span)
VALUES 
    ('Switch', 'Ein/Aus Schalter (z.B. für Lampen, Steckdosen)', 1, 1),
    ('Graph', 'Zeitreihendiagramm für historische Daten', 2, 2),
    ('Value', 'Aktueller Wert (einfache numerische oder textuelle Anzeige)', 1, 1)
    
    /* Weitere geplante Kachel-Typen (vorerst auskommentiert):
    ,('Slider', 'Schieberegler (z.B. für Dimmer, Lautstärke)', 2, 1)
    ,('Gauge', 'Rundinstrument (z.B. für aktuelle Leistung, Luftfeuchtigkeit)', 1, 1)
    ,('ColorPicker', 'RGB-Farbwähler für Lampen', 1, 1)
    ,('Thermostat', 'Spezifisches Steuerungs-UI für Raumklima', 2, 2)
    ,('Camera', 'Live-Videostream für Überwachungskameras', 2, 2)
    */;