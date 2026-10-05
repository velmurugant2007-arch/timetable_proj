const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

router.post('/email', exportController.emailTimetable);

module.exports = router;
