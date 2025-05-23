import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';
import socket from './webSocket';
import UploadAvatar from './UploadAvatar';

function UserProfile() {
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAvatarUpload, setShowAvatarUpload] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await api.post('/api/auth/logout', { withCredentials: true });
            localStorage.clear();
            socket.disconnect();
            navigate('/');
        } catch (error) {
            console.error("Ошибка при выходе:", error);
        }
    };

    const handleAvatarUpdate = (newAvatarUrl) => {
        setUser(prevUser => ({
            ...prevUser,
            avatar_url: newAvatarUrl
        }));
        setShowAvatarUpload(false);
    };

    useEffect(() => {
        api.get('/api/users/me',{
            withCredentials: true
        })
        .then((response) => {
            setUser(response.data);
            setIsLoading(false);
        })
        .catch((error) => {
            setError(error);
            setIsLoading(false);
        });
    }, []);

    if (isLoading) {
        return (
            <div className="profile-loading">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-error">
                ⚠️ Ошибка при загрузке профиля: {error.message}
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <div className="profile-header">
                    <div className="avatar-wrapper">
                        {user.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt="Аватар"
                                className="profile-avatar"
                                onClick={() => setShowAvatarUpload(true)}
                            />
                        ) : (
                            <div 
                                className="avatar-placeholder"
                                onClick={() => setShowAvatarUpload(true)}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                </svg>
                            </div>
                        )}
                        <div className="avatar-overlay" onClick={() => setShowAvatarUpload(true)}>
                            <span>Изменить</span>
                        </div>
                    </div>
                    <h2 className="profile-username">{user.username}</h2>
                </div>

                {showAvatarUpload && (
                    <div className="avatar-upload-modal">
                        <div className="avatar-upload-modal-content">
                            <h3>Изменить аватар</h3>
                            <UploadAvatar onAvatarUpdated={handleAvatarUpdate} />
                            <button 
                                className="close-modal-button"
                                onClick={() => setShowAvatarUpload(false)}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                )}

                <div className="profile-info">
                    <div className="info-item">
                        <span className="info-label">📧 Email:</span>
                        <span className="info-value">{user.email}</span>
                    </div>
                    
                    <div className="stats-container">
                        <div className="stat-box">
                            <span className="stat-number">1.2k</span>
                            <span className="stat-label">Подписчиков</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-number">356</span>
                            <span className="stat-label">Подписок</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-number">589</span>
                            <span className="stat-label">Публикаций</span>
                        </div>
                    </div>
                </div>

                <div className="profile-actions">
                    <button className="edit-button">
                        ✏️ Редактировать профиль
                    </button>
                    <button onClick={handleLogout} className="logout-button">
                        🚪 Выйти
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;