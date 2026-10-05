const router = require('express').Router();
const auth = require('../middleware/auth');
const { getAbstractData } = require('../controllers/abstractController');

router.use(auth);

router.get('/', getAbstractData);

module.exports = router;
