
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DocumentEditor from './components/DocumentEditor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/documents/:id" element={<DocumentEditor />} />
        <Route path="*" element={<Navigate to="/documents/default" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
