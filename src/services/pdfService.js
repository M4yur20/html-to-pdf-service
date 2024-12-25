const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class PdfService {
  async generatePdf(input, options = {}) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'true',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      if (input.startsWith('http')) {
        await page.goto(input, { waitUntil: 'networkidle0' });
      } else {
        await page.setContent(input, { waitUntil: 'networkidle0' });
      }

      // Just add this one line to ensure shadows are printed
      await page.emulateMediaType('screen');

      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        printBackground: true,
        scale: options.scale || 1,
        landscape: options.orientation === 'landscape',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        ...options
      });

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