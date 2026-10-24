-- Jeu de données de démonstration (idempotent).
-- Usage : npm run db:seed

INSERT INTO employee_details (name, email, age, role, salary)
VALUES
  ('Fenitra',  'fenri@example.com',    28, 'Developer', 3200),
  ('Nanoa',    'nanoa@example.com',    19, 'Intern',       0),
  ('Test',     'test@example.com',     19, 'Sales',     2800),
  ('Tiasoa',   'tiasoa@example.com',   22, 'Intern',       0),
  ('Navalona', 'navalona@example.com', 22, 'Manager',   4200),
  ('Veronica', 'veronica@example.com', 31, 'Admin',    5100)
ON CONFLICT (email) DO NOTHING;
