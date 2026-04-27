INSERT INTO professionals (name, specialty, email, phone)
SELECT 'Dione Melo', 'Odontologia', '', ''
WHERE NOT EXISTS (SELECT 1 FROM professionals WHERE name = 'Dione Melo');

INSERT INTO professionals (name, specialty, email, phone)
SELECT 'Juliano Borelli', 'Odontologia', '', ''
WHERE NOT EXISTS (SELECT 1 FROM professionals WHERE name = 'Juliano Borelli');
