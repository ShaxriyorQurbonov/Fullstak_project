import express from 'express';
import {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
} from '../controllers/patientController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All patient routes require authentication
router.use(authenticate);

// GET /api/patients  — all roles
router.get('/', getAllPatients);

// GET /api/patients/:id  — all roles (full profile incl. doctor + diseases)
router.get('/:id', getPatientById);

// POST /api/patients  — Admin, Clinician, Receptionist
router.post('/', authorize(['admin', 'clinician', 'receptionist']), createPatient);

// PUT /api/patients/:id  — Admin, Clinician
router.put('/:id', authorize(['admin', 'clinician']), updatePatient);

// DELETE /api/patients/:id  — Admin only
router.delete('/:id', authorize(['admin']), deletePatient);

export default router;
