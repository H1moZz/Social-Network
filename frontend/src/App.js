import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from "./components/Login";
import UserProfile from "./components/UserProfile";
import UploadAvatar from "./components/UploadAvatar";
import UserList from "./components/UserList";
import MessageNotification from "./components/MessageNotification";
import socket from "./components/webSocket";
import MessengerLayout from './components/MessengerLayout';
import AdminRegister from './components/AdminRegister';
import AdminUsers from './components/AdminUsers';
import api from './api';
import Header from './components/Header';

const AppContent = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [newMessage, setNewMessage] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/api/auth/check_session', { withCredentials: true });
        setIsAuthenticated(response.data.is_authenticated);
        setUser(response.data.user);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();

    socket.on('user_connected', (data) => {
      console.log("User connected via socket:", data);
    });

    socket.on('new_message_sended', (data) => {
      if (user && user.id !== data.sender_id)
      {
        setNewMessage(data);
      }
    });

    return () => {
      socket.off('new_message_sended');
      socket.off('user_connected');
    };
  }, []);

  if (loading) {
    return <div>Загрузка приложения...</div>;
  }

  const PrivateRoute = ({ element: Element, ...rest }) => {
    return isAuthenticated ? <Element {...rest} user={rest.user} /> : <Navigate to="/login" />;
  };

  const AdminRoute = ({ element: Element, ...rest }) => {
    return isAuthenticated && rest.user?.is_admin ? <Element {...rest} user={rest.user} /> : <Navigate to="/" />;
  };

  return (
    <>
      <MessageNotification newMessage={newMessage} />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/admin/register" element={
          <AdminRoute element={AdminRegister} user={user} />
        } />
        <Route path="/admin/users" element={
          <AdminRoute element={AdminUsers} user={user} />
        } />
        <Route path="/" element={<PrivateRoute element={MessengerLayout} setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />} />
        <Route path="/chats" element={<PrivateRoute element={MessengerLayout} setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />} />
        <Route path="/chats/:chatId" element={<PrivateRoute element={MessengerLayout} setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />} />
        <Route path="/profile" element={<PrivateRoute element={UserProfile} user={user} />} />
        <Route path="/avatar" element={<PrivateRoute element={UploadAvatar} user={user} />} />
        <Route path="/users" element={<PrivateRoute element={UserList} user={user} />} />
        <Route path="*" element={<Navigate to="/login" />} />
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
