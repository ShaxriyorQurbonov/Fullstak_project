import {
  getAllFromDB,
  getByIdFromDB,
  addToDB,
  updateInDB,
  deleteFromDB,
  writeDB,
  readDB
} from '../utils/db.js';

// GET /api/patients
export const getAllPatients = (req, res) => {
  try {
    const { search, doctorId, gender } = req.query;
    let patients = getAllFromDB('patients.json', 'patients');

    if (search) {
      const q = search.toLowerCase();
      patients = patients.filter(p =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        (p.contactEmail || '').toLowerCase().includes(q)
      );
    }
    if (doctorId) {
      patients = patients.filter(p => p.assignedDoctorId === parseInt(doctorId));
    }
    if (gender) {
      patients = patients.filter(p => p.gender === gender);
    }

    res.json({ count: patients.length, patients });
  } catch (error) {
    console.error('getAllPatients error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/patients/:id  — full profile: patient + doctor + diseases
export const getPatientById = (req, res) => {
  try {
    const patient = getByIdFromDB('patients.json', 'patients', req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const doctor = patient.assignedDoctorId
      ? getByIdFromDB('doctors.json', 'doctors', patient.assignedDoctorId)
      : null;

    const diseases = getAllFromDB('diseases.json', 'diseases');
    const patientDiseases = diseases.filter(d => d.patientId === patient.id);

    res.json({ patient, assignedDoctor: doctor || null, diseases: patientDiseases });
  } catch (error) {
    console.error('getPatientById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/patients  (Admin, Clinician, Receptionist)
export const createPatient = (req, res) => {
  try {
    const {
      firstName, lastName, dateOfBirth, gender,
      contactEmail, contactPhone, address,
      assignedDoctorId, medicalHistory, status
    } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !gender) {
      return res.status(400).json({ message: 'firstName, lastName, dateOfBirth and gender are required.' });
    }

    // Validate assigned doctor if provided
    if (assignedDoctorId) {
      const doctor = getByIdFromDB('doctors.json', 'doctors', assignedDoctorId);
      if (!doctor) {
        return res.status(400).json({ message: `Doctor with ID ${assignedDoctorId} not found.` });
      }
    }

    const newPatient = addToDB('patients.json', 'patients', {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      address: address || '',
      assignedDoctorId: assignedDoctorId ? parseInt(assignedDoctorId) : null,
      registrationDate: new Date().toISOString().split('T')[0],
      medicalHistory: medicalHistory || '',
      status: status || 'Active'
    });

    if (!newPatient) {
      return res.status(500).json({ message: 'Failed to create patient.' });
    }

    res.status(201).json({ message: 'Patient created.', patient: newPatient });
  } catch (error) {
    console.error('createPatient error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/patients/:id  (Admin, Clinician)
export const updatePatient = (req, res) => {
  try {
    const existing = getByIdFromDB('patients.json', 'patients', req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const {
      firstName, lastName, dateOfBirth, gender,
      contactEmail, contactPhone, address,
      assignedDoctorId, medicalHistory, status
    } = req.body;
    if (assignedDoctorId !== undefined && assignedDoctorId !== null) {
      const doctor = getByIdFromDB('doctors.json', 'doctors', assignedDoctorId);
      if (!doctor) {
        return res.status(400).json({ message: `Doctor with ID ${assignedDoctorId} not found.` });
      }
    }

    const updated = updateInDB('patients.json', 'patients', req.params.id, {
      firstName: firstName ?? existing.firstName,
      lastName: lastName ?? existing.lastName,
      dateOfBirth: dateOfBirth ?? existing.dateOfBirth,
      gender: gender ?? existing.gender,
      contactEmail: contactEmail ?? existing.contactEmail,
      contactPhone: contactPhone ?? existing.contactPhone,
      address: address ?? existing.address,
      assignedDoctorId: assignedDoctorId !== undefined
        ? (assignedDoctorId ? parseInt(assignedDoctorId) : null)
        : existing.assignedDoctorId,
      medicalHistory: medicalHistory ?? existing.medicalHistory,
      status: status ?? existing.status ?? 'Active'
    });

    res.json({ message: 'Patient updated.', patient: updated });
  } catch (error) {
    console.error('updatePatient error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/patients/:id  (Admin only)
export const deletePatient = (req, res) => {
  try {
    const patient = getByIdFromDB('patients.json', 'patients', req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // Also cascade-delete all linked disease records
    const diseasesDB = readDB('diseases.json');
    if (diseasesDB) {
      diseasesDB.diseases = diseasesDB.diseases.filter(d => d.patientId !== patient.id);
      writeDB('diseases.json', diseasesDB);
    }

    deleteFromDB('patients.json', 'patients', req.params.id);
    res.json({ message: 'Patient and all linked diagnoses deleted.' });
  } catch (error) {
    console.error('deletePatient error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
