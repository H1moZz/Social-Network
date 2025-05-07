import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './ChatList.css';
import socket from './webSocket';

const ChatList = () => {
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        console.log('Socket connection status:', socket.connected);
        
        if (!socket.connected) {
            socket.connect();
            console.log('Attempting to connect socket...');
        }

        socket.on('connect', () => {
            console.log('Socket connected successfully');
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('user_connected', (data) => {
            console.log('User connected:', data);
            setUserId(data.user_id);
        });

        const fetchChats = async () => {
            try {
                const response = await api.get('/api/messenger/chats', {
                    withCredentials: true
                });
                console.log('Fetched chats:', response.data);
                setChats(response.data);
                
                // Подключаемся к комнатам всех чатов
                response.data.forEach(chat => {
                    console.log('Joining chat room:', chat.id);
                    socket.emit('join_chat', { chat_id: chat.id });
                });
                
                if (userId) {
                    console.log('Joining user room:', userId);
                    socket.emit('join_user_room', { user_id: userId });
                }
                
                setLoading(false);
            } catch (err) {
                console.error('Ошибка при загрузке чатов:', err);
                setError('Не удалось загрузить чаты');
                setLoading(false);
            }
        };

        fetchChats();

        // Обработчик обновления чата
        socket.on('chat_updated', (data) => {
            fetchChats();
            console.log('Chat updated:', data);
            setChats(prevChats => {
                return prevChats.map(chat => {
                    if (chat.id === data.chat_id) {
                        return {
                            ...chat,
                            last_message: {
                                content: data.content,
                                timestamp: data.timestamp,
                                sender_id: data.sender_id,
                                is_read: false
                            },
                            unread_count: data.sender_id !== userId ? 
                                (chat.unread_count || 0) + 1 : 
                                chat.unread_count
                        };
                    }
                    return chat;
                });
            });
        });

        // Подписываемся на обновления статуса сообщений
        socket.on('message_status_updated', (data) => {
            console.log('Message status updated:', data);
            setChats(prevChats => {
                return prevChats.map(chat => {
                    if (chat.id === data.chat_id) {
                        return {
                            ...chat,
                            unread_count: Math.max(0, chat.unread_count - 1)
                        };
                    }
                    return chat;
                });
            });
        });

        // Подписываемся на новые сообщения
        socket.on('new_message_sended', (data) => {
            console.log('New message received:', data);
            setChats(prevChats => {
                const updatedChats = prevChats.map(chat => {
                    if (chat.id === data.chat_id) {
                        const newChat = {
                            ...chat,
                            last_message: {
                                content: data.content,
                                timestamp: data.timestamp,
                                sender_id: data.sender_id,
                                is_read: false
                            }
                        };

                        if (data.sender_id !== userId) {
                            newChat.unread_count = (chat.unread_count || 0) + 1;
                        }

                        return newChat;
                    }
                    return chat;
                });

                // Сортируем чаты по времени последнего сообщения
                return updatedChats.sort((a, b) => {
                    const timeA = a.last_message ? new Date(a.last_message.timestamp) : new Date(0);
                    const timeB = b.last_message ? new Date(b.last_message.timestamp) : new Date(0);
                    return timeB - timeA;
                });
            });
        });

        return () => {
            // Отключаемся от комнат при размонтировании
            chats.forEach(chat => {
                socket.emit('leave_chat', { chat_id: chat.id });
            });
            if (userId) {
                socket.emit('leave_user_room', { user_id: userId });
            }
            socket.off('user_connected');
            socket.off('message_status_updated');
            socket.off('new_message_sended');
            socket.off('chat_updated');
        };
    }, [userId]);

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleChatClick = (chatId) => {
        navigate(`/chats/${chatId}`);
    };

    if (loading) return <div className="chat-list">Загрузка...</div>;
    if (error) return <div className="chat-list error">{error}</div>;

    return (
        <div className="chat-list">
            {chats.length === 0 ? (
                <div className="no-chats">У вас пока нет чатов</div>
            ) : (
                chats.map((chat) => (
                    <div 
                        key={chat.id} 
                        className="chat-item" 
                        onClick={() => handleChatClick(chat.id)}
                    >
                        <div className="chat-avatar">
                            {chat.participant.avatar ? (
                                <img 
                                    src={`/static/pf_photos/${chat.participant.avatar}`} 
                                    alt={chat.participant.username} 
                                />
                            ) : (
                                <div className="default-avatar">
                                    {chat.participant.username[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="chat-info">
                            <div className="chat-header">
                                <div className="chat-header-left">
                                    <span className="username">{chat.participant.username}</span>
                                    {chat.unread_count > 0 && (
                                        <div className="unread-badge">
                                            {chat.unread_count}
                                        </div>
                                    )}
                                </div>
                                {chat.last_message && (
                                    <span className="time">
                                        {formatTime(chat.last_message.timestamp)}
                                    </span>
                                )}
                            </div>
                            <div className={`last-message ${chat.unread_count > 0 ? 'unread' : ''}`}>
                                {chat.last_message ? (
                                    <>
                                        {chat.last_message.sender_id === chat.participant.id ? '' : 'Вы: '}
                                        {chat.last_message.content}
                                    </>
                                ) : (
                                    <span className="no-messages">Нет сообщений</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ChatList;