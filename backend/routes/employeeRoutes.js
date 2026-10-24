import express from 'express'
import {
  getAllEmployee,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employeeControllers.js'

const router = express.Router()

router.get('/', getAllEmployee)
router.post('/', createEmployee)
router.get('/:id', getEmployee)
router.put('/:id', updateEmployee)
router.delete('/:id', deleteEmployee)

export default router
