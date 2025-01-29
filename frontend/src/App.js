import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import ChatList from './components/ChatList';
import UploadAvatar from './components/UploadAvatar';
import ChatDialog from './components/ChatDialog';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/profile" element={<UserProfile/>} />
        <Route path ="/avatar" element={<UploadAvatar/>}/>
        <Route path="/chats" element={<ChatList />} />
        <Route path="/chats/:chatId" element={<ChatDialog/>}/>
      </Routes>
    </Router>
  );
}

export default App;