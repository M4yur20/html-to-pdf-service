const pdfService = require('../services/pdfService');
const storageService = require('../services/storageService');
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

    const fileInfo = await storageService.uploadFile(pdfBuffer);

    res.json({
      success: true,
      url: fileInfo.url,
      metadata: {
        format,
        orientation,
        scale,
        filename: fileInfo.filename,
        size: fileInfo.size,
        expiresAt: fileInfo.expiresAt
      }
    });
  } catch (error) {
    logger.error('Error in PDF conversion:', error);
    next(error);
  }
};