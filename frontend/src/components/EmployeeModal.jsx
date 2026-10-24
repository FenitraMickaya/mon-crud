import { useEffect, useRef, useState } from 'react'
import { ROLES, roleLabel } from '../api/config.js'

const EMPTY = { name: '', email: '', age: '', salary: '', role: 'Intern' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Validation client, alignée sur celle du serveur. */
function validateField(field, value) {
  const trimmed = typeof value === 'string' ? value.trim() : ''

  switch (field) {
    case 'name':
      if (!trimmed) return 'Le nom est obligatoire.'
      if (trimmed.length > 50) return 'Le nom ne peut pas dépasser 50 caractères.'
      return null
    case 'email':
      if (!trimmed) return "L'adresse email est obligatoire."
      if (!EMAIL_RE.test(trimmed)) return "L'adresse email n'est pas valide."
      return null
    case 'age':
      if (trimmed === '') return "L'âge est obligatoire."
      if (!Number.isInteger(Number(trimmed))) return "L'âge doit être un nombre entier."
      if (Number(trimmed) <= 18) return "L'âge doit être supérieur à 18 ans."
      return null
    case 'salary':
      if (trimmed === '') return 'Le salaire est obligatoire.'
      if (!Number.isFinite(Number(trimmed))) return 'Le salaire doit être un nombre.'
      if (Number(trimmed) < 0) return 'Le salaire ne peut pas être négatif.'
      return null
    default:
      return null
  }
}

const toForm = (employee) => ({
  name: employee?.name ?? '',
  email: employee?.email ?? '',
  age: String(employee?.age ?? ''),
  salary: String(employee?.salary ?? ''),
  role: employee?.role ?? 'Intern',
})

/**
 * Emplacement du message d'erreur d'un champ.
 * La hauteur est réservée en permanence : sans cela, l'apparition du message
 * décale la mise en page et le bouton d'enregistrement bouge entre le
 * mousedown et le mouseup — le clic est alors perdu.
 */
function FieldError({ id, message }) {
  return (
    <p id={id} className="mt-1 min-h-[1.25rem] text-sm text-red-600">
      {message ?? ''}
    </p>
  )
}

/**
 * Modale de saisie d'un employé.
 * Utilise l'élément <dialog> natif : piège de focus, touche Échap et
 * arrière-plan inerte sont fournis par le navigateur.
 */
export default function EmployeeModal({
  open,
  employee,
  isSubmitting,
  serverError,
  onClose,
  onSubmit,
  onFieldChange,
}) {
  const dialogRef = useRef(null)
  const nameRef = useRef(null)

  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formId, setFormId] = useState(null)

  const isEdit = Boolean(employee)

  // Réinitialise le formulaire à l'ouverture (et à la fermeture).
  // Ajustement d'état pendant le rendu : pattern React recommandé.
  const targetId = open ? (employee?.id ?? 'nouveau') : null
  if (targetId !== formId) {
    setFormId(targetId)
    setValues(targetId === null ? EMPTY : toForm(employee))
    setErrors({})
  }

  // Ouverture et fermeture du <dialog> : manipulation du DOM uniquement.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      requestAnimationFrame(() => nameRef.current?.focus())
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Les erreurs renvoyées par le serveur complètent celles du client.
  const displayedErrors = { ...errors, ...(serverError?.fields ?? {}) }

  const handleChange = (event) => {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    onFieldChange?.()

    // On ne revalide que si le champ a déjà été signalé.
    if (displayedErrors[name]) {
      const message = validateField(name, value)
      setErrors((previous) => ({ ...previous, [name]: message }))
    }
  }

  const handleBlur = (event) => {
    const { name, value } = event.target
    const message = validateField(name, value)
    setErrors((previous) => ({ ...previous, [name]: message }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}
    for (const field of ['name', 'email', 'age', 'salary']) {
      const message = validateField(field, values[field])
      if (message) nextErrors[field] = message
    }
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      // Le focus va sur le premier champ invalide : on le cible par son id,
      // le DOM n'ayant pas encore reflété aria-invalid à cet instant.
      const firstInvalid = ['name', 'email', 'age', 'salary'].find((field) => nextErrors[field])
      document.getElementById(`employee-${firstInvalid}`)?.focus()
      return
    }

    onSubmit({
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      age: Number(values.age),
      salary: Number(values.salary),
      role: values.role || 'Intern',
    })
  }

  const fieldClass = (name) =>
    `w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 ${
      displayedErrors[name] ? 'border-red-400' : 'border-gray-300'
    }`

  const fieldProps = (name) => ({
    id: `employee-${name}`,
    name,
    value: values[name],
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': displayedErrors[name] ? 'true' : undefined,
    'aria-describedby': displayedErrors[name] ? `employee-${name}-error` : undefined,
    className: fieldClass(name),
  })

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="employee-dialog-title"
      className="m-auto max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-lg bg-white p-0 text-gray-800 shadow-xl"
    >
      <form onSubmit={handleSubmit} noValidate>
        <header className="border-b border-gray-200 px-6 py-4">
          <h2 id="employee-dialog-title" className="text-lg font-semibold text-gray-800">
            {isEdit ? `Modifier ${employee.name}` : 'Ajouter un employé'}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {isEdit
              ? 'Laissez un champ vide pour conserver sa valeur actuelle.'
              : 'Les champs marqués d’un astérisque sont obligatoires.'}
          </p>
        </header>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="employee-name" className="mb-1 block text-sm font-medium text-gray-700">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              {...fieldProps('name')}
              ref={nameRef}
              type="text"
              autoComplete="name"
              maxLength={50}
              required
            />
            <FieldError id="employee-name-error" message={displayedErrors.name} />
          </div>

          <div>
            <label htmlFor="employee-email" className="mb-1 block text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              {...fieldProps('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={50}
              required
            />
            <FieldError id="employee-email-error" message={displayedErrors.email} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="employee-age" className="mb-1 block text-sm font-medium text-gray-700">
                Âge <span className="text-red-500">*</span>
              </label>
              <input
                {...fieldProps('age')}
                type="number"
                inputMode="numeric"
                min={19}
                required
              />
              <FieldError id="employee-age-error" message={displayedErrors.age} />
            </div>

            <div>
              <label htmlFor="employee-salary" className="mb-1 block text-sm font-medium text-gray-700">
                Salaire mensuel <span className="text-red-500">*</span>
              </label>
              <input
                {...fieldProps('salary')}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                required
              />
              <FieldError id="employee-salary-error" message={displayedErrors.salary} />
            </div>
          </div>

          <div>
            <label htmlFor="employee-role" className="mb-1 block text-sm font-medium text-gray-700">
              Rôle
            </label>
            <select {...fieldProps('role')} className={`${fieldClass('role')} bg-white`}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <FieldError id="employee-role-error" message={displayedErrors.role} />
          </div>

          {serverError && !serverError.fields && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError.message}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
