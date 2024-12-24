const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error'
    : err.message;

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      timestamp: new Date(),
      path: req.path
    }
  });
};