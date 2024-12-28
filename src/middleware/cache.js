const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

exports.cacheMiddleware = async (req, res, next) => {
  const cacheKey = `pdf-${JSON.stringify(req.body)}`;

  try {
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      logger.info(`Cache hit for key: ${cacheKey}`);
      return res.json(cachedResult);
    }

    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 200 && data.success === true) {
        cacheService.set(cacheKey, data)
          .catch(error => logger.error('Cache set error:', error));
      }

      res.json = originalJson;
      return res.json(data);
    };

    next();
  } catch (error) {
    logger.error('Cache middleware error:', error);
    next();
  }
};