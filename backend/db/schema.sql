-- Schéma de la base « mon_crud »
-- Source de vérité unique : appliquée par `npm run db:init` et par utils/schema.js
-- Idempotent : peut être rejoué sans effet de bord.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    CREATE TYPE role_type AS ENUM('Developer', 'Manager', 'Sales', 'Admin', 'Intern');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS employee_details (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,
  email       VARCHAR(50)  NOT NULL UNIQUE,
  age         SMALLINT     NOT NULL CHECK (age > 18),
  role        role_type    NOT NULL DEFAULT 'Intern',
  salary      DECIMAL(8, 2) NOT NULL CHECK (salary >= 0)
);

CREATE INDEX IF NOT EXISTS idx_employee_details_name ON employee_details (name);
CREATE INDEX IF NOT EXISTS idx_employee_details_role ON employee_details (role);
