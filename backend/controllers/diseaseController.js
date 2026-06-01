import {
  getAllFromDB,
  getByIdFromDB,
  addToDB,
  updateInDB,
  deleteFromDB
} from '../utils/db.js';

// GET /api/diseases
export const getAllDiseases = (req, res) => {
  try {
    const { search, severity, patientId } = req.query;
    let diseases = getAllFromDB('diseases.json', 'diseases');

    if (search) {
      const q = search.toLowerCase();
      diseases = diseases.filter(d =>
        d.description.toLowerCase().includes(q) ||
        (d.icdCode || '').toLowerCase().includes(q)
      );
    }
    if (severity) {
      diseases = diseases.filter(d => d.severity === severity);
    }
    if (patientId) {
      diseases = diseases.filter(d => d.patientId === parseInt(patientId));
    }

    // Enrich each record with patient name for convenience
    const patients = getAllFromDB('patients.json', 'patients');
    const enriched = diseases.map(d => {
      const p = patients.find(pt => pt.id === d.patientId);
      return {
        ...d,
        patientName: p ? `${p.firstName} ${p.lastName}` : 'Unknown'
      };
    });

    res.json({ count: enriched.length, diseases: enriched });
  } catch (error) {
    console.error('getAllDiseases error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/diseases/:id
export const getDiseaseById = (req, res) => {
  try {
    const disease = getByIdFromDB('diseases.json', 'diseases', req.params.id);
    if (!disease) {
      return res.status(404).json({ message: 'Disease record not found.' });
    }

    const patient = disease.patientId
      ? getByIdFromDB('patients.json', 'patients', disease.patientId)
      : null;

    res.json({ disease, patient: patient || null });
  } catch (error) {
    console.error('getDiseaseById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/diseases/patient/:patientId  — all diagnoses for a patient
export const getDiseasesByPatient = (req, res) => {
  try {
    const patient = getByIdFromDB('patients.json', 'patients', req.params.patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const diseases = getAllFromDB('diseases.json', 'diseases');
    const patientDiseases = diseases.filter(d => d.patientId === parseInt(req.params.patientId));

    res.json({
      patient: { id: patient.id, name: `${patient.firstName} ${patient.lastName}` },
      count: patientDiseases.length,
      diseases: patientDiseases
    });
  } catch (error) {
    console.error('getDiseasesByPatient error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/diseases  (Admin, Clinician)
export const createDisease = (req, res) => {
  try {
    const { icdCode, description, severity, patientId, diagnosisDate, notes } = req.body;

    if (!icdCode || !description || !severity || !patientId || !diagnosisDate) {
      return res.status(400).json({
        message: 'icdCode, description, severity, patientId and diagnosisDate are all required.'
      });
    }

    // Validate patient exists
    const patient = getByIdFromDB('patients.json', 'patients', patientId);
    if (!patient) {
      return res.status(400).json({ message: `Patient with ID ${patientId} not found.` });
    }

    const validSeverities = ['Mild', 'Moderate', 'Severe', 'Critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ message: `severity must be one of: ${validSeverities.join(', ')}.` });
    }

    const newDisease = addToDB('diseases.json', 'diseases', {
      icdCode,
      description,
      severity,
      patientId: parseInt(patientId),
      diagnosisDate,
      notes: notes || ''
    });

    if (!newDisease) {
      return res.status(500).json({ message: 'Failed to create disease record.' });
    }

    res.status(201).json({ message: 'Disease record created.', disease: newDisease });
  } catch (error) {
    console.error('createDisease error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/diseases/:id  (Admin, Clinician)
export const updateDisease = (req, res) => {
  try {
    const existing = getByIdFromDB('diseases.json', 'diseases', req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Disease record not found.' });
    }

    const { icdCode, description, severity, patientId, diagnosisDate, notes } = req.body;

    if (patientId) {
      const patient = getByIdFromDB('patients.json', 'patients', patientId);
      if (!patient) {
        return res.status(400).json({ message: `Patient with ID ${patientId} not found.` });
      }
    }

    if (severity) {
      const validSeverities = ['Mild', 'Moderate', 'Severe', 'Critical'];
      if (!validSeverities.includes(severity)) {
        return res.status(400).json({ message: `severity must be one of: ${validSeverities.join(', ')}.` });
      }
    }

    const updated = updateInDB('diseases.json', 'diseases', req.params.id, {
      icdCode: icdCode ?? existing.icdCode,
      description: description ?? existing.description,
      severity: severity ?? existing.severity,
      patientId: patientId ? parseInt(patientId) : existing.patientId,
      diagnosisDate: diagnosisDate ?? existing.diagnosisDate,
      notes: notes !== undefined ? notes : existing.notes
    });

    res.json({ message: 'Disease record updated.', disease: updated });
  } catch (error) {
    console.error('updateDisease error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/diseases/:id  (Admin only)
export const deleteDisease = (req, res) => {
  try {
    const disease = getByIdFromDB('diseases.json', 'diseases', req.params.id);
    if (!disease) {
      return res.status(404).json({ message: 'Disease record not found.' });
    }

    deleteFromDB('diseases.json', 'diseases', req.params.id);
    res.json({ message: 'Disease record deleted.' });
  } catch (error) {
    console.error('deleteDisease error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
