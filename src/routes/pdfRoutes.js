const express = require('express');
const router = express.Router();
const { validateConvertRequest } = require('../middleware/validation');
const pdfController = require('../controllers/pdfController');
const zipController = require('../controllers/zipController');
const auth = require('../middleware/auth');
const upload = require('../middleware/fileUpload');

// Route for direct HTML input
router.post('/convert',
  validateConvertRequest,
  auth,
  pdfController.convertToPdf
);

// Route for HTML file upload
router.post('/convert/file',
  auth,
  upload.single('htmlFile'),
  pdfController.convertToPdf
);

// Route for ZIP file upload
router.post('/convert/zip',
  auth,
  upload.single('zipFile'),
  zipController.convertZipToPdf
);

module.exports = router;