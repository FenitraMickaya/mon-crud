import { query } from '../utils/connectDB.js'
import { ensureSchema } from '../utils/schema.js'
import {
  getAllEmployeeQuery,
  getEmployeeQuery,
  createEmployeeQuery,
  updateEmployeeQuery,
  deleteEmployeeQuery,
  ROLES,
} from '../utils/sqlQuery.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Valide les données d'un employé.
 * @returns {{ values: object, errors: Record<string,string> }}
 */
function validate({ name, email, age, salary, role }, { partial = false } = {}) {
  const errors = {}
  const values = {}

  if (!partial || name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (!trimmed) {
      if (!partial) errors.name = 'Le nom est obligatoire.'
    } else if (trimmed.length > 50) {
      errors.name = 'Le nom ne peut pas dépasser 50 caractères.'
    } else {
      values.name = trimmed
    }
  }

  if (!partial || email !== undefined) {
    const trimmed = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!trimmed) {
      if (!partial) errors.email = "L'adresse email est obligatoire."
    } else if (!EMAIL_RE.test(trimmed)) {
      errors.email = "L'adresse email n'est pas valide."
    } else if (trimmed.length > 50) {
      errors.email = "L'adresse email ne peut pas dépasser 50 caractères."
    } else {
      values.email = trimmed
    }
  }

  if (!partial || age !== undefined) {
    const parsed = Number(age)
    if (age === undefined || age === null || age === '') {
      if (!partial) errors.age = "L'âge est obligatoire."
    } else if (!Number.isInteger(parsed)) {
      errors.age = "L'âge doit être un nombre entier."
    } else if (parsed <= 18) {
      errors.age = "L'âge doit être supérieur à 18 ans."
    } else {
      values.age = parsed
    }
  }

  if (!partial || salary !== undefined) {
    const parsed = Number(salary)
    if (salary === undefined || salary === null || salary === '') {
      if (!partial) errors.salary = 'Le salaire est obligatoire.'
    } else if (!Number.isFinite(parsed)) {
      errors.salary = 'Le salaire doit être un nombre.'
    } else if (parsed < 0) {
      errors.salary = 'Le salaire ne peut pas être négatif.'
    } else {
      values.salary = parsed
    }
  }

  if (role !== undefined && role !== null && role !== '') {
    if (!ROLES.includes(role)) {
      errors.role = `Le rôle doit être l'un des suivants : ${ROLES.join(', ')}.`
    } else {
      values.role = role
    }
  } else if (!partial) {
    values.role = 'Intern'
  }

  return { values, errors }
}

const getAllEmployee = async (req, res, next) => {
  try {
    await ensureSchema()
    const { rows } = await query(getAllEmployeeQuery)
    res.json(rows)
  } catch (error) {
    next(error)
  }
}

const getEmployee = async (req, res, next) => {
  try {
    await ensureSchema()
    const { rows } = await query(getEmployeeQuery, [req.params.id])

    if (!rows.length) {
      return res.status(404).json({ error: 'Employé introuvable.' })
    }
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
}

const createEmployee = async (req, res, next) => {
  try {
    await ensureSchema()

    const { values, errors } = validate(req.body ?? {})
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Données invalides.', fields: errors })
    }

    const { rows } = await query(createEmployeeQuery, [
      values.name,
      values.email,
      values.age,
      values.salary,
      values.role,
    ])

    res.status(201).json(rows[0])
  } catch (error) {
    next(error)
  }
}

const updateEmployee = async (req, res, next) => {
  try {
    await ensureSchema()

    const body = req.body ?? {}
    const { values, errors } = validate(body, { partial: true })

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Données invalides.', fields: errors })
    }

    if (Object.keys(values).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' })
    }

    const { rows, rowCount } = await query(updateEmployeeQuery, [
      values.name ?? null,
      values.email ?? null,
      values.age ?? null,
      values.salary ?? null,
      values.role ?? null,
      req.params.id,
    ])

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Employé introuvable.' })
    }

    res.json(rows[0])
  } catch (error) {
    next(error)
  }
}

const deleteEmployee = async (req, res, next) => {
  try {
    await ensureSchema()

    const { rowCount } = await query(deleteEmployeeQuery, [req.params.id])

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Employé introuvable.' })
    }

    res.json({ message: 'Employé supprimé.' })
  } catch (error) {
    next(error)
  }
}

export { getAllEmployee, getEmployee, createEmployee, updateEmployee, deleteEmployee }
