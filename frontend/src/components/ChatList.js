import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import './ChatList.css';
import socket from './webSocket';

const ChatList = () => {
    const navigate = useNavigate();
    const { chatId } = useParams();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState({});

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
                    console.log("chat.id", chat.id, "data.chat_id", data.chat_id)
                    if (chat.id === data.chat_id) {
                        // Обновляем статус прочтения последнего сообщения
                        const updatedChat = {
                            ...chat,
                            last_message: chat.last_message && {
                                ...chat.last_message,
                                is_read: data.is_read
                            }
                        };

                        // Если сообщение прочитано, уменьшаем счетчик непрочитанных
                        if (data.is_read) {
                            updatedChat.unread_count = Math.max(0, chat.unread_count - 1);
                        }

                        console.log('Обновляем чат:', chat.id, 'Новый статус:', updatedChat);
                        return updatedChat;
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
                                is_read: data.sender_id === userId || chat.id === parseInt(chatId) // Сразу помечаем как прочитанное, если это наше сообщение или открыт этот чат
                            }
                        };

                        // Увеличиваем счетчик непрочитанных только если:
                        // 1. Сообщение не от текущего пользователя
                        // 2. Чат не открыт в данный момент
                        if (data.sender_id !== userId && chat.id !== parseInt(chatId)) {
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

        // Получаем начальный статус всех пользователей
        const fetchOnlineStatus = async () => {
            try {
                const response = await api.get('/api/messenger/users/online-status', {
                    withCredentials: true
                });
                setOnlineUsers(response.data.online_users);
            } catch (error) {
                console.error('Ошибка при получении статусов пользователей:', error);
            }
        };

        fetchOnlineStatus();

        // Подписываемся на события изменения статуса пользователей
        socket.on('user_status_changed', ({ user_id, is_online, last_seen }) => {
            setOnlineUsers(prev => ({
                ...prev,
                [user_id]: {
                    is_online,
                    last_seen: last_seen || new Date().toISOString()
                }
            }));
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
            socket.off('user_status_changed');
        };
    }, [userId, chatId]);

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleChatClick = (chat) => {
        navigate(`/chats/${chat.id}`);
        // Находим полную информацию о чате
        const selectedChat = chats.find(c => c.id === chat.id);
        // Сохраняем в localStorage для использования в Header
        if (selectedChat?.participant) {
            localStorage.setItem('current_chat', JSON.stringify(selectedChat));
        }
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
                        className={`chat-item ${chat.id === parseInt(chatId) ? 'active' : ''}`} 
                        onClick={() => handleChatClick(chat)}
                    >
                        <div className="avatar-container">
                            {chat.participant.avatar ? (
                                <img 
                                    src={`http://192.168.3.88:3001/static/pf_photos/${chat.participant.avatar}`} 
                                    alt={chat.participant.username} 
                                    className="avatar"
                                />
                            ) : (
                                <div className="default-avatar">
                                    {chat.participant.username[0].toUpperCase()}
                                </div>
                            )}
                            {onlineUsers[chat.participant.id]?.is_online && (
                                <div className="online-indicator" />
                            )}
                        </div>
                        <div className="chat-info">
                            <div className="chat-header">
                                <div className="chat-header-left">
                                    <span className="username">{chat.participant.username}</span>
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
                        {chat.id !== parseInt(chatId) && chat.unread_count > 0 && (
                            <div className="unread-badge">
                                {chat.unread_count}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default ChatList;