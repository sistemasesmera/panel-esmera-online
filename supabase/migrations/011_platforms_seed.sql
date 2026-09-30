-- Add EvolCampus and ADR platforms (only if they don't already exist)
INSERT INTO platforms (name)
SELECT name FROM (VALUES ('EvolCampus'), ('ADR')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM platforms WHERE platforms.name = v.name);
