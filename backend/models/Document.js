const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    default: 'Untitled Document',
  },
  content: {
    type: String,
    default: '',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  // Permissions map: keys are share tokens, values are permission modes ('viewer' or 'editor')
  permissions: {
    type: Map,
    of: String,
    default: {},
  },
});

module.exports = mongoose.model('Document', DocumentSchema);
