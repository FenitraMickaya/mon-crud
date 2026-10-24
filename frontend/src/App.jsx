import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MdAdd } from 'react-icons/md'
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
} from './api/employeeApi.js'
import { EMPLOYEES_KEY, queryClient } from './utils/queryClients.js'
import { formatInteger } from './utils/format.js'
import EmployeeTable from './components/EmployeeTable.jsx'
import EmployeeModal from './components/EmployeeModal.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'

function SkeletonRows() {
  return (
    <div className="divide-y divide-gray-200">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <div className="h-3 w-8 animate-pulse rounded bg-gray-200" />
          <div className="h-3 flex-1 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [modal, setModal] = useState({ open: false, employee: null })
  const [serverError, setServerError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const {
    data: employees = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: fetchEmployees,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY })

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      invalidate()
      setModal({ open: false, employee: null })
      toast.success('Employé ajouté.')
    },
    onError: (err) => setServerError(err),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => updateEmployee(id, payload),
    onSuccess: () => {
      invalidate()
      setModal({ open: false, employee: null })
      toast.success('Fiche mise à jour.')
    },
    onError: (err) => setServerError(err),
  })

  // Suppression : la confirmation est demandée avant l'appel à l'API.
  const deleteMutation = useMutation({
    mutationFn: (employee) => deleteEmployee(employee.id),
    onSuccess: (_, employee) => {
      invalidate()
      setPendingDelete(null)
      toast.success(`« ${employee.name} » a été supprimé.`)
    },
    onError: (err) => {
      setPendingDelete(null)
      toast.error(err.message)
    },
  })

  const openCreate = () => {
    setServerError(null)
    setModal({ open: true, employee: null })
  }

  const openEdit = (employee) => {
    setServerError(null)
    setModal({ open: true, employee })
  }

  const closeModal = () => {
    setModal({ open: false, employee: null })
    setServerError(null)
  }

  const handleSubmit = (values) => {
    setServerError(null)

    if (modal.employee) {
      updateMutation.mutate({ id: modal.employee.id, ...values })
    } else {
      createMutation.mutate(values)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="min-h-screen bg-gray-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow"
      >
        Aller au contenu principal
      </a>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">CRUD</h1>
            <p className="mt-1 text-sm text-gray-600">
              Ajoutez, créez, modifiez et supprimez.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <MdAdd size={18} aria-hidden="true" />
            Ajouter un employé
          </button>
        </header>

        <main id="main" tabIndex={-1}>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-800">Liste des employés</h2>

              <p aria-live="polite" className="text-sm text-gray-500">
                {isPending
                  ? 'Chargement…'
                  : `${formatInteger(employees.length)} ${employees.length > 1 ? 'employés' : 'employé'}`}
              </p>
            </div>

            {isPending ? (
              <SkeletonRows />
            ) : isError ? (
              <div className="px-4 py-10 text-center">
                <p className="text-base font-semibold text-gray-800">
                  La liste n’a pas pu être chargée
                </p>
                <p className="mt-1 text-sm text-gray-600">{error.message}</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Réessayer
                </button>
              </div>
            ) : employees.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-base font-semibold text-gray-800">Aucun employé</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
                  Ajoutez votre premier employé pour remplir la liste.
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <MdAdd size={18} aria-hidden="true" />
                  Ajouter le premier employé
                </button>
              </div>
            ) : (
              <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
                <EmployeeTable
                  employees={employees}
                  onEdit={openEdit}
                  onDelete={(employee) => setPendingDelete(employee)}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      <EmployeeModal
        open={modal.open}
        employee={modal.employee}
        isSubmitting={isSubmitting}
        serverError={serverError}
        onClose={closeModal}
        onFieldChange={() => setServerError(null)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Supprimer cet employé ?"
        message={
          pendingDelete
            ? `La fiche de ${pendingDelete.name} sera définitivement supprimée. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isBusy={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
