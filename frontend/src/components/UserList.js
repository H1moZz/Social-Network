import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './UserList.css';

function UserList() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/api/users');
        setUsers(response.data);
      } catch (err) {
        console.error("Ошибка загрузки пользователей:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Функция для открытия чата с выбранным пользователем
  const handleStartChat = async (participantId) => {
    try {
      // Отправляем запрос на создание или открытие чата
      const response = await api.post('/api/messenger/chats', { participant_id: participantId }, {
        withCredentials: true,
    });
      const chatId = response.data.id;
      navigate(`/chats/${chatId}`);
    } catch (err) {
      console.error("Ошибка при открытии чата:", err);
      // Можно добавить уведомление об ошибке для пользователя
    }
  };

  if (isLoading) return <p>Загрузка пользователей...</p>;
  if (error) return <p>Ошибка: {error.message}</p>;

  return (
    <div className="user-list">
      <h2>Список пользователей</h2>
      <ul>
        {users.map(user => (
          <li key={user.id} className="user-card">
            <div className="avatar-wrapper">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${user.username} аватар`}
                  className="user-avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="user-details">
              <h3>{user.username}</h3>
              <p>{user.email}</p>
            </div>
            <button onClick={() => handleStartChat(user.id)}>
              Написать
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
