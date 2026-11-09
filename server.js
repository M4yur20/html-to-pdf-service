const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const prometheusMiddleware = require('express-prometheus-middleware');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const pdfRoutes = require('./src/routes/pdfRoutes');
const healthRoutes = require('./src/routes/healthRoutes');
const cacheService = require('./src/services/cacheService');

const app = express();

// Compression middleware
app.use(compression());

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Prometheus metrics
app.use(prometheusMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5]
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/pdf', pdfRoutes);

// Error handling
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

// The service-account key is no longer baked into the image (see .dockerignore): it must be
// mounted read-only at runtime at the path GCS_KEYFILE names. Say so loudly instead of failing
// later on the first upload.
if (config.gcs.keyFilename && !require('fs').existsSync(config.gcs.keyFilename)) {
  const msg = `GCS_KEYFILE "${config.gcs.keyFilename}" not found: mount the service-account key read-only at that path`;
  logger.error(msg);
  console.error(msg);
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} signal received: closing HTTP server`);
  // Never outlive Docker's 10 s stop timeout (in-flight PDFs get killed with the process).
  setTimeout(() => process.exit(1), 9000).unref();

  // Stop accepting requests first; the callback fires once in-flight requests finish.
  server.close(async () => {
    logger.info('HTTP server closed');
    // Close Redis connection
    await cacheService.closeConnection();
    process.exit(0);
  });
  server.closeIdleConnections();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});