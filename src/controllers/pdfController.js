const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');

exports.convertToPdf = async (req, res, next) => {
  try {
    const { input, scale, format, orientation, scaleX, scaleY } = req.body;

    const pdfBuffer = await pdfService.generatePdf(input, {
      scale,
      format,
      orientation,
      scaleX,
      scaleY 
    });

    const base64Pdf = pdfBuffer.toString('base64');

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
    next(error);
  }
};