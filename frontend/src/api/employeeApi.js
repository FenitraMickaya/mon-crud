import { EMPLOYEE_ENDPOINT } from './config.js'

/**
 * Erreur d'API : porte le message lisible renvoyé par le serveur
 * et, pour les erreurs de validation, le détail par champ.
 */
export class ApiError extends Error {
  constructor(message, { status, fields } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields ?? {}
  }
}

async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${EMPLOYEE_ENDPOINT}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new ApiError("Impossible de joindre le serveur. Vérifiez que l'API est démarrée.", {
      status: 0,
    })
  }

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiError(payload?.error ?? "La requête a échoué.", {
      status: response.status,
      fields: payload?.fields,
    })
  }

  return payload
}

export const fetchEmployees = () => request('')

export const createEmployee = (payload) =>
  request('', { method: 'POST', body: JSON.stringify(payload) })

export const updateEmployee = (id, payload) =>
  request(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const deleteEmployee = (id) => request(`/${id}`, { method: 'DELETE' })
