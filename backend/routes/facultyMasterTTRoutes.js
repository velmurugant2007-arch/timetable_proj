const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/facultyMasterTTController');

// Ensure uploads directory exists if not on Vercel
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.VERCEL ? '/tmp' : uploadsDir;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'fmtt-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv', '.docx', '.doc'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls), CSV, and Word (.docx, .doc) files are allowed.'));
    }
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(auth);

// Endpoints
router.post('/upload', upload.single('file'), ctrl.uploadMasterStaffTT);
router.post('/acronym-mapping', upload.single('file'), ctrl.uploadAcronymMapping);
router.get('/', ctrl.getFacultyMasterTT);
router.get('/:acronym/schedule', ctrl.getIndividualSchedule);
router.post('/generate', ctrl.generateFacultyMasterTT);
router.delete('/clear', ctrl.clearFacultyMasterTT);

module.exports = router;
