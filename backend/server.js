require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const yearRoutes = require('./routes/yearRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const settingRoutes = require('./routes/settingRoutes');
const exportRoutes = require('./routes/exportRoutes');
const masterTimetableRoutes = require('./routes/masterTimetableRoutes');
const importedTimetableRoutes = require('./routes/importedTimetableRoutes');
const facultyMasterTTRoutes = require('./routes/facultyMasterTTRoutes');
const abstractRoutes = require('./routes/abstractRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/years', yearRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/master-timetable', masterTimetableRoutes);
app.use('/api/imported-timetables', importedTimetableRoutes);
app.use('/api/faculty-master-tt', facultyMasterTTRoutes);
app.use('/api/abstract', abstractRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

const { initDefaultImportedData } = require('./controllers/importedTimetableController');

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  try {
    await initDefaultImportedData();
  } catch (e) {
    console.error('Failed to init default imported data:', e);
  }
});

module.exports = app;
