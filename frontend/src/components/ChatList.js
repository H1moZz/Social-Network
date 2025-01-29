import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatList.css';
import api from '../api';

const ChatList = () => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await api.post('auth/logout', {}, { withCredentials: true });

            navigate('/');
        } catch (error) {
            console.error("Ошибка при выходе:", error);
        }
    };

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const response = await api.get('/messenger/chats', {
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
            <button onClick={handleLogout} className="logout-button">
                Выйти из профиля
            </button>
            {chats.length === 0 ? (
                <p>No chats found. Start a new conversation!</p>
            ) : (
                <ul>
                    {chats.map((chat) => (
                        <li key={chat.id} onClick={() => handleChatClick(chat.id)}>
                            <div className="chat-item">
                                <h3>Chat with {chat.participants.join(', ')}</h3>
                                <p>Chat ID: {chat.id}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ChatList;