import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { useParams } from 'react-router-dom';
import './ChatDialog.css';
import socket from './webSocket';

// Базовый URL API для медиа-файлов
const API_BASE_URL = 'http://192.168.3.88:3001';

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
    const [mediaFile, setMediaFile] = useState(null); // Новый стейт для хранения медиа файла
    const [mediaPreview, setMediaPreview] = useState(null); // Превью медиа файла

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

    const fileInputRef = useRef(null); // Референс для инпута файла

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

    const loadHistory = useCallback(async () => {
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
            
            // Отмечаем все непрочитанные сообщения как прочитанные и проверяем медиа
            res.data.messages.forEach(msg => {
                console.log("sender_id", msg.sender_id, "userId", userId);
                
                // Получаем медиа URL и тип
                const mediaUrl = getMessageMediaUrl(msg);
                const mediaType = getMessageMediaType(msg);
                
                console.log("Медиа в сообщении:", mediaUrl, mediaType);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
                
                // Предзагружаем изображения
                if (mediaUrl && (mediaType === 'image' || msg.media_type === 'image')) {
                    preloadImage(getMediaUrl(mediaUrl));
                }
                
                if (!msg.is_read && msg.sender_id !== userId && userId != null) {
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
    }, [userId, chatId]);

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
                // Проверяем наличие медиа-файлов в загруженных сообщениях
                res.data.messages.forEach(msg => {
                    console.log("Старое сообщение:", msg);
                    
                    // Получаем медиа URL и тип
                    const mediaUrl = getMessageMediaUrl(msg);
                    const mediaType = getMessageMediaType(msg);
                    
                    console.log("Медиа в старом сообщении:", mediaUrl, mediaType);
                    
                    // Предзагружаем изображения
                    if (mediaUrl && (mediaType === 'image' || msg.media_type === 'image')) {
                        preloadImage(getMediaUrl(mediaUrl));
                    }
                    
                    // Отмечаем непрочитанные сообщения как прочитанные
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

    // Добавить эффект, который запускается только когда userId загружен
    useEffect(() => {
        if (userId) {
            loadHistory();
        }
    }, [userId, chatId]);

    // Отдельный эффект для обработчиков событий сокета
    useEffect(() => {
        const handleNewMessage = (msg) => {
            console.log('Получено новое сообщение:', msg);
            
            // Получаем медиа URL и тип
            const mediaUrl = getMessageMediaUrl(msg);
            const mediaType = getMessageMediaType(msg);
            
            console.log('Медиа в новом сообщении:', mediaUrl, mediaType);
            
            const currentChatId = String(chatId["chatId"]);
            const messageChatId = String(msg.chat_id);

            if (!msg || !msg.chat_id) {
                console.error('Некорректное сообщение:', msg);
                return;
            }

            if (messageChatId === currentChatId) {
                console.log('Добавляем сообщение в текущий чат');
                
                // Проверяем формат данных медиа и типа
                if (mediaUrl) {
                    if (!mediaType) {
                        console.warn('Сообщение содержит mediaUrl без mediaType:', msg);
                        // Пытаемся определить тип по расширению
                        const path = mediaUrl.toLowerCase();
                        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
                            msg.media_type = 'image';
                        } else if (path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.avi')) {
                            msg.media_type = 'video';
                        } else {
                            console.error('Не удалось определить тип медиа-файла:', path);
                        }
                    }
                    
                    // Предзагружаем изображение, если это изображение
                    if (mediaType === 'image' || msg.media_type === 'image') {
                        preloadImage(getMediaUrl(mediaUrl));
                    }
                }
                
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
            
            if (!userId) {
                console.log('userId еще не установлен, откладываем обновление статуса');
                return;
            }
            
            if (String(data.chat_id) === String(chatId["chatId"])) {
                setMessages(prev => {
                    const updatedMessages = prev.map(msg => {
                        if (String(msg.message_id) === String(data.message_id)) {
                            console.log('Обновляем статус сообщения:', msg.message_id, 'на:', data.is_read);
                            return { ...msg, is_read: data.is_read };
                        }
                        return msg;
                    });
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

    // Функция для обработки выбора файла
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Проверка типа файла
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
        if (!allowedTypes.includes(file.type)) {
            alert('Неподдерживаемый формат файла. Поддерживаемые форматы: JPEG, PNG, GIF, MP4, MOV, AVI');
            return;
        }
        
        // Проверка размера файла (максимум 10МБ)
        const maxSize = 10 * 1024 * 1024; // 10MB в байтах
        if (file.size > maxSize) {
            alert('Файл слишком большой. Максимальный размер: 10МБ');
            return;
        }

        setMediaFile(file);

        // Создаем превью
        const reader = new FileReader();
        reader.onload = (e) => {
            setMediaPreview(e.target.result);
        };
        reader.onerror = (e) => {
            console.error('Ошибка при чтении файла:', e);
            alert('Не удалось создать превью файла');
        };
        reader.readAsDataURL(file);
    };

    // Функция для удаления выбранного файла
    const handleRemoveFile = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Обновляем функцию отправки сообщения
    const sendMessage = async () => {
        if ((!message.trim() && !mediaFile) || !socket.connected || editingMessage) return;
        
        // Если есть медиа файл, используем FormData вместо простого объекта
        if (mediaFile) {
            try {
                const formData = new FormData();
                formData.append('content', message);
                formData.append('media', mediaFile);
                console.log('Отправляем медиа:', mediaFile.name, mediaFile.type);
                
                const response = await api.post(`/api/messenger/chats/${chatId["chatId"]}/messages`, formData, {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                console.log('Ответ при отправке медиа:', response.data);
                
                // Если сервер вернул сообщение напрямую, добавляем его в наш список
                if (response.data && response.data.message) {
                    const newMessage = response.data.message;
                    console.log('Добавляем новое сообщение с медиа от сервера:', newMessage);
                    
                    // Проверяем доступность медиа URL
                    const mediaUrl = getMessageMediaUrl(newMessage);
                    const mediaType = getMessageMediaType(newMessage);
                    
                    console.log('Медиа в новом сообщении от сервера:', mediaUrl, mediaType);
                    
                    // Предзагружаем изображение, если возможно
                    if (mediaUrl && (mediaType === 'image' || newMessage.media_type === 'image')) {
                        preloadImage(getMediaUrl(mediaUrl));
                    }
                    
                    setMessages(prevMessages => {
                        // Проверяем, не существует ли уже это сообщение
                        const messageExists = prevMessages.some(msg => 
                            String(msg.message_id) === String(newMessage.message_id)
                        );
                        
                        if (messageExists) {
                            return prevMessages;
                        }
                        
                        return [...prevMessages, newMessage];
                    });
                }
                
                // Очищаем поле ввода и превью файла
                setMessage('');
                setMediaFile(null);
                setMediaPreview(null);
                
                if (isScrolledToBottom) {
                    setTimeout(scrollToBottom, 100);
                }
            } catch (error) {
                console.error('Ошибка при отправке сообщения с медиа:', error);
                alert('Ошибка при отправке медиа-файла. Попробуйте еще раз.');
            }
        } else {
            // Обычное текстовое сообщение
            const messageData = {
                content: message,
                chat_id: String(chatId["chatId"]),
                user_id: userId,
            };
            
            console.log('Отправка сообщения:', messageData);
            socket.emit('send_message', messageData);
            
            setMessage('');
        }
        
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

    // Модифицируем handleSubmit для работы с медиа файлами
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim() && !mediaFile) return;

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
                console.log('Отправка нового сообщения:', message, 'Медиа:', mediaFile ? mediaFile.name : 'нет');
                await sendMessage();
            }
                setMessage('');
            setMediaFile(null);
            setMediaPreview(null);
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

    // Функция для формирования правильного URL медиа-файла и проверки полей
    const getMediaUrl = (url) => {
        if (!url) return '';
        
        // Если путь уже является полным URL, используем его как есть
        if (url.startsWith('http')) {
            return url;
        }
        
        // Если путь начинается с / - это относительный путь
        if (url.startsWith('/')) {
            return `${API_BASE_URL}${url}`;
        }
        
        // Иначе добавляем слеш и базовый URL
        return `${API_BASE_URL}/${url}`;
    };
    
    // Функция для получения URL медиа из сообщения, учитывая разные имена полей
    const getMessageMediaUrl = (msg) => {
        console.log("msgpath", msg)
        return msg.media_url || msg.media_path || msg.mediaUrl || '';
    };
    
    // Функция для получения типа медиа из сообщения
    const getMessageMediaType = (msg) => {
        console.log("msgtype", msg)
        return msg.media_type || msg.mediaType || '';
    };

    // Предзагрузка изображений для кэширования
    const preloadImage = (url) => {
        if (!url) return;
        const img = new Image();
        img.src = url;
    };
    
    // Предзагружаем все изображения из сообщений
    useEffect(() => {
        messages.forEach(msg => {
            const mediaUrl = getMessageMediaUrl(msg);
            const mediaType = getMessageMediaType(msg);
            if (mediaUrl && mediaType === 'image') {
                preloadImage(getMediaUrl(mediaUrl));
            }
        });
    }, [messages]);

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
                    messages.length > 0 ? (
                        messages.map((msg) => {
                            console.log("Рендер сообщения:", msg);
                            
                            // Получаем медиа URL и тип, учитывая разные имена полей
                            const mediaUrl = getMessageMediaUrl(msg);
                            const mediaType = getMessageMediaType(msg);
                            
                            console.log("Медиа в сообщении при рендере:", mediaUrl, mediaType);
                            
                            // Проверяем наличие необходимых данных
                            if (!msg.message_id) {
                                console.error('Сообщение без ID:', msg);
                                return null;
                            }
                            
                            // Формируем URL для медиа
                            const formattedMediaUrl = getMediaUrl(mediaUrl);
                            
                            return (
                                <div
                                    key={`${msg.message_id}-${msg.is_read}`}
                                    className={`message ${msg.sender_id === userId ? 'own' : 'other'}`}
                                    onContextMenu={(e) => handleContextMenu(e, msg)}
                                >
                                    <div className="content">
                                        {msg.content}
                                        {msg.edited && <span className="edited-mark">(ред.)</span>}
                                        
                                        {/* Отображение медиа контента */}
                                        {mediaUrl && mediaType === 'image' && (
                                            <div className="message-media">
                                                <img 
                                                    src={formattedMediaUrl} 
                                                    alt="Изображение" 
                                                    className="media-image"
                                                    onClick={() => window.open(formattedMediaUrl, '_blank')}
                                                    onError={(e) => {
                                                        console.error('Ошибка загрузки изображения:', formattedMediaUrl);
                                                        e.target.src = 'https://via.placeholder.com/150?text=Ошибка+загрузки';
                                                    }}
                                                />
                                            </div>
                                        )}
                                        
                                        {mediaUrl && mediaType === 'video' && (
                                            <div className="message-media">
                                                <video 
                                                    controls 
                                                    className="media-video"
                                                    onError={(e) => {
                                                        console.error('Ошибка загрузки видео:', formattedMediaUrl);
                                                    }}
                                                >
                                                    <source src={formattedMediaUrl} />
                                                    Ваш браузер не поддерживает видео.
                                                </video>
                                            </div>
                                        )}
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
                            );
                        })
                    ) : (
                        <div className="no-messages">Нет сообщений</div>
                    )
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

                {/* Превью выбранного медиа */}
                {mediaPreview && (
                    <div className="media-preview-container">
                        {mediaFile.type.startsWith('image/') ? (
                            <img 
                                src={mediaPreview} 
                                alt="Превью" 
                                className="media-preview-image" 
                            />
                        ) : (
                            <video 
                                src={mediaPreview} 
                                className="media-preview-video" 
                                controls
                            />
                        )}
                        <button 
                            className="remove-media-button"
                            onClick={handleRemoveFile}
                            type="button"
                        >
                            ✖
                        </button>
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
                    
                    {/* Скрытый инпут для выбора файла */}
                    <input 
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/x-msvideo"
                    />
                    
                    {/* Кнопка для выбора медиа файла */}
                    <button 
                        type="button" 
                        className="media-button"
                        onClick={() => fileInputRef.current.click()}
                        title="Прикрепить медиа"
                    >
                        📎
                    </button>
                    
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
