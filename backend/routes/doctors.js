import express from 'express';
import {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
} from '../controllers/doctorController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All doctor routes require authentication
router.use(authenticate);

// GET /api/doctors  — all roles
router.get('/', getAllDoctors);

// GET /api/doctors/:id  — all roles
router.get('/:id', getDoctorById);

// POST /api/doctors  — Admin only
router.post('/', authorize(['admin']), createDoctor);

// PUT /api/doctors/:id  — Admin only
router.put('/:id', authorize(['admin']), updateDoctor);

// DELETE /api/doctors/:id  — Admin only
router.delete('/:id', authorize(['admin']), deleteDoctor);

export default router;
