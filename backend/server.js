

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

const io = socketio(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: FRONTEND_ORIGIN,
}));
app.use(express.json());

const dotenv = require('dotenv');
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getDocumentByDocumentId(documentId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('documentId', documentId)
    .single();
  if (error) throw error;
  return data;
}

async function createDocument(document) {
  const { data, error } = await supabase
    .from('documents')
    .insert([document]);
  if (error) throw error;
  return data;
}

async function updateDocumentContent(documentId, content) {
  const { data, error } = await supabase
    .from('documents')
    .update({ content, lastUpdated: new Date().toISOString() })
    .eq('documentId', documentId);
  if (error) throw error;
  return data;
}

async function updateDocumentPermissions(documentId, permissions) {
  const { data, error } = await supabase
    .from('documents')
    .update({ permissions })
    .eq('documentId', documentId);
  if (error) throw error;
  return data;
}

// Check if default document exists, create it if not
(async function checkDefaultDocument() {
  try {
    let defaultDoc = null;
    try {
      defaultDoc = await supabase
        .from('documents')
        .select('*')
        .eq('documentId', 'default')
        .maybeSingle();
    } catch (error) {
      // may still throw error, fallback to null
      defaultDoc = null;
    }

    if (!defaultDoc || defaultDoc.data === null) {
      const defaultDocument = {
        documentId: 'default',
        title: 'Default Document',
        content: 'This is the default document.',
        lastUpdated: new Date().toISOString(),
        permissions: {},
      };
      await createDocument(defaultDocument);
      console.log('Default document created.');
    } else {
      console.log('Default document exists.');
    }
  } catch (err) {
    console.error('Error checking/creating default document:', err);
  }
})();


const BACKEND_HOSTNAME = process.env.BACKEND_HOSTNAME || `localhost:${process.env.PORT || 5000}`;
const FRONTEND_HOSTNAME = process.env.FRONTEND_HOSTNAME || 'localhost:3000';

// REST API endpoint to create a new document
app.post('/documents', async (req, res) => {
  try {
    const { documentId, title, content } = req.body;
    let document = null;
    try {
      document = await getDocumentByDocumentId(documentId);
    } catch (err) {
      document = null;
    }
    if (document) {
      return res.status(400).json({ message: 'Document already exists' });
    }
    const newDocument = {
      documentId,
      title,
      content,
      lastUpdated: new Date().toISOString(),
      permissions: {},
    };
    await createDocument(newDocument);
    res.status(201).json(newDocument);
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

    const document = await getDocumentByDocumentId(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Generate a simple random share token (for demo purposes, can be improved)
    const shareToken = Math.random().toString(36).substr(2, 9);

    // Update permissions object
    const permissions = document.permissions || {};
    permissions[shareToken] = permission;

    await updateDocumentPermissions(documentId, permissions);

    // Return shareable link (frontend to use this)
    const shareLink = `${req.protocol}://${FRONTEND_HOSTNAME}/documents/${documentId}?shareToken=${shareToken}`;
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

    const document = await getDocumentByDocumentId(documentId);
    if (!document) {
      console.warn(`Document with id ${documentId} not found`);
      return res.status(404).json({ message: 'Document not found' });
    }

    // Determine permission mode from shareToken, default to editor if no token or invalid
    let permission = 'editor';
    if (shareToken) {
      const permFromToken = document.permissions ? document.permissions[shareToken] : null;
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
    try {
      const document = await getDocumentByDocumentId(documentId);
      if (!document) {
        socket.emit('error', 'Document not found');
        return;
      }

      let permission = 'editor'; // default permission
      if (shareToken) {
        const permFromToken = document.permissions ? document.permissions[shareToken] : null;
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
    } catch (error) {
      console.error('Error in join-document socket event:', error);
      socket.emit('error', 'Server error');
    }
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

      await updateDocumentContent(documentId, content);
      console.log(`Document ${documentId} saved.`);
    } catch (error) {
      console.error('Error saving document:', error);
    }
  });
});

module.exports = { app, server, io };
