import React, { useEffect, useState } from 'react';
import './ChatList.css';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const ChatList = () => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const response = await api.get('/api/messenger/chats', {
                    withCredentials: true, 
                });
                setChats(response.data);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchChats();
    }, []);

    const handleChatClick = (chatId) => {
        navigate(`/chats/${chatId}`);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="chat-list">
            <h1>Your Chats</h1>
            {chats.length === 0 ? (
                <p>No chats found. Start a new conversation!</p>
            ) : (
                <ul>
                    {chats.map((chat) => (
                        <li key={chat.id} onClick={() => handleChatClick(chat.id)}>
                            <div className="chat-item">
                                <h3>Chat with {chat.participants}</h3>  
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ChatList;