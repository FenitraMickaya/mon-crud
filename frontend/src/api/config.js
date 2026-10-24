/**
 * Configuration de l'API.
 *
 * En développement, Vite redirige /api vers le backend (voir vite.config.js).
 * En production, définir VITE_API_URL pour pointer vers l'API déployée.
 */
const base = import.meta.env.VITE_API_URL ?? '/api'

export const EMPLOYEE_ENDPOINT = `${base}/employee`

/** Rôles acceptés par l'enum PostgreSQL `role_type`. */
export const ROLES = ['Developer', 'Manager', 'Sales', 'Admin', 'Intern']

/** Libellés français affichés à l'utilisateur. */
export const ROLE_LABELS = {
  Developer: 'Développeur',
  Manager: 'Manager',
  Sales: 'Commercial',
  Admin: 'Administrateur',
  Intern: 'Stagiaire',
}

export const roleLabel = (role) => ROLE_LABELS[role] ?? role
