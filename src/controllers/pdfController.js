const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');
const fs = require('fs').promises;

exports.convertToPdf = async (req, res, next) => {
  try {
    let input;
    const options = {
      scale: parseFloat(req.body.scale) || 1.0,
      format: req.body.format || 'A4',
      orientation: req.body.orientation || 'portrait',
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    };

    if (req.file) {
      const filePath = req.file.path;
      input = await fs.readFile(filePath, 'utf8');

      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.error('Error cleaning up uploaded file:', error);
      }
    } else if (req.body.input) {
      input = req.body.input;
    } else {
      return res.status(400).json({
        success: false,
        error: 'No input provided'
      });
    }

    const pdfBuffer = await pdfService.generatePdf(input, options);

    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    res.json({
      success: true,
      data: base64Pdf,
      metadata: {
        format: options.format,
        orientation: options.orientation,
        scale: options.scale,
        size: pdfBuffer.length
      }
    });
  } catch (error) {
    logger.error('Error in PDF conversion:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'PDF conversion failed'
    });
  }
};