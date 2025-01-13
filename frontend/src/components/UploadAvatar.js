import React, { useState } from 'react';
import api from '../api';

function UploadAvatar() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      api.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setMessage('Аватар успешно загружен!');
    } catch (error) {
      setMessage('Ошибка загрузки аватара');
    }
  };

  return (
    <div>
      <h2>Загрузить аватар</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Загрузить</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default UploadAvatar;
