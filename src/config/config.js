// src/config/config.js

require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  gcs: {
    projectId: process.env.GCS_PROJECT_ID,
    bucketName: process.env.GCS_BUCKET_NAME,
    keyFilename: process.env.GCS_KEYFILE
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_TTL) || 300 // 5 minutes
  }
};