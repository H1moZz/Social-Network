import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './AdminRegister.css';

function AdminRegister() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        profession: '',
        avatar: null
    });
    const [message, setMessage] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);
    const navigate = useNavigate();

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
            if (file.size > 5 * 1024 * 1024) { // 5MB
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

            // Создаем превью для изображения
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('username', formData.username);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('password', formData.password);
            formDataToSend.append('profession', formData.profession);
            if (formData.avatar) {
                formDataToSend.append('avatar', formData.avatar);
            }

            const response = await api.post('/api/auth/registration', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
            });

            if (response.status === 201) {
                setMessage('Пользователь успешно зарегистрирован');
                setTimeout(() => {
                    navigate('/chats');
                }, 2000);
            }
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            setMessage(error.response?.data?.error || 'Произошла ошибка при регистрации');
        }
    };

    return (
        <div className="admin-register-container">
            <div className="admin-register-card">
                <h2>Регистрация нового пользователя</h2>
                <form onSubmit={handleSubmit} className="admin-register-form">
                    <div className="input-group">
                        <label htmlFor="username">Имя пользователя</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            required
                            placeholder="Введите имя пользователя"
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
                            placeholder="Введите email"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Пароль</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            placeholder="Введите пароль"
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
                            placeholder="Введите должность"
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

                    {message && (
                        <div className={`message ${message.includes('успешно') ? 'success' : 'error'}`}>
                            {message}
                        </div>
                    )}

                    <button type="submit" className="submit-button">
                        <span>Зарегистрировать</span>
                        <svg width="15px" height="10px" viewBox="0 0 13 10">
                            <path d="M1,5 L11,5"></path>
                            <polyline points="8 1 12 5 8 9"></polyline>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AdminRegister; 
 
 