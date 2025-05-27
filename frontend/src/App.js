import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from "./components/Login";
import UserProfile from "./components/UserProfile";
import UploadAvatar from "./components/UploadAvatar";
import RegisterPage from "./components/RegisterPage";
import UserList from "./components/UserList";
import MessageNotification from "./components/MessageNotification";
import socket from "./components/webSocket";
import MessengerLayout from './components/MessengerLayout';

const AppContent = () => {
  const location = useLocation();
  const hiddenRoutes = ["/", "/register"];
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const [newMessage, setNewMessage] = useState(null);

  useEffect(() => {
    socket.on('user_connected', (data) =>{
      localStorage.setItem("current_user", data.user_id)
    });

    socket.on('new_message_sended', (data) => {
      if (localStorage.getItem("current_user") != data.sender_id)
      {
        setNewMessage(data);
      }
    });

    return () => {
      socket.off('new_message_sended');
    };
  }, []);

  return (
    <>
      <MessageNotification newMessage={newMessage} />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={isAuthenticated ? <UserProfile /> : <Navigate to="/" />} />
        <Route path="/avatar" element={isAuthenticated ? <UploadAvatar /> : <Navigate to="/" />} />
        <Route path="/users" element={isAuthenticated ? <UserList /> : <Navigate to="/" />} />
        <Route path="/chats" element={<MessengerLayout />} />
        <Route path="/chats/:chatId" element={<MessengerLayout />} />
        <Route path="*" element={<Navigate to="/" />} />
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
