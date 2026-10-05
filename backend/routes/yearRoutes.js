const router = require('express').Router();
const auth = require('../middleware/auth');
const { getAll, create, addSection, deleteSection } = require('../controllers/yearController');

router.use(auth);

router.get('/', getAll);
router.post('/', create);
router.put('/:id', require('../controllers/yearController').update);
router.delete('/:id', require('../controllers/yearController').delete);

router.post('/:id/sections', addSection);
router.put('/:id/sections/:section', require('../controllers/yearController').updateSection);
router.delete('/:id/sections/:section', deleteSection);

module.exports = router;
