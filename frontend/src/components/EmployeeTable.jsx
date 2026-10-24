import { MdEdit, MdDelete } from 'react-icons/md'
import { roleLabel } from '../api/config.js'
import { formatEuro } from '../utils/format.js'

function ActionButtons({ employee, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(employee)}
        aria-label={`Modifier ${employee.name}`}
        title={`Modifier ${employee.name}`}
        className="rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600"
      >
        <MdEdit size={18} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onDelete(employee)}
        aria-label={`Supprimer ${employee.name}`}
        title={`Supprimer ${employee.name}`}
        className="rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <MdDelete size={18} aria-hidden="true" />
      </button>
    </div>
  )
}


export default function EmployeeTable({ employees, onEdit, onDelete }) {
  return (
    <>
      {/* — Table (≥ 640 px) — */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                ID
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Nom
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Email
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Âge
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Rôle
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Salaire
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="transition-colors hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{employee.id}</td>

                <td className="px-4 py-3 font-medium text-gray-800">{employee.name}</td>

                <td className="px-4 py-3 text-gray-600">{employee.email}</td>

                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {employee.age}
                </td>

                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {roleLabel(employee.role)}
                  </span>
                </td>

                <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-800">
                  {formatEuro(employee.salary)}
                </td>

                <td className="px-4 py-3">
                  <ActionButtons employee={employee} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* — Liste de fiches (< 640 px) — */}
      <ul className="divide-y divide-gray-200 sm:hidden">
        {employees.map((employee) => (
          <li key={employee.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Réf. {employee.id}</p>
                <p className="truncate text-sm font-medium text-gray-800">{employee.name}</p>
                <p className="truncate text-sm text-gray-600">{employee.email}</p>
              </div>

              <ActionButtons employee={employee} onEdit={onEdit} onDelete={onDelete} />
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {roleLabel(employee.role)}
                </span>
                <span className="text-xs tabular-nums text-gray-500">{employee.age} ans</span>
              </div>

              <span className="text-sm font-medium tabular-nums text-gray-800">
                {formatEuro(employee.salary)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
