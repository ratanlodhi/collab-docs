
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const Document = require('./models/Document');

// MongoDB connection
const mongoURI = 'mongodb://localhost:27017/collab-docs';
mongoose.connect(mongoURI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Check if default document exists, create it if not
    try {
      let defaultDoc = await Document.findOne({ documentId: 'default' });
      if (!defaultDoc) {
        defaultDoc = new Document({
          documentId: 'default',
          title: 'Default Document',
          content: 'This is the default document.',
        });
        await defaultDoc.save();
        console.log('Default document created.');
      }
    } catch (err) {
      console.error('Error checking/creating default document:', err);
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Add mongoose connection event listeners for better logging and diagnostics
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.warn('Mongoose disconnected from MongoDB');
});

// Optional: handle process termination to close mongoose connection gracefully
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed due to app termination');
  process.exit(0);
});

// REST API endpoint to create a new document
app.post('/documents', async (req, res) => {
  try {
    const { documentId, title, content } = req.body;
    let document = await Document.findOne({ documentId });
    if (document) {
      return res.status(400).json({ message: 'Document already exists' });
    }
    document = new Document({ documentId, title, content });
    await document.save();
    res.status(201).json(document);
  } catch (error) {
    console.error('Error in POST /documents:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// REST API to create sharing link with permission mode (viewer/editor)
app.post('/documents/:id/share', async (req, res) => {
  try {
    const documentId = req.params.id;
    let { permission } = req.body;
    permission = permission === 'viewer' ? 'viewer' : 'editor'; // default to editor if invalid

    const document = await Document.findOne({ documentId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Generate a simple random share token (for demo purposes, can be improved)
    const shareToken = Math.random().toString(36).substr(2, 9);

    // Add token to document permissions map
    document.permissions.set(shareToken, permission);
    await document.save();

    // Return shareable link (frontend to use this)
    const shareLink = `${req.protocol}://${req.get('host')}/documents/${documentId}?shareToken=${shareToken}`;
    res.json({ shareLink, permission });
  } catch (error) {
    console.error('Error creating sharing link:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// REST API endpoint to get document by id with enhanced error logging
app.get('/documents/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    const shareToken = req.query.shareToken;

    const document = await Document.findOne({ documentId });
    if (!document) {
      console.warn(`Document with id ${documentId} not found`);
      return res.status(404).json({ message: 'Document not found' });
    }

    // Determine permission mode from shareToken, default to editor if no token or invalid
    let permission = 'editor';
    if (shareToken) {
      const permFromToken = document.permissions.get(shareToken);
      if (!permFromToken) {
        // Invalid share token
        return res.status(403).json({ message: 'Invalid share token' });
      }
      permission = permFromToken;
    }

    // Return document data along with permission mode
    res.json({
      documentId: document.documentId,
      title: document.title,
      content: document.content,
      permission,
    });
  } catch (error) {
    console.error(`Server error on GET /documents/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected, socket id:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected, socket id:', socket.id);
  });

  // Socket event handlers
  socket.on('join-document', async ({ documentId, shareToken }) => {
    // Validate the shareToken if provided
    const document = await Document.findOne({ documentId });
    if (!document) {
      socket.emit('error', 'Document not found');
      return;
    }

    let permission = 'editor'; // default permission
    if (shareToken) {
      const permFromToken = document.permissions.get(shareToken);
      if (!permFromToken) {
        socket.emit('error', 'Invalid share token');
        return;
      }
      permission = permFromToken;
    }

    socket.data.permission = permission;
    socket.data.documentId = documentId;
    socket.data.shareToken = shareToken;

    socket.join(documentId);
    console.log(`Socket ${socket.id} joined document ${documentId} with permission ${permission}`);

    socket.emit('load-document', { content: document.content, permission });
  });

  socket.on('send-changes', (delta) => {
    // Only allow if permission is editor
    const permission = socket.data.permission;
    if (permission !== 'editor') {
      console.log(`Socket ${socket.id} attempted to send-changes without permission.`);
      return;
    }

    // Broadcast received changes to other clients in the same document room
    const documentId = socket.data.documentId;
    socket.to(documentId).emit('receive-changes', delta);
  });

  socket.on('save-document', async ({ documentId, content }) => {
    try {
      // Check permission before saving
      const permission = socket.data.permission;
      if (permission !== 'editor') {
        console.log(`Socket ${socket.id} attempted to save-document without permission.`);
        return;
      }

      await Document.findOneAndUpdate(
        { documentId },
        { content, lastUpdated: Date.now() },
        { upsert: true }
      );
      console.log(`Document ${documentId} saved.`);
    } catch (error) {
      console.error('Error saving document:', error);
    }
  });
});

module.exports = { app, server, io };
