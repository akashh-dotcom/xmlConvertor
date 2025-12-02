const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../my-first-app/dist')));

// Ensure data directory exists
const ensureDataDir = async () => {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
};

// WebSocket connection handling for real-time sync
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  clients.set(clientId, ws);

  console.log(`Client connected: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Broadcast to all other clients
      clients.forEach((client, id) => {
        if (id !== clientId && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });
});

// API Routes

// Get all documents
app.get('/api/documents', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const documents = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
          return JSON.parse(content);
        })
    );

    res.json(documents);
  } catch (error) {
    console.error('Error reading documents:', error);
    res.status(500).json({ error: 'Failed to read documents' });
  }
});

// Get single document by ID
app.get('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(DATA_DIR, `${id}.json`);

    const content = await fs.readFile(filePath, 'utf-8');
    const document = JSON.parse(content);

    res.json(document);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Document not found' });
    } else {
      console.error('Error reading document:', error);
      res.status(500).json({ error: 'Failed to read document' });
    }
  }
});

// Create new document
app.post('/api/documents', async (req, res) => {
  try {
    const { title, xmlContent, htmlContent } = req.body;

    if (!xmlContent) {
      return res.status(400).json({ error: 'XML content is required' });
    }

    const document = {
      id: uuidv4(),
      title: title || 'Untitled Document',
      xmlContent,
      htmlContent: htmlContent || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const filePath = path.join(DATA_DIR, `${document.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(document, null, 2));

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document
app.put('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, xmlContent, htmlContent } = req.body;

    const filePath = path.join(DATA_DIR, `${id}.json`);

    // Read existing document
    const content = await fs.readFile(filePath, 'utf-8');
    const document = JSON.parse(content);

    // Update fields
    if (title !== undefined) document.title = title;
    if (xmlContent !== undefined) document.xmlContent = xmlContent;
    if (htmlContent !== undefined) document.htmlContent = htmlContent;
    document.updatedAt = new Date().toISOString();

    // Save updated document
    await fs.writeFile(filePath, JSON.stringify(document, null, 2));

    // Broadcast update to WebSocket clients
    const updateMessage = JSON.stringify({
      type: 'document-updated',
      documentId: id,
      document
    });

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(updateMessage);
      }
    });

    res.json(document);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Document not found' });
    } else {
      console.error('Error updating document:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }
});

// Delete document
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(DATA_DIR, `${id}.json`);

    await fs.unlink(filePath);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Document not found' });
    } else {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../my-first-app/dist/index.html'));
});

// Start server
const startServer = async () => {
  await ensureDataDir();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Data directory: ${DATA_DIR}`);
    console.log(`🔌 WebSocket server ready for real-time sync`);
  });
};

startServer().catch(console.error);
