# MRMS – CareTrack Clinic Medical Record Management System

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
node server.js
```
> **Or with auto-restart on file changes (Node 18+):**
> ```bash
> npm run dev
> ```

### 3. Open the app
Visit **http://localhost:5000** in your browser.

---

## Test Credentials

| Username       | Password     | Role          | Access                              |
|----------------|--------------|---------------|-------------------------------------|
| `admin`        | `admin123`   | Admin         | Full CRUD on all records            |
| `clinician`    | `clinic123`  | Clinician     | View & update Patients + Diagnoses  |
| `receptionist` | `recept123`  | Receptionist  | Register patients, view doctors     |

---

## Project Structure

```
mrms/
├── app.js                          ← Express app (routes, middleware, static)
├── server.js                       ← Entry point (calls app.js, starts listen)
├── package.json
├── .env                            ← PORT, JWT_SECRET
│
├── backend/
│   ├── controllers/
│   │   ├── authController.js       ← login, logout, register, /me
│   │   ├── doctorController.js     ← Doctor CRUD
│   │   ├── patientController.js    ← Patient CRUD (cascade-deletes diseases)
│   │   └── diseaseController.js    ← Disease/Diagnosis CRUD
│   ├── routes/
│   │   ├── auth.js                 ← POST /api/auth/login|logout|register
│   │   ├── doctors.js              ← GET|POST|PUT|DELETE /api/doctors
│   │   ├── patients.js             ← GET|POST|PUT|DELETE /api/patients
│   │   └── diseases.js             ← GET|POST|PUT|DELETE /api/diseases
│   ├── middleware/
│   │   └── auth.js                 ← authenticate (JWT), authorize (roles)
│   └── utils/
│       └── db.js                   ← JSON file read/write helpers
│
├── frontend/
│   ├── index.html                  ← Single-page app (full UI)
│   ├── js/
│   │   └── app.js                  ← API bridge: patches save/delete/login
│   └── css/
│       └── style.css
│
└── database/
    ├── users.json                  ← User accounts (bcrypt passwords)
    ├── doctors.json                ← Doctor records
    ├── patients.json               ← Patient records
    └── diseases.json               ← Diagnosis records
```

---

## API Endpoints

All endpoints except `POST /api/auth/login` require a Bearer token.

### Auth
| Method | Path                   | Roles       |
|--------|------------------------|-------------|
| POST   | /api/auth/login        | Public      |
| POST   | /api/auth/logout       | Any         |
| POST   | /api/auth/register     | Admin only  |
| GET    | /api/auth/me           | Any         |

### Doctors
| Method | Path              | Roles             |
|--------|-------------------|-------------------|
| GET    | /api/doctors      | Any               |
| GET    | /api/doctors/:id  | Any               |
| POST   | /api/doctors      | Admin             |
| PUT    | /api/doctors/:id  | Admin             |
| DELETE | /api/doctors/:id  | Admin             |

### Patients
| Method | Path               | Roles                          |
|--------|--------------------|--------------------------------|
| GET    | /api/patients      | Any                            |
| GET    | /api/patients/:id  | Any (includes doctor+diseases) |
| POST   | /api/patients      | Admin, Clinician, Receptionist |
| PUT    | /api/patients/:id  | Admin, Clinician               |
| DELETE | /api/patients/:id  | Admin                          |

### Diseases / Diagnoses
| Method | Path                              | Roles             |
|--------|-----------------------------------|-------------------|
| GET    | /api/diseases                     | Any               |
| GET    | /api/diseases/:id                 | Any               |
| GET    | /api/diseases/patient/:patientId  | Any               |
| POST   | /api/diseases                     | Admin, Clinician  |
| PUT    | /api/diseases/:id                 | Admin, Clinician  |
| DELETE | /api/diseases/:id                 | Admin             |
