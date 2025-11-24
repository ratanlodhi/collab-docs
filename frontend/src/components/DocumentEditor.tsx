import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { io, Socket } from 'socket.io-client';
import Sharing from './Sharing';

const SAVE_INTERVAL_MS = 2000;

interface DocumentData {
  documentId: string;
  title: string;
  content: string;
  permission: 'viewer' | 'editor';
}

const DocumentEditor: React.FC = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const shareToken = queryParams.get('shareToken');

  const [title, setTitle] = useState('Untitled Document');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [content, setContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [permission, setPermission] = useState<'viewer' | 'editor'>('editor');

  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    const s = io('http://localhost:5000');
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-document', { documentId, shareToken });

    socket.once('load-document', (data: { content: string; permission: 'viewer' | 'editor' }) => {
      setContent(data.content);
      setPermission(data.permission);
    });

    socket.on('receive-changes', (delta: any) => {
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        editor.updateContents(delta);
      }
    });

    socket.on('error', (message: string) => {
      alert(`Error: ${message}`);
    });

    return () => {
      socket.off('receive-changes');
      socket.off('error');
    };
  }, [socket, documentId, shareToken]);

  useEffect(() => {
    if (!socket) return;

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const handler = (delta: any, oldDelta: any, source: 'user' | 'api' | 'silent') => {
      if (source !== 'user') return;
      if (permission === 'editor') {
        socket.emit('send-changes', delta);
      }
    };

    editor.on('text-change', handler);

    return () => {
      editor.off('text-change', handler);
    };
  }, [socket, content, permission]);

  useEffect(() => {
    if (!socket) return;

    const interval = setInterval(() => {
      if (permission === 'editor') {
        setIsSaving(true);
        fetch(`http://localhost:5000/documents/${documentId}?shareToken=${shareToken ?? ''}`)
          .then((res) => {
            if (!res.ok) throw new Error('Save failed');
            return res.json();
          })
          .then(() => {
            setIsSaving(false);
          })
          .catch(() => {
            setIsSaving(false);
          });
        socket.emit('save-document', { documentId, content });
      }
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [socket, documentId, content, permission, shareToken, title]);

  useEffect(() => {
    fetch(`http://localhost:5000/documents/${documentId}?shareToken=${shareToken ?? ''}`)
      .then((res) => {
        if (!res.ok) throw new Error('Document not found');
        return res.json();
      })
      .then((data: DocumentData) => {
        setTitle(data.title);
        setContent(data.content);
        setPermission(data.permission);
      })
      .catch(() => {
        setTitle('Untitled Document');
        setContent('');
      });
  }, [documentId, shareToken]);

  const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (permission === 'editor') {
      setTitle(e.target.value);
    }
  }, [permission]);

  return (
    <div className="document-editor" style={{ padding: '1rem' }}>
      <input
        type="text"
        value={title}
        onChange={onTitleChange}
        placeholder="Document Title"
        disabled={permission === 'viewer'}
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          width: '100%',
          marginBottom: '1rem',
          backgroundColor: permission === 'viewer' ? '#f0f0f0' : 'inherit',
        }}
      />
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={setContent}
        modules={{
          toolbar: permission === 'editor'
            ? [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link', 'image'],
                ['clean'],
              ]
            : false,
        }}
        readOnly={permission === 'viewer'}
        onFocus={() => {
          if (quillRef.current) {
            const editor = quillRef.current.getEditor();
            if (permission === 'editor') {
              editor.enable();
            } else {
              editor.disable();
            }
          }
        }}
      />
      <div style={{ marginTop: '1rem' }}>
        {isSaving ? <em>Saving...</em> : <em>All changes saved</em>}
      </div>
      <Sharing documentId={documentId!} />
    </div>
  );
};

export default DocumentEditor;
