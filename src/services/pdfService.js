const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class PdfService {
  async generatePdf(input, options = {}) {
    let browser;
    try {
      browser = await puppeteer.launch({
        // executablePath: '/usr/bin/google-chrome',
        waitUntil: 'networkidle0', // Wait for all network requests, including CDN scripts
        timeout: 30000,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      if (input.startsWith('http')) {
        await page.goto(input, { waitUntil: 'networkidle0' });
      } else {
        await page.setContent(input, { waitUntil: 'networkidle0' });
      }

      await page.emulateMediaType('screen');

      const pdfOptions = {
        format: options.format || 'A4',
        printBackground: true,
        landscape: options.orientation === 'landscape',
        margin: options.margin || {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      };

      // Only add scale if it's a valid number
      if (typeof options.scale === 'number' && !isNaN(options.scale)) {
        pdfOptions.scale = options.scale;
      }

      const pdfBuffer = await page.pdf(pdfOptions);

      return pdfBuffer;
    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new PdfService();