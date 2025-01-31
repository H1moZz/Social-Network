import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import ChatList from './components/ChatList';
import UploadAvatar from './components/UploadAvatar';
import ChatDialog from './components/ChatDialog';
import Navbar from './components/NavBar';

const AppContent = () => {
  const location = useLocation();
  const hiddenRoutes = ["/" ];
  const hideNavbar = hiddenRoutes.includes(location.pathname);

  return (
      <>
          {!hideNavbar && <Navbar />}
          <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/avatar" element={<UploadAvatar />} />
              <Route path="/chats" element={<ChatList />} />
              <Route path="/chats/:chatId" element={<ChatDialog />} />
          </Routes>
      </>
  );
};

function App() {
  return (
      <Router>
          <AppContent />
      </Router>
  );
}

export default App;