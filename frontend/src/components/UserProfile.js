import React, { useState, useEffect } from 'react';
import api from '../api';

function UserProfile() {
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/users/me', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then((response) => {
                    setUser(response.data);
                })
                .catch((error) => {
                    setError(error);
                });
        }
    }, []);

    if (error) {
        return <div>Ошибка при загрузке профиля: {error.message}</div>;
    }

    if (!user) {
        return <div>Загрузка...</div>;
    }

    return (
        <div>
            <h2>Профиль пользователя</h2>
            {user.avatar_url ? (
                <img
                    src={user.avatar_url}
                    alt="Аватар"
                    style={{ width: '100px', height: '100px', borderRadius: '50%' }}
                />
            ) : (
                <p>Аватар не загружен</p>
            )}
            <p>
                <strong>Имя пользователя:</strong> {user.username}
            </p>
            <p>
                <strong>Email:</strong> {user.email}
            </p>
        </div>
    );
}

export default UserProfile;
