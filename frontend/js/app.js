/**
 * app.js  –  MRMS Frontend ↔ Backend Bridge
 *
 * The existing index.html uses local in-memory state with short field names
 * (fname, lname, dept, icd, desc, doctorId, date …).
 * This file:
 *   1. Provides API helpers (with JWT auth header).
 *   2. On page load / login, fetches live data from the backend and converts
 *      it to the shape the HTML already expects.
 *   3. Patches the HTML's save / delete functions so every mutation goes to the
 *      backend AND updates the local arrays (keeping the UI reactive).
 *
 * Backend ↔ Frontend field mapping
 * ─────────────────────────────────
 *  Backend Doctor : { id, name, specialty, department, contactEmail, contactPhone }
 *  Frontend doctor: { id, fname, lname, specialty, dept, email, phone, notes }
 *
 *  Backend Patient: { id, firstName, lastName, dateOfBirth, gender,
 *                     contactEmail, contactPhone, address, assignedDoctorId,
 *                     registrationDate, medicalHistory }
 *  Frontend patient:{ id, fname, lname, dob, gender, phone, email,
 *                     address, doctorId, status, notes }
 *
 *  Backend Disease : { id, icdCode, description, severity, patientId,
 *                      diagnosisDate, notes }
 *  Frontend disease: { id, icd, desc, severity, patientId, date, notes }
 */

// Auto-detect the backend URL so the app works both ways:
//   Option A: opened via Express at localhost:3000  -> use relative /api
//   Option B: opened via VS Code Live Server (port 5500) -> point to Express at :3000
const API_URL = (window.location.port === '3000' || window.location.port === '')
  ? '/api'
  : 'http://' + window.location.hostname + ':3000/api';

let authToken = localStorage.getItem('mrms_token') || null;

/* ══════════════════════════════════════════════════════
   1.  API HELPERS
══════════════════════════════════════════════════════ */
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    // Token expired – force logout
    authToken = null;
    localStorage.removeItem('mrms_token');
    location.reload();
    return null;
  }
  return res;
}

async function apiGet(path) {
  const res = await apiFetch(path);
  if (!res || !res.ok) return null;
  return res.json();
}

async function apiPost(path, body) {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  return res;
}

async function apiPut(path, body) {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  return res;
}

async function apiDelete(path) {
  const res = await apiFetch(path, { method: 'DELETE' });
  return res;
}

/* ══════════════════════════════════════════════════════
   2.  DATA NORMALISATION  (backend → frontend shape)
══════════════════════════════════════════════════════ */
function normDoctor(d) {
  // "Dr. Feruza Karimova" → fname="Feruza" lname="Karimova"
  let namePart = d.name || '';
  if (namePart.startsWith('Dr. ')) namePart = namePart.slice(4);
  const [fname = '', ...rest] = namePart.split(' ');
  const lname = rest.join(' ');
  return {
    id: d.id,
    fname,
    lname,
    specialty: d.specialty || '',
    dept: d.department || '',
    email: d.contactEmail || '',
    phone: d.contactPhone || '',
    notes: d.notes || '',
    _raw: d           // keep original for PUT payloads
  };
}

function normPatient(p) {
  return {
    id: p.id,
    fname: p.firstName || '',
    lname: p.lastName || '',
    dob: p.dateOfBirth || '',
    gender: p.gender || '',
    phone: p.contactPhone || '',
    email: p.contactEmail || '',
    address: p.address || '',
    doctorId: p.assignedDoctorId || null,
    status: p.status || 'Active',
    notes: p.medicalHistory || '',
    _raw: p
  };
}

function normDisease(d) {
  return {
    id: d.id,
    icd: d.icdCode || '',
    desc: d.description || '',
    severity: d.severity || '',
    patientId: d.patientId || null,
    date: d.diagnosisDate || '',
    notes: d.notes || '',
    _raw: d
  };
}

/* ══════════════════════════════════════════════════════
   3.  DATA LOADING
══════════════════════════════════════════════════════ */
async function loadAllData() {
  const [docData, patData, disData] = await Promise.all([
    apiGet('/doctors'),
    apiGet('/patients'),
    apiGet('/diseases')
  ]);

  // Overwrite the global arrays the HTML uses
  if (docData) {
    window.doctors = docData.doctors.map(normDoctor);
    window.nextDoctorId = Math.max(...window.doctors.map(d => d.id), 0) + 1;
  }
  if (patData) {
    window.patients = patData.patients.map(normPatient);
    window.nextPatientId = Math.max(...window.patients.map(p => p.id), 0) + 1;
  }
  if (disData) {
    window.diseases = disData.diseases.map(normDisease);
    window.nextDiseaseId = Math.max(...window.diseases.map(d => d.id), 0) + 1;
  }
}

/* ══════════════════════════════════════════════════════
   4.  PATCH doLogin – add real JWT auth
══════════════════════════════════════════════════════ */
window._originalDoLogin = window.doLogin; // keep original as fallback

window.doLogin = async function () {
  const usernameInput = document.getElementById('login-email');
  const passInput     = document.getElementById('login-pass');
  const username      = (usernameInput?.value || '').trim();
  const password      = passInput?.value || '';

  if (!username) { showToast('Foydalanuvchi nomini kiriting.', 'error'); return; }
  if (!password) { showToast('Parolni kiriting.', 'error'); return; }

  showToast('Kirilmoqda...', 'info');

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || 'Noto'g'ri hisob ma'lumotlari.', 'error');
      return;
    }

    const data = await res.json();
    authToken = data.token;
    localStorage.setItem('mrms_token', authToken);

    // Capitalise role so HTML role-checks work (Admin / Clinician / Receptionist)
    const role = data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1);
    window.currentRole = role;

    // Load live data before rendering
    await loadAllData();

    // Trigger the original UI transition
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('app-shell').classList.remove('hidden');

    // Apply role UI
    document.getElementById('sidebar-name').textContent  = data.user.name;
    document.getElementById('sidebar-role-label').textContent = role;
    document.getElementById('topbar-role-badge').textContent  = role;
    document.getElementById('sidebar-avatar').textContent     = role.slice(0, 2).toUpperCase();

    const badgeClass = { Admin: 'badge-blue', Clinician: 'badge-green', Receptionist: 'badge-amber' };
    const badge = document.getElementById('topbar-role-badge');
    badge.className = 'badge ' + (badgeClass[role] || 'badge-blue');

    document.getElementById('admin-nav').style.display     = role === 'Admin' ? '' : 'none';
    document.getElementById('btn-add-doctor').style.display = role === 'Admin' ? '' : 'none';
    document.getElementById('qa-add-doctor').style.display  = role === 'Admin' ? '' : 'none';

    // Receptionist cannot access Diseases page (brief: register patients + view doctors only)
    const diseasesNavBtn = document.querySelector('.nav-item[data-page="diseases"]');
    if (diseasesNavBtn) diseasesNavBtn.style.display = role === 'Receptionist' ? 'none' : '';

    document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    if (typeof populateSelects === 'function') populateSelects();
    if (typeof refreshSelects  === 'function') refreshSelects();
    if (typeof renderDoctors   === 'function') renderDoctors();
    if (typeof renderPatients  === 'function') renderPatients();
    if (typeof renderDiseases  === 'function') renderDiseases();

    // Restore last visited page (fresh login always starts at dashboard)
    sessionStorage.removeItem('mrms_page');
    if (typeof navTo === 'function') navTo('dashboard', document.querySelector('[data-page="dashboard"]'));

    showToast(`Xush kelibsiz, ${data.user.name}!`, 'success');

  } catch (err) {
    console.error('Login error:', err);
    showToast('Serverga ulanib bo'lmadi. Backend ishlamoqda?', 'error');
  }
};

/* ══════════════════════════════════════════════════════
   5.  PATCH doLogout – clear token
══════════════════════════════════════════════════════ */
window._originalDoLogout = window.doLogout;

window.doLogout = async function () {
  if (authToken) {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  }
  authToken = null;
  localStorage.removeItem('mrms_token');
  sessionStorage.removeItem('mrms_page');
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('page-login').style.display = '';
};

/* ══════════════════════════════════════════════════════
   6.  PATCH saveDoctor – persist to backend
══════════════════════════════════════════════════════ */
window._originalSaveDoctor = window.saveDoctor;

window.saveDoctor = async function () {
  const fname    = document.getElementById('doctor-fname').value.trim();
  const lname    = document.getElementById('doctor-lname').value.trim();
  const specialty = document.getElementById('doctor-specialty').value;
  const dept     = document.getElementById('doctor-dept').value;
  if (!fname || !lname || !specialty || !dept) {
    showToast("Barcha majburiy maydonlarni to'ldiring.", 'error'); return;
  }

  const editId   = parseInt(document.getElementById('doctor-edit-id').value) || 0;
  const payload  = {
    name: `Dr. ${fname} ${lname}`,
    specialty,
    department: dept,
    contactEmail: document.getElementById('doctor-email').value.trim(),
    contactPhone: document.getElementById('doctor-phone').value.trim()
  };

  try {
    let res;
    if (editId) {
      res = await apiPut(`/doctors/${editId}`, payload);
    } else {
      res = await apiPost('/doctors', payload);
    }

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => ({}));
      showToast(err.message || "Shifokorni saqlash muvaffaq bo'lmadi.", 'error'); return;
    }

    const data = await res.json();
    const normed = normDoctor(data.doctor);

    if (editId) {
      const idx = window.doctors.findIndex(d => d.id === editId);
      if (idx !== -1) window.doctors[idx] = normed;
      showToast("Shifokor muvaffaqiyatli yangilandi.", 'success');
    } else {
      window.doctors.push(normed);
      window.nextDoctorId = normed.id + 1;
      showToast("Shifokor muvaffaqiyatli qo'shildi.", 'success');
    }
  } catch (e) {
    showToast("Tarmoq xatosi. O'zgarishlar faqat mahalliy saqlandi.", 'error');
    // Fallback: still update local state
    const obj = { fname, lname, specialty, dept,
      email: document.getElementById('doctor-email').value.trim(),
      phone: document.getElementById('doctor-phone').value.trim(),
      notes: document.getElementById('doctor-notes').value.trim() };
    if (editId) {
      Object.assign(window.doctors.find(x => x.id === editId), obj);
    } else {
      obj.id = window.nextDoctorId++;
      window.doctors.push(obj);
    }
  }

  closeModal('modal-add-doctor');
  document.getElementById('doctor-edit-id').value = '';
  document.getElementById('doctor-modal-title').textContent = "Yangi shifokor qo'shish";
  ['doctor-fname','doctor-lname','doctor-email','doctor-phone','doctor-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('doctor-specialty').value = '';
  document.getElementById('doctor-dept').value = '';
  if (typeof refreshSelects === 'function') refreshSelects();
  if (typeof renderDoctors  === 'function') renderDoctors();
};

/* ══════════════════════════════════════════════════════
   7.  PATCH savePatient – persist to backend
══════════════════════════════════════════════════════ */
window._originalSavePatient = window.savePatient;

window.savePatient = async function () {
  const fname  = document.getElementById('patient-fname').value.trim();
  const lname  = document.getElementById('patient-lname').value.trim();
  const dob    = document.getElementById('patient-dob').value;
  const docId  = parseInt(document.getElementById('patient-doctor').value);
  if (!fname || !lname || !dob || !docId) {
    showToast("Barcha majburiy maydonlarni to'ldiring.", 'error'); return;
  }

  const editId  = parseInt(document.getElementById('patient-edit-id').value) || 0;
  const payload = {
    firstName: fname,
    lastName: lname,
    dateOfBirth: dob,
    gender: document.getElementById('patient-gender').value,
    contactPhone: document.getElementById('patient-phone').value.trim(),
    contactEmail: document.getElementById('patient-email').value.trim(),
    address: document.getElementById('patient-address').value.trim(),
    assignedDoctorId: docId,
    medicalHistory: document.getElementById('patient-notes').value.trim(),
    status: document.getElementById('patient-status')?.value || 'Active'
  };

  try {
    let res;
    if (editId) {
      res = await apiPut(`/patients/${editId}`, payload);
    } else {
      res = await apiPost('/patients', payload);
    }

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => ({}));
      showToast(err.message || 'Bemorni saqlash muvaffaq bo'lmadi.', 'error'); return;
    }

    const data   = await res.json();
    const normed = normPatient(data.patient);

    if (editId) {
      const idx = window.patients.findIndex(p => p.id === editId);
      if (idx !== -1) window.patients[idx] = normed;
      showToast('Bemor yangilandi.', 'success');
    } else {
      window.patients.push(normed);
      window.nextPatientId = normed.id + 1;
      showToast('Bemor ro'yxatga olingan.', 'success');
    }
  } catch (e) {
    showToast("Tarmoq xatosi. O'zgarishlar faqat mahalliy saqlandi.", 'error');
    const obj = { fname, lname, dob, gender: document.getElementById('patient-gender').value,
      phone: document.getElementById('patient-phone').value.trim(),
      email: document.getElementById('patient-email').value.trim(),
      address: document.getElementById('patient-address').value.trim(),
      doctorId: docId, status: document.getElementById('patient-status')?.value || 'Active',
      notes: document.getElementById('patient-notes').value.trim() };
    if (editId) {
      Object.assign(window.patients.find(x => x.id === editId), obj);
    } else {
      obj.id = window.nextPatientId++;
      window.patients.push(obj);
    }
  }

  closeModal('modal-add-patient');
  document.getElementById('patient-edit-id').value = '';
  document.getElementById('patient-modal-title').textContent = 'Yangi bemorni ro'yxatga olish';
  if (typeof refreshSelects === 'function') refreshSelects();
  if (typeof renderPatients === 'function') renderPatients();
};

/* ══════════════════════════════════════════════════════
   8.  PATCH saveDisease – persist to backend
══════════════════════════════════════════════════════ */
window._originalSaveDisease = window.saveDisease;

window.saveDisease = async function () {
  const icd    = document.getElementById('disease-icd').value.trim();
  const desc   = document.getElementById('disease-desc').value.trim();
  const sev    = document.getElementById('disease-severity').value;
  const patId  = parseInt(document.getElementById('disease-patient').value);
  const date   = document.getElementById('disease-date').value;
  if (!icd || !desc || !sev || !patId || !date) {
    showToast("Barcha majburiy maydonlarni to'ldiring.", 'error'); return;
  }

  const editId  = parseInt(document.getElementById('disease-edit-id').value) || 0;
  const payload = {
    icdCode: icd,
    description: desc,
    severity: sev,
    patientId: patId,
    diagnosisDate: date,
    notes: document.getElementById('disease-notes').value.trim()
  };

  try {
    let res;
    if (editId) {
      res = await apiPut(`/diseases/${editId}`, payload);
    } else {
      res = await apiPost('/diseases', payload);
    }

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => ({}));
      showToast(err.message || 'Tashxisni saqlash muvaffaq bo'lmadi.', 'error'); return;
    }

    const data   = await res.json();
    const normed = normDisease(data.disease);

    if (editId) {
      const idx = window.diseases.findIndex(d => d.id === editId);
      if (idx !== -1) window.diseases[idx] = normed;
      showToast('Tashxis yangilandi.', 'success');
    } else {
      window.diseases.push(normed);
      window.nextDiseaseId = normed.id + 1;
      showToast('Tashxis qo'shildi.', 'success');
    }
  } catch (e) {
    showToast("Tarmoq xatosi. O'zgarishlar faqat mahalliy saqlandi.", 'error');
    const obj = { icd, desc, severity: sev, patientId: patId, date,
      notes: document.getElementById('disease-notes').value.trim() };
    if (editId) {
      Object.assign(window.diseases.find(x => x.id === editId), obj);
    } else {
      obj.id = window.nextDiseaseId++;
      window.diseases.push(obj);
    }
  }

  closeModal('modal-add-disease');
  document.getElementById('disease-edit-id').value = '';
  document.getElementById('disease-modal-title').textContent = 'Tashxis yozuvini qo'shish';
  if (typeof refreshSelects === 'function') refreshSelects();
  if (typeof renderDiseases === 'function') renderDiseases();
};

/* ══════════════════════════════════════════════════════
   9.  PATCH doDelete – persist to backend
══════════════════════════════════════════════════════ */
window._originalDoDelete = window.doDelete;

window.doDelete = async function (type, id) {
  const endpointMap = { doctor: 'doctors', patient: 'patients', disease: 'diseases' };
  const endpoint    = endpointMap[type];

  try {
    const res = await apiDelete(`/${endpoint}/${id}`);
    if (!res || !res.ok) {
      const err = await res?.json().catch(() => ({}));
      showToast(err.message || `${type} o'chirilish muvaffaq bo'lmadi.`, 'error'); return;
    }
  } catch (e) {
    showToast('Tarmoq xatosi – o'chirish muvaffaq bo'lmadi. Iltimos qayta urinib ko'ring.', 'error');
    return; // Do NOT delete locally on network failure
  }

  // Update local arrays only after confirmed backend delete
  if (type === 'doctor') {
    window.doctors = window.doctors.filter(x => x.id !== id);
    showToast('Shifokor o'chirildi.', 'info');
    if (typeof refreshSelects === 'function') refreshSelects();
    if (typeof renderDoctors  === 'function') renderDoctors();
  } else if (type === 'patient') {
    window.patients = window.patients.filter(x => x.id !== id);
    window.diseases = window.diseases.filter(x => x.patientId !== id);
    showToast('Bemor va bog'langan tashxislar o'chirildi.', 'info');
    if (typeof refreshSelects === 'function') refreshSelects();
    if (typeof renderPatients === 'function') renderPatients();
    if (typeof renderDiseases === 'function') renderDiseases();
  } else if (type === 'disease') {
    window.diseases = window.diseases.filter(x => x.id !== id);
    showToast('Tashxis o'chirildi.', 'info');
    if (typeof refreshSelects === 'function') refreshSelects();
    if (typeof renderDiseases === 'function') renderDiseases();
  }
};

/* ══════════════════════════════════════════════════════
   10.  AUTO-LOGIN  — if a valid token is already stored
══════════════════════════════════════════════════════ */
(async function autoLogin() {
  if (!authToken) return;

  try {
    const res = await apiFetch('/auth/me');
    if (!res || !res.ok) {
      // Token invalid – clear and show login
      authToken = null;
      localStorage.removeItem('mrms_token');
      return;
    }
    const data = await res.json();
    const role = data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1);
    window.currentRole = role;

    await loadAllData();

    document.getElementById('page-login').style.display = 'none';
    document.getElementById('app-shell').classList.remove('hidden');

    document.getElementById('sidebar-name').textContent       = data.user.name;
    document.getElementById('sidebar-role-label').textContent = role;
    document.getElementById('topbar-role-badge').textContent  = role;
    document.getElementById('sidebar-avatar').textContent     = role.slice(0, 2).toUpperCase();

    const badgeClass = { Admin: 'badge-blue', Clinician: 'badge-green', Receptionist: 'badge-amber' };
    const badge = document.getElementById('topbar-role-badge');
    badge.className = 'badge ' + (badgeClass[role] || 'badge-blue');

    document.getElementById('admin-nav').style.display      = role === 'Admin' ? '' : 'none';
    document.getElementById('btn-add-doctor').style.display  = role === 'Admin' ? '' : 'none';
    document.getElementById('qa-add-doctor').style.display   = role === 'Admin' ? '' : 'none';

    const diseasesNavBtn = document.querySelector('.nav-item[data-page="diseases"]');
    if (diseasesNavBtn) diseasesNavBtn.style.display = role === 'Receptionist' ? 'none' : '';

    document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    if (typeof populateSelects === 'function') populateSelects();
    if (typeof refreshSelects  === 'function') refreshSelects();
    if (typeof renderDoctors   === 'function') renderDoctors();
    if (typeof renderPatients  === 'function') renderPatients();
    if (typeof renderDiseases  === 'function') renderDiseases();

    // Restore the page the user was on before the token refresh
    const savedPage = sessionStorage.getItem('mrms_page') || 'dashboard';
    if (typeof navTo === 'function') {
      const btn = document.querySelector(`[data-page="${savedPage}"]`);
      navTo(savedPage, btn);
    }

  } catch (e) {
    // Network unreachable – just show login
  }
})();
