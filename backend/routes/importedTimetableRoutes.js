const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/importedTimetableController');

const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use /tmp for serverless environments like Vercel
    const dir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'uploads');
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'docx-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

router.use(auth);

router.post('/upload', upload.array('files'), ctrl.uploadDocx);
router.get('/', ctrl.getImportedTimetables);

module.exports = router;
