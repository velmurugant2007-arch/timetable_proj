const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/masterTimetableController');

// Ensure uploads directory exists if not on Vercel
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer to store uploaded files in a temp directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.VERCEL ? '/tmp' : uploadsDir;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'curriculum-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .xls files are allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

router.use(auth);

router.post('/sheets', upload.single('file'), ctrl.getSheets);
router.post('/import', upload.single('file'), ctrl.importAndGenerate);
router.get('/', ctrl.getAll);

module.exports = router;
