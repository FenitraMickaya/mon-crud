export const getAllEmployeeQuery = `
  SELECT * FROM employee_details
  ORDER BY id
`

export const getEmployeeQuery = `
  SELECT * FROM employee_details
  WHERE id = $1
`

export const createEmployeeQuery = `
  INSERT INTO employee_details (name, email, age, salary, role)
  VALUES (
    $1,
    $2,
    $3,
    $4,
    COALESCE($5::role_type, 'Intern'::role_type)
  )
  RETURNING *
`

export const updateEmployeeQuery = `
  UPDATE employee_details
  SET
    name   = COALESCE($1, name),
    email  = COALESCE($2, email),
    age    = COALESCE($3, age),
    salary = COALESCE($4, salary),
    role   = COALESCE($5::role_type, role)
  WHERE id = $6
  RETURNING *
`

export const deleteEmployeeQuery = `
  DELETE FROM employee_details
  WHERE id = $1
  RETURNING *
`

/** Rôles acceptés par l'enum PostgreSQL `role_type`. */
export const ROLES = ['Developer', 'Manager', 'Sales', 'Admin', 'Intern']
