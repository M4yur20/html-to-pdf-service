const express = require('express');
const router = express.Router();
const { validateConvertRequest } = require('../middleware/validation');
const { cacheMiddleware } = require('../middleware/cache');
const pdfController = require('../controllers/pdfController');

router.post('/convert', 
  validateConvertRequest,
  cacheMiddleware,
  pdfController.convertToPdf
);

module.exports = router;