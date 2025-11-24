# TODO: Real-time Collaboration with Sharing & Permission Modes Implementation

## Backend
- [ ] Extend Document schema (backend/models/Document.js) to add sharing permissions (e.g., map of share tokens to permission modes)
- [ ] Add REST API endpoint in backend/server.js to create and manage sharing links with permission modes (viewer/editor)
- [ ] Modify socket.io 'join-document' and REST document fetch endpoints to validate permission from share token or query param and enforce permission modes
- [ ] Add permission enforcement logic for socket events like 'send-changes' and 'save-document' based on permission mode

## Frontend
- [ ] Create Sharing component (frontend/src/components/Sharing.tsx)
  - UI to generate sharing link with selected permission mode
  - Show/copy shareable link for users
- [ ] Update DocumentEditor.tsx to:
  - Read permission mode from URL query param or backend API
  - Disable editing and sending changes if permission mode is 'viewer'
  - Integrate Sharing component UI for creating sharing links
- [ ] Update ReactQuill editor toolbar and interaction based on permission mode

## Testing
- [ ] Test backend permission checks and link generation
- [ ] Test frontend permission-based UI for viewer/editor
- [ ] Test real-time collaboration with multiple clients and different permission modes
- [ ] Validate sharing link functionality and permission enforcement
