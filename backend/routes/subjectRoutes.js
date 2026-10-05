const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/subjectController');

router.use(auth);

router.get('/', ctrl.getAll);
router.post('/bulk-import', ctrl.bulkImport);
router.put('/bulk-update-code', ctrl.bulkUpdateCode);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
