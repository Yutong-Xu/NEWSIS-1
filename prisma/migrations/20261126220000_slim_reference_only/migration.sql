-- slim schema: simulation write operations move to browser localStorage.
-- the database keeps only fixed reference data, accounts, and sessions.
DROP TABLE IF EXISTS "PlanItem";
DROP TABLE IF EXISTS "Plan";
DROP TABLE IF EXISTS "Candidate";
DROP TABLE IF EXISTS "RegistrationItem";
DROP TABLE IF EXISTS "Registration";
DROP TABLE IF EXISTS "Enrollment";
