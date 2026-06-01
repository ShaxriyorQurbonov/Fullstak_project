import express from 'express';
import {
  getAllDiseases,
  getDiseaseById,
  getDiseasesByPatient,
  createDisease,
  updateDisease,
  deleteDisease
} from '../controllers/diseaseController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All disease routes require authentication
router.use(authenticate);

// GET /api/diseases  — all roles
router.get('/', getAllDiseases);

// GET /api/diseases/patient/:patientId  — all roles
// IMPORTANT: must be defined BEFORE /:id so Express doesn't treat "patient" as an id
router.get('/patient/:patientId', getDiseasesByPatient);

// GET /api/diseases/:id  — all roles
router.get('/:id', getDiseaseById);

// POST /api/diseases  — Admin, Clinician
router.post('/', authorize(['admin', 'clinician']), createDisease);

// PUT /api/diseases/:id  — Admin, Clinician
router.put('/:id', authorize(['admin', 'clinician']), updateDisease);

// DELETE /api/diseases/:id  — Admin only
router.delete('/:id', authorize(['admin']), deleteDisease);

export default router;
