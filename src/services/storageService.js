const { Storage } = require('@google-cloud/storage');
const crypto = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.storage = new Storage({
      projectId: config.gcs.projectId,
      keyFilename: config.gcs.keyFilename
    });
    this.bucket = this.storage.bucket(config.gcs.bucketName);
  }

  generateUniqueFilename() {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `pdf/${timestamp}-${randomString}.pdf`;
  }

  async generateSignedUrl(filename) {
    try {
      const file = this.bucket.file(filename);

      const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + (5 * 60 * 1000), // 5 minutes
      };

      const [signedUrl] = await file.getSignedUrl(options);
      logger.info(`Generated signed URL for ${filename}`);

      return signedUrl;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  async uploadFile(buffer) {
    try {
      const filename = this.generateUniqueFilename();
      const file = this.bucket.file(filename);

      // First upload the file
      await new Promise((resolve, reject) => {
        const stream = file.createWriteStream({
          metadata: {
            contentType: 'application/pdf'
          },
          resumable: false
        });

        stream.on('error', reject);
        stream.on('finish', resolve);
        stream.end(buffer);
      });

      // Then generate signed URL
      const signedUrl = await this.generateSignedUrl(filename);
      const expiresAt = new Date(Date.now() + (5 * 60 * 1000));

      return {
        url: signedUrl,
        filename,
        expiresAt,
        size: buffer.length
      };
    } catch (error) {
      logger.error('Error in storage service:', error);
      throw error;
    }
  }

  // Optional: Add cleanup method for old files
  async deleteOldFiles(ageInMinutes = 60) {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: 'pdf/'
      });

      const now = Date.now();
      const deletePromises = files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        const fileAge = now - new Date(metadata.timeCreated).getTime();

        if (fileAge > (ageInMinutes * 60 * 1000)) {
          await file.delete();
          logger.info(`Deleted old file: ${file.name}`);
        }
      });

      await Promise.all(deletePromises);
    } catch (error) {
      logger.error('Error cleaning up old files:', error);
    }
  }
}

module.exports = new StorageService();