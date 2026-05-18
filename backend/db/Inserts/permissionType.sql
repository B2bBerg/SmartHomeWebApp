-- =========================================================================================
-- INITIAL DATA: Permission Types
-- =========================================================================================
INSERT INTO permission_type (name, description)
VALUES 
    ('Admin', 'Vollzugriff auf das gesamte System, inklusive Konfiguration und Benutzerverwaltung'),
    ('Bewohner', 'Standardzugriff: Kann Geräte steuern, Dashboards anpassen und Regeln konfigurieren'),
    ('Gast', 'Eingeschränkter Zugriff: Kann nur freigegebene Geräte steuern, hat aber keine Konfigurationsrechte'),
    ('Read-Only', 'Nur-Lese-Zugriff: Kann Dashboards, Sensordaten und Kamerastreams ansehen, aber nichts steuern');