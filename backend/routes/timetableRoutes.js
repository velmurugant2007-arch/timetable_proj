const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/timetableController');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:key', ctrl.getOne);
router.post('/generate', ctrl.generate);
router.put('/:key', ctrl.save);
router.put('/:key/cell', ctrl.editCell);

module.exports = router;
