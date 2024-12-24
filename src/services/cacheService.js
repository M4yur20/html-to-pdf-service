const Redis = require('ioredis');
const config = require('../config/config');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.isConnected = false;

    this.redisClient.on('connect', () => {
      logger.info('Redis: Connection established');
    });

    this.redisClient.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis: Ready to accept commands');
    });

    this.redisClient.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis connection error:', error);
    });

    this.redisClient.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis: Connection closed');
    });

    this.redisClient.on('reconnecting', () => {
      logger.info('Redis: Attempting to reconnect...');
    });
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis: Cache unavailable, skipping get operation');
        return null;
      }

      const value = await this.redisClient.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, expirySeconds = 300) { // 5 minutes default
    try {
      if (!this.isConnected) {
        logger.warn('Redis: Cache unavailable, skipping set operation');
        return false;
      }

      const result = await this.redisClient.set(
        key,
        JSON.stringify(value),
        'EX',
        expirySeconds
      );
      return result === 'OK';
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis: Cache unavailable, skipping delete operation');
        return false;
      }

      const result = await this.redisClient.del(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  async getHealth() {
    try {
      if (!this.isConnected) {
        return {
          status: 'down',
          message: 'Redis connection is down'
        };
      }

      const pingResult = await this.redisClient.ping();
      return {
        status: pingResult === 'PONG' ? 'up' : 'down',
        message: pingResult === 'PONG' ? 'Redis connection is healthy' : 'Redis ping failed',
        info: await this.getStats()
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Redis health check failed',
        error: error.message
      };
    }
  }

  async getStats() {
    try {
      if (!this.isConnected) {
        return null;
      }

      const info = await this.redisClient.info();
      return info;
    } catch (error) {
      logger.error('Redis stats error:', error);
      return null;
    }
  }

  async closeConnection() {
    try {
      await this.redisClient.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
}

module.exports = new CacheService();