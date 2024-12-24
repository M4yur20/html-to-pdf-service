// src/routes/healthRoutes.js

const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

router.get('/', async (req, res) => {
  const cacheHealth = await cacheService.getHealth();

  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    cache: {
      status: cacheHealth.status,
      message: cacheHealth.message
    }
  });
});

router.get('/detailed', async (req, res) => {
  try {
    const cacheHealth = await cacheService.getHealth();

    const checks = {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      cache: cacheHealth
    };

    res.json({
      status: 'ok',
      checks,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message
    });
  }
});

module.exports = router;