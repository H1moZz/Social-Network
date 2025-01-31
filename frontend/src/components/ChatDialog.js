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
                <button className='custom-button'>
  <div class="svg-wrapper-1">
    <div class="svg-wrapper">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
      >
        <path fill="none" d="M0 0h24v24H0z"></path>
        <path
          fill="currentColor"
          d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
        ></path>
      </svg>
    </div>
  </div>
  <span>Send</span>
</button>
            </div>
        </div>
    );
};

export default ChatDialog;