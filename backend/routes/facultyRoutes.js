const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/facultyController');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/raw', ctrl.getRaw);
router.get('/:id/schedule', ctrl.getSchedule);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
