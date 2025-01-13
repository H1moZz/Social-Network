import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import NavBar from './components/NavBar';
import UploadAvatar from './components/UploadAvatar';

function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/profile" element={<UserProfile/>} />
        <Route path ="/avatar" element={<UploadAvatar/>}/>
      </Routes>
    </Router>
  );
}

export default App;