-- =========================================================================================
-- INITIAL DATA: Channel Types (IOs)
-- =========================================================================================
INSERT INTO channel_type (channel_name, description)
SELECT 
    prefix || '_' || LPAD(n::text, 2, '0'),
    CASE prefix 
        WHEN 'DI' THEN 'Digital Input ' || n
        WHEN 'DO' THEN 'Digital Output ' || n
        WHEN 'AI' THEN 'Analog Input ' || n
        WHEN 'AO' THEN 'Analog Output ' || n
    END
FROM unnest(ARRAY['DI', 'DO', 'AI', 'AO']) AS prefix
CROSS JOIN generate_series(1, 48) AS n
WHERE NOT (prefix IN ('AI', 'AO') AND n > 8);