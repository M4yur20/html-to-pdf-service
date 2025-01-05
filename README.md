# HTML to PDF Conversion Service

A robust, production-ready microservice for converting HTML content or URLs to PDF documents. Built with Node.js, Express, and Puppeteer, featuring Redis caching, Google Cloud Storage integration, and comprehensive monitoring.

## Features

- Convert HTML content or URLs to PDF
- Customizable PDF output (format, orientation, scaling)
- Redis caching for improved performance
- Google Cloud Storage integration for PDF storage
- Basic authentication
- Rate limiting
- GCS Signed URL for PDF that is valid for 5 minutes
- Integrated Chromium browser for docker deployments
- Prometheus metrics
- Health check endpoints
- Comprehensive error handling and logging
- Docker support
- Multi-language font support

## Prerequisites

- Node.js (v20.11.1 or later)
- Redis server
- Google Cloud Storage account and credentials
- Docker (optional)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
NODE_ENV=production
API_USERNAME=your_username
API_PASSWORD=your_password
REDIS_URL=redis://localhost:6379
REDIS_TTL=300
GCS_PROJECT_ID=your_project_id
GCS_BUCKET_NAME=your_bucket_name
GCS_KEYFILE=path_to_your_keyfile.json
```

## Installation

### Using Docker

1. Build the Docker image:
```bash
docker build -t html-to-pdf-service .
```

2. Run the container:
```bash
docker run -p 3000:3000 --env-file .env html-to-pdf-service
```

### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/html-to-pdf-service.git
cd html-to-pdf-service
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

## API Endpoints

### Convert HTML to PDF
```http
POST /api/pdf/convert
```

#### Request Body
```json
{
  "input": "string",      // HTML content or URL
  "scale": 1,             // Optional: PDF scale (0.1 to 2)
  "format": "A4",         // Optional: A4, A3, or Letter
  "orientation": "portrait", // Optional: portrait or landscape
  "scaleX": 1,           // Optional: horizontal scale
  "scaleY": 1            // Optional: vertical scale
}
```

#### Response
```json
{
  "success": true,
  "url": "string",        // Signed URL to download the PDF
  "metadata": {
    "format": "string",
    "orientation": "string",
    "scale": number,
    "filename": "string",
    "size": number,
    "expiresAt": "string"
  }
}
```

### Health Check
```http
GET /api/health
GET /api/health/detailed
```

### Metrics
```http
GET /metrics
```

## Security

The service implements several security measures:
- Basic authentication
- Rate limiting (100 requests per 15 minutes per IP)
- Helmet.js for HTTP security headers
- CORS support
- Request size limits

## Monitoring

- Prometheus metrics available at `/metrics`
- Detailed health checks at `/api/health/detailed`
- Winston logger with file rotation
- Error tracking and reporting

## Performance

- Redis caching for frequently requested conversions
- Compression middleware
- Configurable cache TTL
- Automatic cleanup of old PDF files

## Error Handling

The service includes comprehensive error handling:
- Input validation
- Service availability checks
- Graceful shutdown
- Detailed error logging
- Production-safe error responses

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support, please create an issue in the repository's issue tracker.
