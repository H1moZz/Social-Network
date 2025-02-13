import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import api from "./api";
import Login from "./components/Login";
import UserProfile from "./components/UserProfile";
import ChatList from "./components/ChatList";
import UploadAvatar from "./components/UploadAvatar";
import ChatDialog from "./components/ChatDialog";
import Navbar from "./components/NavBar";
import RegisterPage from "./components/RegisterPage";

const AppContent = () => {
  const location = useLocation();
  const hiddenRoutes = ["/", "/register"];
  const isAuthenticated = localStorage.getItem("isAuthenticated");

  const hideNavbar = hiddenRoutes.includes(location.pathname) || !isAuthenticated;

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={isAuthenticated ? <UserProfile /> : <Navigate to="/" />} />
        <Route path="/avatar" element={isAuthenticated ? <UploadAvatar /> : <Navigate to="/" />} />
        <Route path="/chats" element={isAuthenticated ? <ChatList /> : <Navigate to="/" />} />
        <Route path="/chats/:chatId" element={isAuthenticated ? <ChatDialog /> : <Navigate to="/" />} />

        {/* Редирект на логин, если страница не найдена */}
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
