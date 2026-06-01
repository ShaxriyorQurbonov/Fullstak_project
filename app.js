import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Routes
import authRoutes from './backend/routes/auth.js';
import doctorRoutes from './backend/routes/doctors.js';
import patientRoutes from './backend/routes/patients.js';
import diseaseRoutes from './backend/routes/diseases.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Core Middleware ──────────────────────────────────────────
app.use(cors({
  // Allow the Express-served frontend AND VS Code Live Server (port 5500)
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve static frontend ────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend')));

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/diseases', diseaseRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MRMS – CareTrack Clinic'
  });
});

// ── SPA fallback — serve index.html for any non-API route ────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ── 404 handler for unmatched API calls ──────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

export default app;
