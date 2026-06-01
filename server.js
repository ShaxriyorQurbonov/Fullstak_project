import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🏥  MRMS – CareTrack Clinic`);
  console.log(`🚀  Server running at http://localhost:${PORT}`);
  console.log(`📂  API base: http://localhost:${PORT}/api`);
  console.log(`🌐  Frontend: http://localhost:${PORT}\n`);
});
