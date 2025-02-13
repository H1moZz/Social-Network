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
    const [loading, setLoading] = useState(false);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(true); // Стейт для проверки, внизу ли мы

    const messagesEndRef = useRef(null);
    const [lastMessageId, setLastMessageId] = useState(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const messagesContainerRef = useRef(null);
    const scrollPositionRef = useRef(0); // Реф для текущей позиции скролла
    const previousMessagesLength = useRef(0); // Реф для отслеживания количества сообщений перед подгрузкой

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };
    const scrollToBottomAuto = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    };

    const checkIfScrolledToBottom = () => {
        const container = messagesContainerRef.current;
        const isAtBottom = container.scrollHeight === container.scrollTop + container.clientHeight;
        setIsScrolledToBottom(isAtBottom);
    };

    const loadHistory = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/messenger/chats/${chatId["chatId"]}/messages`, {
                withCredentials: true,
            });
            setMessages(res.data);
            scrollToBottomAuto();
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadOlderMessages = async () => {
        if (loading || !hasMoreMessages || messages.length === 0) return;  
    
        console.log("ДОГРУЖАЮ...");
        const container = messagesContainerRef.current;
        if (!container) return;
    
        const previousScrollHeight = container.scrollHeight;  
        setLoading(true);
    
        try {
            const oldestMessageId = messages[0]?.id; // Берем ID самого старого сообщения перед загрузкой
            const res = await api.get(`/api/messenger/chats/${chatId["chatId"]}/messages`, {
                params: { before: oldestMessageId },
                withCredentials: true,
            });
    
            if (res.data.length === 0 || res.data[0]?.id === lastMessageId) {
                setHasMoreMessages(false);
                console.log("Больше сообщений нет");
            } else {
                setMessages((prevMessages) => [...res.data, ...prevMessages]);
                setLastMessageId(res.data[0]?.id);
            }
        } catch (error) {
            console.error('Ошибка загрузки старых сообщений:', error);
        } finally {
            setLoading(false);
    
            requestAnimationFrame(() => {
                const newScrollHeight = container.scrollHeight;
                container.scrollTop = newScrollHeight - previousScrollHeight;
            });
        }
    };

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const isAtTop = container.scrollTop <= 1;

        if (isAtTop && !loading) {
            scrollPositionRef.current = container.scrollTop;
            previousMessagesLength.current = messages.length;
            loadOlderMessages();
        }

        checkIfScrolledToBottom();
    };

    useEffect(() => {
        socketRef.current = io(api.getUri(), {
            transports: ['websocket'],
        });
        socketRef.current.on('user_connected', (data) => {
            if (!userId) {
                setUserId(data.user_id);
            }
        });
        socketRef.current.emit('join_chat', {
            chat_id: chatId["chatId"],
        });

        loadHistory();

        socketRef.current.on('new_message', (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, [chatId["chatId"]]);

    // Проверка и прокрутка вниз, если нужно
    useEffect(() => {
        if (isScrolledToBottom) {
            scrollToBottom();
        }
    }, [messages, isScrolledToBottom]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        const initialHeight = container.scrollHeight;

        if (initialHeight === container.scrollTop + container.clientHeight) {
            scrollToBottom();
        }
    }, [messages]); 

    const sendMessage = () => {
        if (message.trim()) {
            if (socketRef.current) {
                socketRef.current.emit('send_message', {
                    content: message,
                    chat_id: chatId["chatId"],
                    user_id: userId,
                });
                setMessage('');
                setTimeout(() => {
                    scrollToBottom();
                }, 100);
            } else {
                console.error('Socket not connected.');
            }
        }
    };

    return (
        <div className="chat-container">
            <div
                className="messages"
                ref={messagesContainerRef}
                onScroll={handleScroll}
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`message ${msg.sender_id === userId ? 'own' : 'other'}`}
                    >
                        <div className="content">{msg.content}</div>
                        <div className="time">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>
                    </div>
                ))}
                {loading && <div className="loading">Загрузка...</div>} {/* Показываем индикатор загрузки */}
                <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Напишите сообщение..."
                />
                <button className="custom-button" onClick={sendMessage}>
                    <div className="svg-wrapper-1">
                        <div className="svg-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
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
