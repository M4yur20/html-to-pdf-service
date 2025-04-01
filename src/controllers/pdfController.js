const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');

exports.convertToPdf = async (req, res, next) => {
  try {
    const { input, scale, format, orientation, scaleX, scaleY } = req.body;

    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Input is required'
      });
    }

    const pdfBuffer = await pdfService.generatePdf(input, {
      scale,
      format,
      orientation,
      scaleX,
      scaleY 
    });

    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    res.json({
      success: true,
      data: base64Pdf,
      metadata: {
        format,
        orientation,
        scale,
        size: pdfBuffer.length
      }
    });
  } catch (error) {
    logger.error('Error in PDF conversion:', error);
    return res.status(500).json({
      success: false,
      error: 'PDF conversion failed'
    });
  }
};