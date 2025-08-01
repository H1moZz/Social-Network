import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import api from '../api';
import { useParams } from 'react-router-dom';
import './ChatDialog.css';
import socket from './webSocket';

// Базовый URL API для медиа-файлов
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000';


const Message = memo(({ 
    msg, 
    userId, 
    handleContextMenu,
    getMediaUrl,
    getMessageMediaUrl,
    getMessageMediaType,
    formatFileSize 
  }) => {
    const mediaUrl = getMessageMediaUrl(msg);
    const mediaType = getMessageMediaType(msg);
    const formattedMediaUrl = getMediaUrl(mediaUrl);
    const isOnlyMedia = (mediaType === 'image' || mediaType === 'video') && !msg.content;
    const hasMediaAndText = (mediaType === 'image' || mediaType === 'video') && msg.content;
    const imageRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(null);
  
    const updateContainerWidth = useCallback(() => {
      if (imageRef.current && imageRef.current.parentElement) {
        setContainerWidth(imageRef.current.parentElement.offsetWidth);
      }
    }, []);
  
    useEffect(() => {
      updateContainerWidth();
      window.addEventListener('resize', updateContainerWidth);
      return () => window.removeEventListener('resize', updateContainerWidth);
    }, [updateContainerWidth]);
  
    if (hasMediaAndText) {
      return (
        <div className="message-group">
          {/* Отдельное сообщение для медиа */}
          <div
            className={`message ${msg.sender_id === userId ? 'own' : 'other'} ${mediaType === 'video' ? 'only-video' : 'only-image'} no-margin`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
          >
            <div className="content">
              {mediaType === 'image' ? (
                <img 
                  src={formattedMediaUrl} 
                  alt="Изображение" 
                  className="media-image"
                  ref={imageRef}
                  onLoad={updateContainerWidth}
                  onClick={() => window.open(formattedMediaUrl, '_blank')}
                />
              ) : (
                <video 
                  controls 
                  className="media-video"
                  ref={imageRef}
                  onLoadedMetadata={updateContainerWidth}
                >
                  <source src={formattedMediaUrl} />
                  Ваш браузер не поддерживает видео.
                </video>
              )}
            </div>
          </div>
          
          {/* Отдельное сообщение для текста */}
          <div
            className={`message ${msg.sender_id === userId ? 'own' : 'other'} no-margin-top`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
            style={{ width: containerWidth ? `${containerWidth}px` : 'auto' }}
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
        </div>
      );
    }
  
    return (
      <div
        className={`message ${msg.sender_id === userId ? 'own' : 'other'} ${isOnlyMedia ? (mediaType === 'video' ? 'only-video' : 'only-image') : ''}`}
        onContextMenu={(e) => handleContextMenu(e, msg)}
      >
        <div className="content">
          {msg.content}
          {msg.edited && <span className="edited-mark">(ред.)</span>}
          {mediaUrl && (
            <MessageMedia 
              mediaType={mediaType}
              formattedMediaUrl={formattedMediaUrl}
              msg={msg}
              formatFileSize={formatFileSize}
            />
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
  });
  
  // Мемоизированный компонент для медиа
  const MessageMedia = memo(({ mediaType, formattedMediaUrl, msg, formatFileSize }) => {
    switch (mediaType) {
      case 'image':
        return (
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
        );
      case 'video':
        return (
          <video 
            controls 
            className="media-video"
            onError={(e) => console.error('Ошибка загрузки видео:', formattedMediaUrl)}
          >
            <source src={formattedMediaUrl} />
            Ваш браузер не поддерживает видео.
          </video>
        );
      case 'document':
      default:
        return (
          <div className="file-preview">
            <a 
              href={formattedMediaUrl} 
              download={msg.file_name} 
              className="file-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="file-icon">
                {msg.file_name?.endsWith('.pdf') ? '📄' : 
                 msg.file_name?.endsWith('.doc') || msg.file_name?.endsWith('.docx') ? '📝' :
                 msg.file_name?.endsWith('.xls') || msg.file_name?.endsWith('.xlsx') ? '📊' :
                 msg.file_name?.endsWith('.txt') ? '📃' :
                 msg.file_name?.endsWith('.zip') || msg.file_name?.endsWith('.rar') ? '📦' : '📎'}
              </div>
              <div className="file-info">
                <div className="file-name">{msg.file_name || 'Файл'}</div>
                <div className="file-size">{formatFileSize(msg.file_size)}</div>
              </div>
            </a>
          </div>
        );
    }
  });

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
                
                const mediaUrl = getMessageMediaUrl(msg);
                const mediaType = getMessageMediaType(msg);
                
                
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
                            msg.media_type = 'document';
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
                    
                    // Добавляем все необходимые поля для файлов
                    const newMessage = {
                        ...msg,
                        file_name: msg.file_name || '',
                        file_size: msg.file_size || 0,
                        edited: msg.edited || false
                    };
                    
                    return [...prev, newMessage];
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

        const handleMessageDelete = (data) => {
            console.log('Получено событие удаления сообщения:', data);
            if (String(data.chat_id) === String(chatId["chatId"])) {
                setMessages(prevMessages => 
                    prevMessages.filter(msg => String(msg.message_id) !== String(data.message_id))
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
        socket.on('message_deleted', handleMessageDelete);
    
        return () => {
            socket.off('user_connected', handleUserConnect);
            socket.off('new_message_sended', handleNewMessage);
            socket.off('message_status_updated', handleStatusUpdate);
            socket.off('message_edited', handleMessageEdit);
            socket.off('message_deleted', handleMessageDelete);
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

        // Расширенный список поддерживаемых типов файлов
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'video/mp4', 'video/quicktime', 'video/x-msvideo',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv',
            'application/zip', 'application/x-rar-compressed',
            'application/octet-stream'
        ];

        // Проверяем расширение файла, если тип не определен
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 
                                 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 
                                 'zip', 'rar'];

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            alert('Неподдерживаемый формат файла. Поддерживаемые форматы: изображения, видео, документы (PDF, DOC, DOCX, XLS, XLSX), текстовые файлы (TXT, CSV), архивы (ZIP, RAR)');
            return;
        }
        
        // Проверка размера файла (максимум 50МБ)
        const maxSize = 50 * 1024 * 1024; // 50MB в байтах
        if (file.size > maxSize) {
            alert('Файл слишком большой. Максимальный размер: 50МБ');
            return;
        }

        setMediaFile(file);

        // Создаем превью для всех типов файлов
        if (file.type.startsWith('image/')) {
            // Для изображений показываем само изображение
        const reader = new FileReader();
        reader.onload = (e) => {
            setMediaPreview(e.target.result);
        };
        reader.readAsDataURL(file);
        } else {
            // Для остальных файлов создаем превью с иконкой и информацией
            const preview = {
                type: file.type,
                name: file.name,
                size: formatFileSize(file.size),
                icon: getFileIcon(file.type, fileExtension)
            };
            setMediaPreview(preview);
        }
    };

    // Функция для определения иконки файла
    const getFileIcon = (fileType, extension) => {
        if (fileType.startsWith('video/')) return '🎥';
        if (fileType.startsWith('application/pdf')) return '📄';
        if (fileType.includes('word') || extension === 'doc' || extension === 'docx') return '📝';
        if (fileType.includes('excel') || extension === 'xls' || extension === 'xlsx') return '📊';
        if (fileType === 'text/plain' || extension === 'txt') return '📃';
        if (fileType === 'text/csv' || extension === 'csv') return '📊';
        if (fileType.includes('zip') || fileType.includes('rar') || extension === 'zip' || extension === 'rar') return '📦';
        return '📎';
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
    const handleMenuAction = async (action) => {
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
                try {
                    await api.delete(`/api/messenger/chats/${chatId["chatId"]}/messages/${message.message_id}`, {
                        withCredentials: true
                    });
                    // Сообщение будет удалено через WebSocket событие
                } catch (error) {
                    console.error('Ошибка при удалении сообщения:', error);
                    alert('Не удалось удалить сообщение');
                }
                break;
            case 'copy':
                navigator.clipboard.writeText(message.content);
                break;
        }
        setContextMenu({ show: false, x: 0, y: 0, messageId: null });
    };

    // Функция для формирования правильного URL медиа-файла и проверки полей
    const getMediaUrl = useCallback((url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
        return `${API_BASE_URL}/${url}`;
    }, []);
    
    // Функция для получения URL медиа из сообщения, учитывая разные имена полей
    const getMessageMediaUrl = useCallback((msg) => {
        return msg.media_url || msg.media_path || msg.mediaUrl || '';
    }, []);
    
    // Функция для получения типа медиа из сообщения
    const getMessageMediaType = useCallback((msg) => {
        return msg.media_type || msg.mediaType || '';
    }, []);

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

    const formatFileSize = useCallback((bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, []);

    const memoizedMessages = useMemo(() => messages.map(msg => ({
        ...msg,
        key: `${msg.message_id}-${msg.is_read}`
    })), [messages]);

    return (
        <div className="chat-wrapper">
        <div className="chat-container">
            <div
                className="messages"
                ref={messagesContainerRef}
                onScroll={handleScroll}
            >
                {isUserIdLoaded ? (
                        memoizedMessages.length > 0 ? (
                            memoizedMessages.map((msg) => (
                                <Message
                                    key={msg.key}
                                    msg={msg}
                                    userId={userId}
                                    handleContextMenu={handleContextMenu}
                                    getMediaUrl={getMediaUrl}
                                    getMessageMediaUrl={getMessageMediaUrl}
                                    getMessageMediaType={getMessageMediaType}
                                    formatFileSize={formatFileSize}
                                />
                            ))
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
                        {typeof mediaPreview === 'string' ? (
                            // Для изображений показываем само изображение
                            <img 
                                src={mediaPreview} 
                                alt="Превью" 
                                className="media-preview-image" 
                            />
                        ) : (
                            // Для остальных файлов показываем иконку и информацию
                            <div className="file-preview">
                                <div className="file-icon">{mediaPreview.icon}</div>
                                <div className="file-info">
                                    <div className="file-name">{mediaPreview.name}</div>
                                    <div className="file-size">{mediaPreview.size}</div>
                                </div>
                            </div>
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
    );
};

export default ChatDialog;
