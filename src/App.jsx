import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import RoadmapEditor from './components/editor/RoadmapEditor';
import './styles/global.css';

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (loadingAuth) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      {!user ? (
        <Login />
      ) : (
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/map/:roadmapId" element={<RoadmapEditor user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
