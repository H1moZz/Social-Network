import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useParams } from 'react-router-dom';
import './ChatDialog.css';
import socket from './webSocket';

const ChatDialog = () => {
    const [message, setMessage] = useState('');
    const chatId = useParams();
    const [messages, setMessages] = useState([]);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(true); // Стейт для проверки, внизу ли мы
    const [isUserIdLoaded, setIsUserIdLoaded] = useState(false);
    const [totalMessages, setTotalMessages] = useState(0);
    const [editingMessage, setEditingMessage] = useState(null);

    const messagesEndRef = useRef(null);
    const [lastMessageId, setLastMessageId] = useState(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const messagesContainerRef = useRef(null);
    const scrollPositionRef = useRef(0); // Реф для текущей позиции скролла
    const previousMessagesLength = useRef(0); // Реф для отслеживания количества сообщений перед подгрузкой

    const [contextMenu, setContextMenu] = useState({
        show: false,
        x: 0,
        y: 0,
        messageId: null
    });

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
            console.log('Ответ от сервера:', res.data); // Отладочная информация
            
            if (!Array.isArray(res.data.messages)) {
                console.error('Неверный формат данных:', res.data);
                setMessages([]);
                return;
            }
            
            setMessages(res.data.messages);
            setHasMoreMessages(res.data.meta?.has_more || false);
            scrollToBottomAuto();
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    const loadOlderMessages = async () => {
        if (loading || !hasMoreMessages || messages.length === 0) return;  
    
        const container = messagesContainerRef.current;
        if (!container) return;
    
        const previousScrollHeight = container.scrollHeight;  
        setLoading(true);
    
        try {
            const oldestMessageId = messages[0]?.id;
            const res = await api.get(`/api/messenger/chats/${chatId["chatId"]}/messages`, {
                params: { 
                    before: oldestMessageId
                },
                withCredentials: true,
            });
    
            if (!res.data.messages || res.data.messages.length === 0) {
                setHasMoreMessages(false);
            } else {
                setMessages((prevMessages) => [...res.data.messages, ...prevMessages]);
                setHasMoreMessages(res.data.meta.has_more);
            }
            
        } catch (error) {
            console.error('Ошибка загрузки старых сообщений:', error);
        } finally {
            setLoading(false);
    
            // Сохраняем позицию скролла
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
        if (!socket.connected) {
            socket.connect();
        }
    
        socket.on('user_connected', (data) => {
            setUserId(data.user_id);
            setIsUserIdLoaded(true);
        });
    
        socket.emit('join_chat', { chat_id: chatId["chatId"] });
    
        loadHistory();
        
        socket.on('new_message_sended', (msg) => {
            setMessages((prev) => [...prev, msg]);
            // Если сообщение не от текущего пользователя, отмечаем его как прочитанное
            if (msg.sender_id !== userId) {
                socket.emit('message_read', {
                    message_id: msg.message_id,
                    user_id: userId,
                    chat_id: chatId["chatId"]
                });
            }
        });

        socket.on('message_status_updated', (data) => {
            console.log('Получено обновление статуса:', data);
            setMessages(prev => {
                console.log('Предыдущие сообщения:', prev);
                const updated = prev.map(msg => {
                    console.log('msg.id', msg.message_id, 'data.message_id', data.message_id);
                    if (msg.message_id === data.message_id) {
                        console.log('-------------------');
                        console.log('Обновляем сообщение:', msg.message_id, 'новый статус:', data.is_read, "message", data.content);
                        return {...msg, is_read: data.is_read};
                    }
                    return msg;
                });
                console.log('Обновленные сообщения:', updated);
                return updated;
            });
        });

        socket.on('message_edited', (data) => {
            setMessages(prevMessages => 
                prevMessages.map(msg => 
                    msg.id === data.message_id 
                        ? { ...msg, content: data.content, edited: true }
                        : msg
                )
            );
        });
    
        return () => {
            socket.off('user_connected');
            socket.off('new_message_sended');
            socket.off('message_status_updated');
            socket.off('message_edited');
        };
    }, [chatId["chatId"], userId]);

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
        if (!message.trim() || !socket.connected || editingMessage) return;
        
        socket.emit('send_message', {
            content: message,
            chat_id: chatId["chatId"],
            user_id: userId,
        });
        setMessage('');
        setTimeout(() => {
            scrollToBottom();
        }, 100);
    };

    const handleEdit = (message) => {
        setEditingMessage(message);
        setMessage(message.content);
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        try {
            if (editingMessage) {
                // Добавим правильные заголовки и credentials
                const response = await api.put(
                    `/api/messenger/chats/${chatId["chatId"]}/messages/${editingMessage.id}`,
                    { content: message },
                    {
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );
                setEditingMessage(null);
            } else {
                // Отправка нового сообщения
                console.log('Отправка нового сообщения:', message);
                sendMessage();
            }
            setMessage('');
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
        }
    };

    // Добавим обработчик клика по документу для закрытия меню
    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu({ show: false, x: 0, y: 0, messageId: null });
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Обработчик правого клика по сообщению
    const handleContextMenu = (e, msg) => {
        e.preventDefault();
        if (msg.sender_id === userId) {
            setContextMenu({
                show: true,
                x: e.clientX,
                y: e.clientY,
                messageId: msg.id
            });
        }
    };

    // Обработчик выбора действия из меню
    const handleMenuAction = (action) => {
        const message = messages.find(msg => msg.message_id === contextMenu.messageId);
        if (!message) return;

        switch (action) {
            case 'edit':
                handleEdit(message);
                break;
            case 'delete':
                // Здесь можно добавить функционал удаления
                console.log('Delete message:', message.id);
                break;
            case 'copy':
                navigator.clipboard.writeText(message.content);
                break;
        }
        setContextMenu({ show: false, x: 0, y: 0, messageId: null });
    };

    return (
        <div className='hide-scrollbar' style={{ overflowY: 'scroll', height: '1000px' }}>
        <div className="chat-wrapper">
            <div className="chat-container">
                <div
                    className="messages"
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                >
                    {isUserIdLoaded ? (
                        messages.map((msg) => (
                            <div
                                key={msg.message_id}
                                className={`message ${msg.sender_id === userId ? 'own' : 'other'}`}
                                onContextMenu={(e) => handleContextMenu(e, msg)}
                            >
                                <div className="content">
                                    {msg.content}
                                    {msg.edited && <span className="edited-mark">(ред.)</span>}
                                </div>
                                <div className="message-footer">
                                    <div className="time">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>
                                    {msg.sender_id === userId && (
                                        <div className="read-status">
                                            {msg.is_read ? '✓✓' : '✓'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="loading">Загрузка...</div>
                    )}
                    {loading && <div className="loading">Загрузка...</div>}
                    <div ref={messagesEndRef} />
                </div>

                {/* Контекстное меню */}
                {contextMenu.show && (
                    <div 
                        className="context-menu"
                        style={{
                            top: contextMenu.y,
                            left: contextMenu.x
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div 
                            className="context-menu-item"
                            onClick={() => handleMenuAction('edit')}
                        >
                            <i>✎</i> Редактировать
                        </div>
                        <div 
                            className="context-menu-item"
                            onClick={() => handleMenuAction('copy')}
                        >
                            <i>📋</i> Копировать
                        </div>
                        <div 
                            className="context-menu-item"
                            onClick={() => handleMenuAction('delete')}
                        >
                            <i>🗑️</i> Удалить
                        </div>
                    </div>
                )}

                <form className="input-area" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (editingMessage) {
                                    handleSubmit(e);
                                } else {
                                    sendMessage();
                                }
                            }
                        }}
                        placeholder={editingMessage ? "Редактирование сообщения..." : "Введите сообщение..."}
                    />
                    {editingMessage && (
                        <button 
                            type="button" 
                            className="cancel-button"
                            onClick={handleCancelEdit}
                        >
                            Отмена
                        </button>   
                    )}
                    <button type="submit" className="custom-button">
                        {editingMessage ? 'Сохранить' : 'Отправить'}
                    </button>
                </form>
            </div>
        </div>
    </div>
    );
};

export default ChatDialog;
