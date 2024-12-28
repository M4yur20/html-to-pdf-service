const express = require('express');
const router = express.Router();
const { validateConvertRequest } = require('../middleware/validation');
const { cacheMiddleware } = require('../middleware/cache');
const pdfController = require('../controllers/pdfController');
const auth = require('../middleware/auth');

router.post('/convert',
  validateConvertRequest,
  cacheMiddleware,
  auth,
  pdfController.convertToPdf
);

module.exports = router;