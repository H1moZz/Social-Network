import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import socket from './webSocket';
import './Header.css';

const Header = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [currentChat, setCurrentChat] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState({});
    const searchTimeout = useRef(null);
    const searchRef = useRef(null);
    const profileMenuRef = useRef(null);
    const navigate = useNavigate();
    const { chatId } = useParams();

    useEffect(() => {
        if (chatId) {
            const savedChat = localStorage.getItem('current_chat');
            if (savedChat) {
                setCurrentChat(JSON.parse(savedChat));
            }
        } else {
            setCurrentChat(null);
        }

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

        // Обработчик клика вне области поиска
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            socket.off('user_status_changed');
        };
    }, [chatId]);

    // Обработчик изменения поискового запроса
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        setShowResults(true);

        // Очищаем предыдущий таймаут
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Устанавливаем новый таймаут для поиска
        searchTimeout.current = setTimeout(async () => {
            if (query.trim()) {
                try {
                    const response = await api.get(`/api/messenger/users/search?query=${encodeURIComponent(query)}`, {
                        withCredentials: true
                    });
                    setSearchResults(response.data.users);
                } catch (error) {
                    console.error('Ошибка при поиске пользователей:', error);
                }
            } else {
                setSearchResults([]);
            }
        }, 300); // Задержка 300мс
    };

    // Обработчик выбора пользователя
    const handleUserSelect = async (user) => {
        try {
            // Создаем или получаем существующий чат
            const response = await api.post('/api/messenger/chats', {
                participant_id: user.id
            }, {
                withCredentials: true
            });

            // Очищаем поиск
            setSearchQuery('');
            setShowResults(false);
            setSearchResults([]);

            // Создаем объект чата с информацией о пользователе
            const selectedChat = {
                ...response.data,
                participant: {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar
                }
            };

            // Сохраняем в localStorage и обновляем состояние
            localStorage.setItem('current_chat', JSON.stringify(selectedChat));
            setCurrentChat(selectedChat);

            // Переходим к чату
            navigate(`/chats/${response.data.id}`);
        
        } catch (error) {
            console.error('Ошибка при создании чата:', error);
        }
    };

    const handleBack = () => {
        navigate('/chats');
    };

    const getStatusText = (user) => {
        if (!user) return '';

        const userStatus = onlineUsers[user.id];
        if (!userStatus) return 'был недавно';

        if (userStatus.is_online) {
            return 'онлайн';
        }

        if (userStatus.last_seen) {
            const lastSeen = new Date(userStatus.last_seen);
            const now = new Date();
            const diff = now - lastSeen;
            
            if (diff < 60000) { // меньше минуты
                return 'только что';
            } else if (diff < 3600000) { // меньше часа
                const minutes = Math.floor(diff / 60000);
                return `${minutes} мин. назад`;
            } else if (diff < 86400000) { // меньше суток
                const hours = Math.floor(diff / 3600000);
                return `${hours} ч. назад`;
            } else {
                return lastSeen.toLocaleDateString();
            }
        }
        return 'был недавно';
    };

    const isUserOnline = (userId) => {
        return onlineUsers[userId]?.is_online || false;
    };

    const handleLogout = async () => {
        socket.disconnect();
        try {
            await api.post('/api/auth/logout', {}, {
                withCredentials: true
            });
            // Отключаем сокет перед выходом
            navigate('/login');
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    };

    return (
        <header className={`header ${chatId ? 'chat-open' : 'chat-closed'}`}>
            {chatId ? (
                // Шапка для открытого чата
                <>
                    <div className="header-left chat-open">
                        <button className="back-button" onClick={handleBack}>
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                            </svg>
                        </button>
                        <div className="search-container" ref={searchRef}>
                            <div className="search-input-wrapper">
                                <svg viewBox="0 0 24 24" width="16" height="16" className="search-icon">
                                    <path fill="currentColor" d="M15.5,14H14.71L14.43,13.73C15.41,12.59 16,11.11 16,9.5A6.5,6.5 0 0,0 9.5,3A6.5,6.5 0 0,0 3,9.5A6.5,6.5 0 0,0 9.5,16C11.11,16 12.59,15.41 13.73,14.43L14,14.71V15.5L19,20.5L20.5,19L15.5,14M9.5,14C7,14 5,12 5,9.5C5,7 7,5 9.5,5C12,5 14,7 14,9.5C14,12 12,14 9.5,14Z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Поиск пользователей..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="search-input"
                                />
                            </div>
                            {showResults && searchResults.length > 0 && (
                                <div className="search-results">
                                    {searchResults.map(user => (
                                        <div 
                                            key={user.id} 
                                            className="search-result-item"
                                            onClick={() => handleUserSelect(user)}
                                        >
                                            {user.avatar ? (
                                                <img 
                                                    src={`http://192.168.3.88:3001/static/pf_photos/${user.avatar}`}
                                                    alt={user.username}
                                                    className="chat-avatar"
                                                />
                                            ) : (
                                                <div className="header-chat-avatar-placeholder">
                                                    {user.username[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div className="header-chat-info">
                                                <span className="chat-username">{user.username}</span>
                                                <span className={`chat-status ${isUserOnline(user.id) ? 'online' : ''}`}>
                                                    {getStatusText(user)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="chat-header-info">
                            {currentChat?.participant?.avatar ? (
                                <img 
                                    src={`http://192.168.3.88:3001/static/pf_photos/${currentChat.participant.avatar}`}
                                    alt={currentChat.participant.username}
                                    className="chat-avatar"
                                />
                            ) : (
                                <div className="header-chat-avatar-placeholder">
                                    {currentChat?.participant?.username?.[0]?.toUpperCase()}
                                </div>
                            )}
                            <div className="header-chat-info">
                                <span className="chat-username">{currentChat?.participant?.username}</span>
                                {currentChat?.participant && (
                                    <span className={`chat-status ${isUserOnline(currentChat.participant.id) ? 'online' : ''}`}>
                                        {getStatusText(currentChat.participant)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                // Шапка для списка чатов
                <>
                    <div className="header-left">
                        <button className="header-button">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
                            </svg>
                        </button>
                        <div className="search-container" ref={searchRef}>
                            <div className="search-input-wrapper">
                                <svg viewBox="0 0 24 24" width="16" height="16" className="search-icon">
                                    <path fill="currentColor" d="M15.5,14H14.71L14.43,13.73C15.41,12.59 16,11.11 16,9.5A6.5,6.5 0 0,0 9.5,3A6.5,6.5 0 0,0 3,9.5A6.5,6.5 0 0,0 9.5,16C11.11,16 12.59,15.41 13.73,14.43L14,14.71V15.5L19,20.5L20.5,19L15.5,14M9.5,14C7,14 5,12 5,9.5C5,7 7,5 9.5,5C12,5 14,7 14,9.5C14,12 12,14 9.5,14Z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Поиск пользователей..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="search-input"
                                />
                            </div>
                            {showResults && searchResults.length > 0 && (
                                <div className="search-results">
                                    {searchResults.map(user => (
                                        <div 
                                            key={user.id} 
                                            className="search-result-item"
                                            onClick={() => handleUserSelect(user)}
                                        >
                                            <div className="chat-avatar">
                                                {user.avatar ? (
                                                    <img 
                                                        src={`http://192.168.3.88:3001/static/pf_photos/${user.avatar}`}
                                                        alt={user.username}
                                                    />
                                                ) : (
                                                    <div className="header-chat-avatar-placeholder">
                                                        {user.username[0].toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="header-chat-info">
                                                <span className="chat-username">{user.username}</span>
                                                <span className={`chat-status ${isUserOnline(user.id) ? 'online' : ''}`}>
                                                    {getStatusText(user)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="header-right" ref={profileMenuRef}>
                        <button 
                            className="header-button profile-button"
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                            </svg>
                        </button>
                        {showProfileMenu && (
                            <div className="profile-menu">
                                <button 
                                    className="profile-menu-item"
                                    onClick={handleLogout}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="currentColor" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
                                    </svg>
                                    <span>Выйти</span>
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </header>
    );
};

export default Header; 
