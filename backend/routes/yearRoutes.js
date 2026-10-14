const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/yearController');

router.use(auth);

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

router.post('/:id/sections', ctrl.addSection);
router.put('/:id/sections/:section', ctrl.updateSection);
router.delete('/:id/sections/:section', ctrl.deleteSection);

module.exports = router;
