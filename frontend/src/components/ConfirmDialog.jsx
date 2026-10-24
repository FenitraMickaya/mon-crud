import { useEffect, useRef } from 'react'

/**
 * Fenêtre de confirmation d'une action destructive.
 * Utilise l'élément <dialog> natif : piège de focus, touche Échap et
 * arrière-plan inerte sont fournis par le navigateur.
 */
export default function ConfirmDialog({
  open,
  title = 'Confirmer la suppression',
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  isBusy = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      // Le focus part sur l'option prudente, pas sur la destructive.
      requestAnimationFrame(() => cancelRef.current?.focus())
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onCancel={onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg bg-white p-0 text-gray-800 shadow-xl"
    >
      <div className="px-6 py-5">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-800">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm text-gray-600">
          {message}
        </p>
      </div>

      <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
        <button
          type="button"
          ref={cancelRef}
          onClick={() => dialogRef.current?.close()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isBusy}
          aria-busy={isBusy}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? 'Suppression…' : confirmLabel}
        </button>
      </footer>
    </dialog>
  )
}
