# XML Editor Backend API

Backend server for the XML to HTML Editor application with real-time sync capabilities.

## Features

- **RESTful API** for document CRUD operations
- **WebSocket** support for real-time collaboration
- **File-based storage** (easy to upgrade to database)
- **Auto-save** integration
- **CORS enabled** for frontend integration

## Installation

```bash
cd backend
npm install
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server will run on `http://localhost:3001`

## API Endpoints

### Documents

#### GET /api/documents
Get all documents
```bash
curl http://localhost:3001/api/documents
```

#### GET /api/documents/:id
Get a single document by ID
```bash
curl http://localhost:3001/api/documents/[document-id]
```

#### POST /api/documents
Create a new document
```bash
curl -X POST http://localhost:3001/api/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"My Document","xmlContent":"<?xml version=\"1.0\"?>..."}'
```

#### PUT /api/documents/:id
Update an existing document
```bash
curl -X PUT http://localhost:3001/api/documents/[document-id] \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","xmlContent":"<?xml version=\"1.0\"?>..."}'
```

#### DELETE /api/documents/:id
Delete a document
```bash
curl -X DELETE http://localhost:3001/api/documents/[document-id]
```

### Health Check

#### GET /api/health
Check if server is running
```bash
curl http://localhost:3001/api/health
```

## WebSocket

Connect to `ws://localhost:3001` for real-time updates.

### Message Format
```json
{
  "type": "document-updated",
  "documentId": "uuid",
  "document": {
    "id": "uuid",
    "title": "Document Title",
    "xmlContent": "...",
    "htmlContent": "...",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Data Storage

Documents are stored as JSON files in the `backend/data/` directory.

Each document file is named `[document-id].json` and contains:
```json
{
  "id": "uuid",
  "title": "Document Title",
  "xmlContent": "<?xml version='1.0'?>...",
  "htmlContent": "<div>...</div>",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Environment Variables

- `PORT` - Server port (default: 3001)

## Upgrading to Database

To upgrade from file storage to a database (MongoDB, PostgreSQL, etc.):

1. Install database driver:
```bash
npm install mongodb
# or
npm install pg
```

2. Create database connection in `db.js`
3. Replace file operations in `server.js` with database queries
4. Keep the same API interface

## Architecture

```
backend/
├── server.js       # Main Express server
├── routes/         # API route handlers (future)
├── data/           # JSON file storage
├── package.json    # Dependencies
└── README.md       # This file
```

## Tech Stack

- **Express.js** - Web framework
- **WebSocket (ws)** - Real-time communication
- **CORS** - Cross-origin requests
- **UUID** - Unique document IDs
- **Node.js File System** - Data persistence

## Security Notes

For production deployment:
- Add authentication/authorization
- Implement rate limiting
- Validate and sanitize all inputs
- Use HTTPS/WSS
- Add request logging
- Implement backup system
- Consider database instead of file storage

## Future Enhancements

- [ ] User authentication
- [ ] Document sharing/permissions
- [ ] Version history
- [ ] Real-time collaborative editing
- [ ] Database integration
- [ ] Document templates
- [ ] Export to multiple formats
- [ ] Full-text search
