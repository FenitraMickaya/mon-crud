const express = require('express')

import {getAllEmployee , getEmployee, updateEmployee, createEmployee, deleteEmployee} from '../controllers/employeeControllers.js'

const router = express.Router()

router.post("/", createEmployee);
router.get("/", getAllEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);
router.get('/:id',getEmployee);

export default router;
