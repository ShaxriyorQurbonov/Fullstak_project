import {
  getAllFromDB,
  getByIdFromDB,
  addToDB,
  updateInDB,
  deleteFromDB
} from '../utils/db.js';

// GET /api/doctors
export const getAllDoctors = (req, res) => {
  try {
    const { search, specialty, department } = req.query;
    let doctors = getAllFromDB('doctors.json', 'doctors');

    if (search) {
      const q = search.toLowerCase();
      doctors = doctors.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.specialty || '').toLowerCase().includes(q) ||
        (d.department || '').toLowerCase().includes(q)
      );
    }
    if (specialty) {
      doctors = doctors.filter(d => d.specialty === specialty);
    }
    if (department) {
      doctors = doctors.filter(d => d.department === department);
    }

    res.json({ count: doctors.length, doctors });
  } catch (error) {
    console.error('getAllDoctors error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/doctors/:id
export const getDoctorById = (req, res) => {
  try {
    const doctor = getByIdFromDB('doctors.json', 'doctors', req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // Enrich with their patients
    const patients = getAllFromDB('patients.json', 'patients');
    const assignedPatients = patients.filter(p => p.assignedDoctorId === doctor.id);

    res.json({ doctor, patientCount: assignedPatients.length, patients: assignedPatients });
  } catch (error) {
    console.error('getDoctorById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/doctors  (Admin only)
export const createDoctor = (req, res) => {
  try {
    const { name, specialty, department, contactEmail, contactPhone, licenseNumber } = req.body;

    if (!name || !specialty || !department) {
      return res.status(400).json({ message: 'name, specialty and department are required.' });
    }

    // Check duplicate licence
    if (licenseNumber) {
      const existing = getAllFromDB('doctors.json', 'doctors');
      if (existing.find(d => d.licenseNumber === licenseNumber)) {
        return res.status(409).json({ message: 'A doctor with this licence number already exists.' });
      }
    }

    const newDoctor = addToDB('doctors.json', 'doctors', {
      name,
      specialty,
      department,
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      licenseNumber: licenseNumber || ''
    });

    if (!newDoctor) {
      return res.status(500).json({ message: 'Failed to create doctor.' });
    }

    res.status(201).json({ message: 'Doctor created.', doctor: newDoctor });
  } catch (error) {
    console.error('createDoctor error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/doctors/:id  (Admin only)
export const updateDoctor = (req, res) => {
  try {
    const { name, specialty, department, contactEmail, contactPhone, licenseNumber } = req.body;

    const existing = getByIdFromDB('doctors.json', 'doctors', req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    const updated = updateInDB('doctors.json', 'doctors', req.params.id, {
      name: name ?? existing.name,
      specialty: specialty ?? existing.specialty,
      department: department ?? existing.department,
      contactEmail: contactEmail ?? existing.contactEmail,
      contactPhone: contactPhone ?? existing.contactPhone,
      licenseNumber: licenseNumber ?? existing.licenseNumber
    });

    res.json({ message: 'Doctor updated.', doctor: updated });
  } catch (error) {
    console.error('updateDoctor error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/doctors/:id  (Admin only)
export const deleteDoctor = (req, res) => {
  try {
    const doctor = getByIdFromDB('doctors.json', 'doctors', req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // Prevent deletion if patients are assigned
    const patients = getAllFromDB('patients.json', 'patients');
    const assignedCount = patients.filter(p => p.assignedDoctorId === doctor.id).length;
    if (assignedCount > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${assignedCount} patient(s) assigned to this doctor. Reassign them first.`
      });
    }

    deleteFromDB('doctors.json', 'doctors', req.params.id);
    res.json({ message: 'Doctor deleted.' });
  } catch (error) {
    console.error('deleteDoctor error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
