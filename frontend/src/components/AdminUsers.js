import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './AdminUsers.css';

function AdminUsers() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [message, setMessage] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        profession: '',
        avatar: null
    });
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/auth/users', { withCredentials: true });
            setUsers(response.data.users);
        } catch (error) {
            console.error('Ошибка при получении списка пользователей:', error);
            setMessage('Ошибка при загрузке списка пользователей');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setMessage('Размер файла не должен превышать 5MB');
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                setMessage('Поддерживаются только файлы формата JPEG, PNG и GIF');
                return;
            }

            setFormData(prev => ({
                ...prev,
                avatar: file
            }));

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            profession: user.profession || '',
            avatar: null
        });
        setPreviewUrl(user.avatar);
    };

    const handleDelete = async (userId) => {
        if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            try {
                await api.delete(`/api/auth/users/${userId}`, { withCredentials: true });
                setMessage('Пользователь успешно удален');
                fetchUsers();
            } catch (error) {
                console.error('Ошибка при удалении пользователя:', error);
                setMessage('Ошибка при удалении пользователя');
            }
        }
    };

    const handleRestore = async (userId) => {
        try {
            await api.post(`/api/auth/users/${userId}`);
            setMessage('Пользователь успешно восстановлен');
            fetchUsers();
        } catch (error) {
            console.error('Ошибка при восстановлении пользователя:', error);
            setMessage('Ошибка при восстановлении пользователя');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('username', formData.username);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('profession', formData.profession);
            if (formData.avatar) {
                formDataToSend.append('avatar', formData.avatar);
            }

            if (editingUser) {
                const response = await api.put(`/api/auth/users/${editingUser.id}`, formDataToSend, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    withCredentials: true
                });

                if (response.status === 200) {
                    setMessage('Пользователь успешно обновлен');
                    setEditingUser(null);
                    setFormData({
                        username: '',
                        email: '',
                        profession: '',
                        avatar: null
                    });
                    setPreviewUrl(null);
                    fetchUsers();
                }
            } else {
                await api.post('/api/auth/registration', formDataToSend);
                setMessage('Пользователь успешно создан');
                setEditingUser(null);
                setFormData({
                    username: '',
                    email: '',
                    profession: '',
                    avatar: null
                });
                setPreviewUrl(null);
                fetchUsers();
            }
        } catch (error) {
            console.error('Ошибка при обновлении пользователя:', error);
            setMessage(error.response?.data?.error || 'Произошла ошибка при обновлении пользователя');
        }
    };

    const handleCancel = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            email: '',
            profession: '',
            avatar: null
        });
        setPreviewUrl(null);
    };

    // Функция для получения корректного URL аватара
    const getAvatarUrl = (avatarPath) => {
        if (!avatarPath) return '';
        // Проверяем, является ли путь уже полным URL или содержит базовую часть
        if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://') || avatarPath.startsWith('/static/')) {
            return `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000'}${avatarPath}`;
        }
        // Если это только имя файла, добавляем полный путь
        return `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000'}/static/pf_photos/${avatarPath}`;
    };

    return (
        <div className="admin-users-container">
            <div className="admin-users-card">
                <div className="admin-users-header">
                    <div className="header-left">
                        <button 
                            className="back-button-admin"
                            onClick={() => navigate('/admin')}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                            </svg>
                            Назад
                        </button>
                        <h2>Управление пользователями</h2>
                    </div>
                    <button 
                        className="add-user-button"
                        onClick={() => navigate('/admin/register')}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                        </svg>
                        Добавить пользователя
                    </button>
                </div>
                
                {editingUser ? (
                    <form onSubmit={handleSubmit} className="admin-users-form">
                        <div className="input-group">
                            <label htmlFor="username">Имя пользователя</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="profession">Должность</label>
                            <input
                                type="text"
                                id="profession"
                                name="profession"
                                value={formData.profession}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="avatar">Аватар</label>
                            <div className="avatar-upload">
                                <input
                                    type="file"
                                    id="avatar"
                                    name="avatar"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                />
                                {previewUrl && (
                                    <div className="avatar-preview">
                                        <img src={previewUrl} alt="Preview" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="button-group">
                            <button type="submit" className="submit-button">
                                Сохранить
                            </button>
                            <button type="button" className="cancel-button" onClick={handleCancel}>
                                Отмена
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="users-list">
                        {users.map(user => (
                            <div key={user.id} className={`user-item ${user.is_deleted ? 'deleted' : ''}`}>
                                <div className="user-info">
                                    {user.avatar ? (
                                        <img 
                                            src={getAvatarUrl(user.avatar)} 
                                            alt={user.username} 
                                            className="user-avatar-admin"
                                        />
                                    ) : (
                                        <div className="user-avatar-placeholder-admin">
                                            {user.username[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className="user-details">
                                        <h3>{user.username}</h3>
                                        <p>{user.email}</p>
                                        {user.profession && <p className="user-profession-admin">{user.profession}</p>}
                                        <p>Статус: {user.is_deleted ? 'Удален' : 'Активен'}</p>
                                    </div>
                                </div>
                                <div className="user-actions">
                                    <button 
                                        className="edit-button"
                                        onClick={() => handleEdit(user)}
                                    >
                                        Редактировать
                                    </button>
                                    {user.is_deleted ? (
                                        <button
                                            className="restore-button"
                                            onClick={() => handleRestore(user.id)}
                                        >
                                            Восстановить
                                        </button>
                                    ) : (
                                        <button 
                                            className="delete-button"
                                            onClick={() => handleDelete(user.id)}
                                        >
                                            Удалить
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {message && (
                    <div className={`message ${message.includes('успешно') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminUsers; 