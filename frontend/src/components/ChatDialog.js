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
            console.log('Загруженные сообщения:', res.data.messages);
            
            if (!Array.isArray(res.data.messages)) {
                console.error('Неверный формат данных:', res.data);
                setMessages([]);
                return;
            }
            
            // Отмечаем все непрочитанные сообщения как прочитанные
            res.data.messages.forEach(msg => {
                if (!msg.is_read && msg.sender_id !== userId) {
                    socket.emit('message_read', {
                        message_id: msg.message_id,
                        user_id: userId,
                        chat_id: chatId["chatId"]
                    });
                }
            });
            
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
            const oldestMessageId = messages[0]?.message_id;
            const res = await api.get(`/api/messenger/chats/${chatId["chatId"]}/messages`, {
                params: { 
                    before: oldestMessageId
                },
                withCredentials: true,
            });
    
            if (!res.data.messages || res.data.messages.length === 0) {
                setHasMoreMessages(false);
            } else {
                // Отмечаем все непрочитанные сообщения как прочитанные
                res.data.messages.forEach(msg => {
                    if (!msg.is_read && msg.sender_id !== userId) {
                        socket.emit('message_read', {
                            message_id: msg.message_id,
                            user_id: userId,
                            chat_id: chatId["chatId"]
                        });
                    }
                });

                setMessages((prevMessages) => [...res.data.messages, ...prevMessages]);
                setHasMoreMessages(res.data.meta.has_more);
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

    // Основной эффект для подключения к чату
    useEffect(() => {
        const connectToChat = () => {
            console.log('Подключаемся к чату:', chatId["chatId"]);
            if (!socket.connected) {
                socket.connect();
            }
            socket.emit('join_chat', { chat_id: chatId["chatId"] });
        };

        const disconnectFromChat = () => {
            console.log('Отключаемся от чата:', chatId["chatId"]);
            socket.emit('leave_chat', { chat_id: chatId["chatId"] });
        };

        connectToChat();
        loadHistory();

        return () => {
            disconnectFromChat();
        };
    }, [chatId["chatId"]]); // Зависимость только от ID чата

    // Отдельный эффект для обработчиков событий сокета
    useEffect(() => {
        const handleNewMessage = (msg) => {
            console.log('Получено новое сообщение:', msg);
            const currentChatId = String(chatId["chatId"]);
            const messageChatId = String(msg.chat_id);

            if (!msg || !msg.chat_id) {
                console.error('Некорректное сообщение:', msg);
                return;
            }

            if (messageChatId === currentChatId) {
                console.log('Добавляем сообщение в текущий чат');
                setMessages(prev => {
                    const messageExists = prev.some(existingMsg => 
                        String(existingMsg.message_id) === String(msg.message_id)
                    );
                    
                    if (messageExists) {
                        return prev;
                    }
                    
                    if (msg.sender_id !== userId) {
                        socket.emit('message_read', {
                            message_id: msg.message_id,
                            user_id: userId,
                            chat_id: currentChatId
                        });
                    }
                    
                    return [...prev, msg];
                });

                if (isScrolledToBottom) {
                    setTimeout(scrollToBottom, 100);
                }
            }
        };

        const handleStatusUpdate = (data) => {
            console.log('Получено обновление статуса:', data);
            console.log('Текущие сообщения:', messages);
            console.log("data.chat_id", data["chat_id"])
            console.log("chatId['chatId']", chatId["chatId"])
            if (String(data.chat_id) === String(chatId["chatId"])) {
                setMessages(prev => {
                    const updatedMessages = prev.map(msg => {
                        console.log('Сравниваем:', {
                            'msg.message_id': msg.message_id,
                            'data.message_id': data.message_id,
                            'совпадают': String(msg.message_id) === String(data.message_id)
                        });
                        if (String(msg.message_id) === String(data.message_id)) {
                            console.log('Обновляем статус сообщения:', msg.message_id, 'на:', data.is_read);
                            return { ...msg, is_read: data.is_read };
                        }
                        return msg;
                    });
                    console.log('Обновленные сообщения:', updatedMessages);
                    return updatedMessages;
                });
            }
        };
        const handleMessageEdit = (data) => {
            console.log('Получено обновление сообщения:', data);
            if (String(data.chat_id) === String(chatId["chatId"])) {
                setMessages(prevMessages => 
                    prevMessages.map(msg => {
                        if (msg.message_id === data.message_id) {
                            console.log('Обновляем содержимое сообщения:', msg.message_id);
                            return {
                                ...msg,
                                content: data.content,
                                edited: true
                            };
                        }
                        return msg;
                    })
                );
            }
        };

        const handleUserConnect = (data) => {
            setUserId(data.user_id);
            setIsUserIdLoaded(true);
        };

        socket.on('user_connected', handleUserConnect);
        socket.on('new_message_sended', handleNewMessage);
        socket.on('message_status_updated', handleStatusUpdate);
        socket.on('message_edited', handleMessageEdit);

        return () => {
            socket.off('user_connected', handleUserConnect);
            socket.off('new_message_sended', handleNewMessage);
            socket.off('message_status_updated', handleStatusUpdate);
            socket.off('message_edited', handleMessageEdit);
        };
    }, [chatId["chatId"], userId]); // Убрали isScrolledToBottom из зависимостей

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
        
        const messageData = {
            content: message,
            chat_id: String(chatId["chatId"]), // Преобразуем в строку
            user_id: userId,
        };
        
        console.log('Отправка сообщения:', messageData);
        socket.emit('send_message', messageData);
        
        setMessage('');
        
        if (isScrolledToBottom) {
            setTimeout(scrollToBottom, 100);
        }
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
                console.log('Отправка редактирования:', editingMessage);
                const messageId = editingMessage.message_id;
                console.log('Используемый ID для редактирования:', messageId);
                
                const response = await api.put(
                    `/api/messenger/chats/${chatId["chatId"]}/messages/${messageId}`,
                    { content: message },
                    {
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                socket.emit('message_edited', {
                    message_id: messageId,
                    chat_id: chatId["chatId"],
                    content: message
                });

                setEditingMessage(null);
            } else {
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
            console.log('Сообщение для контекстного меню:', msg);
            const messageId = msg.message_id;
            console.log('Используемый ID:', messageId);
            setContextMenu({
                show: true,
                x: e.clientX - 360,
                y: e.clientY - 80,
                messageId: messageId
            });
        }
    };

    // Обработчик выбора действия из меню
    const handleMenuAction = (action) => {
        console.log('Ищем сообщение с ID:', contextMenu.messageId);
        console.log('Доступные сообщения:', messages);
        
        const message = messages.find(msg => String(msg.message_id) === String(contextMenu.messageId));
        if (!message) {
            console.log('Сообщение не найдено:', contextMenu.messageId);
            return;
        }

        console.log('Найдено сообщение:', message);
        
        switch (action) {
            case 'edit':
                console.log('Редактирование сообщения:', message);
                handleEdit(message);
                break;
            case 'delete':
                console.log('Удаление сообщения:', message.message_id);
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
                                key={`${msg.message_id}-${msg.is_read}`}
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
