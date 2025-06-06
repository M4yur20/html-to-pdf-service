const fs = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');
const marked = require('marked');
const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Custom renderer for marked
const renderer = new marked.Renderer();

// Handle code blocks (for non-Mermaid code)
renderer.code = function (code, lang) {
  const actualCode = typeof code === 'object' && code !== null ? (code.text || code.code || String(code)) : String(code || '');
  const actualLang = typeof lang === 'string' ? lang.toLowerCase() : '';

  const escapedCode = actualCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return `<pre><code class="${actualLang ? 'language-' + actualLang : ''}">${escapedCode}</code></pre>`;
};

// Transform .md links to HTML anchors
renderer.link = function (href, title, text) {
  const actualHref = typeof href === 'object' && href !== null ? (href.href || href.url || '#') : (href || '#');
  const actualTitle = typeof title === 'string' ? title : '';
  const actualText = typeof text === 'string' ? text : 'Link';

  let finalHref = actualHref;
  if (actualHref.endsWith('.md')) {
    const chapterNum = actualHref.match(/(\d+)/)?.[0];
    finalHref = chapterNum ? `#chapter-${chapterNum}` : '#introduction';
  }

  return `<a href="${finalHref.replace(/"/g, '&quot;')}"${actualTitle ? ` title="${actualTitle.replace(/"/g, '&quot;')}"` : ''}>${actualText}</a>`;
};

// Handle headings with proper anchors
renderer.heading = function (text, level) {
  const actualText = typeof text === 'object' && text !== null ? (text.text || String(text)) : String(text || '');
  const actualLevel = Number(level) || 1;

  const slug = actualText
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  return `<h${actualLevel} id="${slug}">${actualText}</h${actualLevel}>`;
};

// Configure marked
marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
  sanitize: false,
  smartLists: true,
  smartypants: true
});

// Function to preprocess Markdown and render Mermaid diagrams
async function preprocessMermaid(content) {
  // Regular expression to match Mermaid code blocks
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  let processedContent = content;
  const matches = [...content.matchAll(mermaidRegex)];

  for (const match of matches) {
    const mermaidCode = match[1];
    try {
      // Write the Mermaid code to a temporary file
      const tempInput = path.join(__dirname, `temp_mermaid_${Date.now()}_${Math.random().toString(36).substring(2)}.mmd`);
      const tempOutput = path.join(__dirname, `temp_mermaid_${Date.now()}_${Math.random().toString(36).substring(2)}.svg`);
      await fs.writeFile(tempInput, mermaidCode);

      // Use local mermaid-cli installation or global one
      const mmdcPath = path.join(process.cwd(), 'node_modules', '.bin', 'mmdc');
      const mmdcCommand = await fs.access(mmdcPath).then(() => mmdcPath).catch(() => 'mmdc');
      
      // Use mermaid-cli to render the diagram to SVG
      await execPromise(`"${mmdcCommand}" -i "${tempInput}" -o "${tempOutput}" --theme default`);

      // Read the generated SVG
      const svg = await fs.readFile(tempOutput, 'utf8');

      // Clean up temporary files
      await fs.unlink(tempInput);
      await fs.unlink(tempOutput);

      // Replace the Mermaid code block with the SVG
      processedContent = processedContent.replace(match[0], `<div class="mermaid">${svg}</div>`);
    } catch (error) {
      logger.error(`Error rendering Mermaid diagram:`, error);
      // Replace with an error message if rendering fails
      processedContent = processedContent.replace(match[0], `<div class="mermaid-error">Error rendering diagram: ${error.message}</div>`);
    }
  }

  return processedContent;
}

// HTML template
const htmlTemplate = (content, toc, title) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 30px;
      background: #fafafa;
      font-size: 16px;
    }

    .toc {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 50px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .toc h2 {
      margin-bottom: 20px;
      color: #374151;
      font-size: 1.5rem;
      font-weight: 600;
      text-align: center;
      position: relative;
    }

    .toc h2::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 2px;
      background: #3b82f6;
      border-radius: 1px;
    }

    .toc ul {
      list-style: none;
      margin-top: 25px;
    }

    .toc li {
      margin: 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .toc li:last-child {
      border-bottom: none;
    }

    .toc li::before {
      display: none;
    }

    .toc a {
      text-decoration: none;
      color: #4b5563;
      padding: 12px 16px;
      display: block;
      border-radius: 6px;
      transition: all 0.2s ease;
      font-weight: 500;
      position: relative;
      padding-left: 40px;
    }

    .toc a::before {
      content: '→';
      position: absolute;
      left: 16px;
      opacity: 0.6;
      transition: all 0.2s ease;
    }

    .toc a:hover {
      background: #f8fafc;
      color: #3b82f6;
      transform: translateX(2px);
    }

    .toc a:hover::before {
      opacity: 1;
      color: #3b82f6;
    }

    .chapter {
      background: white;
      padding: 40px;
      margin-bottom: 30px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    h1 {
      font-size: 2.25rem;
      margin: 0 0 30px 0;
      color: #111827;
      font-weight: 700;
      border-bottom: 3px solid #e5e7eb;
      padding-bottom: 15px;
      position: relative;
    }

    h1::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 0;
      width: 60px;
      height: 3px;
      background: #3b82f6;
      border-radius: 2px;
    }

    h2 {
      font-size: 1.875rem;
      margin: 35px 0 20px 0;
      color: #1f2937;
      font-weight: 600;
    }

    h3 {
      font-size: 1.5rem;
      margin: 25px 0 15px 0;
      color: #374151;
      font-weight: 600;
    }

    h4, h5, h6 {
      margin: 20px 0 10px 0;
      color: #4b5563;
      font-weight: 600;
    }

    p {
      margin-bottom: 18px;
      text-align: justify;
      color: #374151;
    }

    code {
      background: #f1f5f9;
      color: #dc2626;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Consolas', monospace;
      font-size: 0.875em;
      font-weight: 500;
    }

    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
      overflow-x: auto;
      margin: 25px 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    pre code {
      background: none;
      color: #1e293b;
      padding: 0;
      font-size: 0.9em;
    }

    ul, ol {
      margin: 18px 0;
      padding-left: 30px;
    }

    ul {
      list-style: none;
    }

    ul li {
      margin: 8px 0;
      position: relative;
      padding-left: 20px;
    }

    ul li::before {
      content: '•';
      color: #3b82f6;
      font-weight: bold;
      position: absolute;
      left: 0;
      top: 0;
      line-height: inherit;
      font-size: 1em;
    }

    ol li {
      margin: 8px 0;
    }

    a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
    }

    a:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    th, td {
      border: 1px solid #e5e7eb;
      padding: 14px 16px;
      text-align: left;
    }

    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      font-size: 0.875em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    tr:nth-child(even) {
      background: #fafafa;
    }

    blockquote {
      border-left: 4px solid #3b82f6;
      margin: 25px 0;
      padding: 16px 24px;
      background: #f8fafc;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: #4b5563;
    }

    blockquote p {
      margin-bottom: 8px;
    }

    .mermaid {
      text-align: center;
      margin: 35px 0;
      padding: 30px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .mermaid svg {
      max-width: 100%;
      height: auto;
    }

    strong {
      font-weight: 600;
      color: #111827;
    }

    em {
      font-style: italic;
      color: #6b7280;
    }

    hr {
      border: none;
      height: 1px;
      background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
      margin: 40px 0;
    }

    @media (max-width: 768px) {
      body {
        padding: 20px 15px;
        font-size: 15px;
      }
      
      .toc, .chapter {
        padding: 25px 20px;
      }
      
      h1 {
        font-size: 1.875rem;
      }
      
      h2 {
        font-size: 1.5rem;
      }
    }

    @media print {
      body {
        margin: 0;
        padding: 15pt;
        font-size: 11pt;
        background: white;
      }
      
      .toc {
        page-break-after: always;
        box-shadow: none;
      }
      
      .chapter {
        page-break-inside: avoid;
        box-shadow: none;
        border: 1px solid #ccc;
      }
      
      h1 {
        page-break-before: always;
        page-break-after: avoid;
      }
      
      h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      
      .mermaid {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${toc}
  ${content}
  <script>
    document.querySelectorAll('.toc a').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  </script>
</body>
</html>
`;

// Recursive function to find all .md files
async function findMarkdownFiles(dir) {
  let mdFiles = [];
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        mdFiles = mdFiles.concat(await findMarkdownFiles(fullPath));
      } else if (file.name.endsWith('.md')) {
        mdFiles.push(fullPath);
      }
    }
  } catch (error) {
    logger.error(`Error reading directory ${dir}:`, error);
  }
  return mdFiles;
}

// Extract TOC from files
async function extractTOC(files) {
  const indexPath = files.find(f => path.basename(f) === 'index.md');
  let title = 'Documentation';

  try {
    if (indexPath) {
      const indexContent = await fs.readFile(indexPath, 'utf8');
      const titleMatch = indexContent.match(/^\s*#\s+(.+)/m);
      if (titleMatch) title = titleMatch[1];
    }

    const tocItems = [];
    if (indexPath) {
      tocItems.push('<li><a href="#introduction">Introduction</a></li>');
    }

    const sortedFiles = files
      .filter(f => path.basename(f) !== 'index.md')
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

    for (const file of sortedFiles) {
      const fileName = path.basename(file);
      const chapterNum = fileName.match(/^\d+/)?.[0];
      const chapterName = fileName
        .replace(/^\d+_/, '')
        .replace(/\.md$/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      const slug = chapterName.toLowerCase().replace(/\s+/g, '-');
      tocItems.push(`<li><a href="#${chapterNum ? `chapter-${chapterNum}` : slug}">${chapterNum ? `Chapter ${chapterNum}: ` : ''}${chapterName}</a></li>`);
    }

    const tocHtml = `
      <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
          ${tocItems.join('\n          ')}
        </ul>
      </div>
    `;

    return { toc: tocHtml, title };
  } catch (error) {
    logger.error('Could not extract TOC:', error);
    return {
      toc: `
        <div class="toc">
          <h2>Table of Contents</h2>
          <ul>
            <li><a href="#introduction">Introduction</a></li>
          </ul>
        </div>
      `,
      title: 'Documentation'
    };
  }
}

// Process ZIP file and convert to HTML
async function processZipToHtml(zipPath) {
  const tempFolder = path.join(__dirname, '../../temp_extracted_' + Date.now());
  try {
    // Extract ZIP
    await fs.mkdir(tempFolder, { recursive: true });
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempFolder, true);

    // Find all Markdown files recursively
    const mdFiles = await findMarkdownFiles(tempFolder);
    logger.info('Found Markdown files:', mdFiles.map(f => path.relative(tempFolder, f)));

    if (mdFiles.length === 0) {
      throw new Error('No .md files found in the ZIP file');
    }

    const { toc, title } = await extractTOC(mdFiles);
    let combinedContent = '';

    // Process index.md first
    const indexFile = mdFiles.find(f => path.basename(f) === 'index.md');
    if (indexFile) {
      try {
        const content = await fs.readFile(indexFile, 'utf8');
        const cleanContent = content.replace(/## Chapters[\s\S]*?---\s*/, '');
        // Preprocess Mermaid diagrams
        const processedContent = await preprocessMermaid(cleanContent);
        const html = await marked.parse(processedContent);
        combinedContent += `<div id="introduction" class="chapter">${html}</div>`;
      } catch (error) {
        logger.error('Error processing index.md:', error);
      }
    }

    // Process other chapters
    const chapterFiles = mdFiles
      .filter(f => path.basename(f) !== 'index.md')
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

    for (const file of chapterFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const fileName = path.basename(file);
        const chapterNum = fileName.match(/^\d+/)?.[0];
        const chapterName = fileName
          .replace(/^\d+_/, '')
          .replace(/\.md$/, '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        const slug = chapterName.toLowerCase().replace(/\s+/g, '-');
        // Preprocess Mermaid diagrams
        const processedContent = await preprocessMermaid(content);
        const html = await marked.parse(processedContent);
        combinedContent += `<div id="${chapterNum ? `chapter-${chapterNum}` : slug}" class="chapter">${html}</div>`;
      } catch (error) {
        logger.error(`Error processing ${file}:`, error);
      }
    }

    // Generate final HTML
    return htmlTemplate(combinedContent, toc, title);
  } catch (error) {
    logger.error('Error in processZipToHtml:', error);
    throw error;
  } finally {
    // Clean up temp folder
    try {
      await fs.rm(tempFolder, { recursive: true });
    } catch (error) {
      logger.error('Error cleaning up temp folder:', error);
    }
  }
}

exports.convertZipToPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No ZIP file provided'
      });
    }

    const options = {
      scale: parseFloat(req.body.scale) || 1.0,
      format: req.body.format || 'A4',
      orientation: req.body.orientation || 'portrait',
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    };

    const zipPath = req.file.path;
    const htmlContent = await processZipToHtml(zipPath);

    // Clean up uploaded ZIP file
    try {
      await fs.unlink(zipPath);
    } catch (error) {
      logger.error('Error cleaning up uploaded ZIP file:', error);
    }

    const pdfBuffer = await pdfService.generatePdf(htmlContent, options);
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    res.json({
      success: true,
      data: base64Pdf,
      metadata: {
        format: options.format,
        orientation: options.orientation,
        scale: options.scale,
        size: pdfBuffer.length
      }
    });
  } catch (error) {
    logger.error('Error in ZIP to PDF conversion:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'ZIP to PDF conversion failed'
    });
  }
};