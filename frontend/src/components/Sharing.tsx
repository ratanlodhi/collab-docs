import React, { useState } from 'react';

interface SharingProps {
  documentId: string;
}

const Sharing: React.FC<SharingProps> = ({ documentId }) => {
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [shareLink, setShareLink] = useState('');
  const [error, setError] = useState('');

  const generateShareLink = async () => {
    setError('');
    setShareLink('');
    try {
      const response = await fetch(`http://localhost:5000/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission }),
      });
      if (!response.ok) {
        const errData = await response.json();
        setError(errData.message || 'Failed to generate share link');
        return;
      }
      const data = await response.json();
      setShareLink(data.shareLink);
    } catch (err) {
      setError('Network error generating share link');
    }
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      alert('Share link copied to clipboard');
    }
  };

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h3>Share Document</h3>
      <div>
        <label>
          Permission:
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as 'viewer' | 'editor')}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="viewer">Viewer (Read-only)</option>
            <option value="editor">Editor (Can edit)</option>
          </select>
        </label>
      </div>
      <button onClick={generateShareLink} style={{ marginTop: '0.5rem' }}>
        Generate Share Link
      </button>
      {error && <div style={{ color: 'red', marginTop: '0.5rem' }}>{error}</div>}
      {shareLink && (
        <div style={{ marginTop: '0.5rem' }}>
          <input type="text" value={shareLink} readOnly style={{ width: '100%' }} />
          <button onClick={copyToClipboard} style={{ marginTop: '0.25rem' }}>
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
};

export default Sharing;
