const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/settingController');

router.use(auth);

router.get('/', ctrl.get);
router.put('/', ctrl.update);

module.exports = router;
