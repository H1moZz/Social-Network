import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import api from '../api';
import { useParams } from 'react-router-dom';
import './ChatDialog.css';


const ChatDialog = () => {
    const [message, setMessage] = useState('');
    const chatId = useParams();
    const [messages, setMessages] = useState([]);
    const socketRef = useRef();
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        socketRef.current = io('http://localhost:3001', {
            transports: ['websocket']
        });
        socketRef.current.on('user_connected', (data) => {
            console.log("User ID from server:", data.user_id);
            setUserId(data.user_id);
        });
        socketRef.current.emit('join_chat', {
            chat_id: chatId["chatId"],
        });

        const loadHistory = async () => {
            try {
                const res = await api.get(`/messenger/chats/${chatId["chatId"]}/messages`, {
                    withCredentials: true,
                });
                setMessages(res.data);
            } catch (error) {
                console.error("Ошибка загрузки сообщений:", error);
            }
        };
        loadHistory();

        socketRef.current.on('new_message', msg => {
            setMessages(prev => [...prev, msg]);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, [chatId["chatId"]]);

    const sendMessage = () => {
        if (message.trim()) {
            socketRef.current.emit('send_message', {
                content: message,
                chat_id: chatId["chatId"],
                user_id: userId
            });
            setMessage('');
        }
    };

    return (
        <div className="chat-container">
            <div className="messages">
                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`message ${msg.sender_id == userId ? 'own' : 'other'}`}
                    >
                        <div className="content">{msg.content}</div>
                        <div className="time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                ))}
            </div>
            <div className="input-area">
                <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Напишите сообщение..."
                />
                <button onClick={sendMessage}>Отправить</button>
            </div>
        </div>
    );
};

export default ChatDialog;