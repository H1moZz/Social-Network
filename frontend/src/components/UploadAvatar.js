import React, { useState } from 'react';
import api from '../api';
import './UploadAvatar.css';

function UploadAvatar({ onAvatarUpdated }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      // Создаем превью изображения
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Пожалуйста, выберите файл');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      
      setMessage('Аватар успешно загружен!');
      
      // Передаем новый URL аватара родительскому компоненту
      if (response.data && response.data.avatar_url && onAvatarUpdated) {
        onAvatarUpdated(response.data.avatar_url);
      }
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      setMessage(error.response?.data?.message || 'Ошибка загрузки аватара');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-avatar-container">
      <form onSubmit={handleSubmit} className="upload-avatar-form">
        <div className="preview-container">
          {preview ? (
            <img src={preview} alt="Предпросмотр" className="avatar-preview" />
          ) : (
            <div className="no-preview">
              <i className="image-icon">🖼️</i>
              <span>Выберите изображение</span>
            </div>
          )}
        </div>
        
        <div className="file-input-container">
          <label className="file-input-label">
            Выбрать изображение
            <input 
              type="file" 
              onChange={handleFileChange} 
              accept="image/*"
              className="file-input"
            />
          </label>
        </div>
        
        <button 
          type="submit" 
          className="upload-button"
          disabled={!file || loading}
        >
          {loading ? 'Загрузка...' : 'Загрузить'}
        </button>
      </form>
      
      {message && <p className="upload-message">{message}</p>}
    </div>
  );
}

export default UploadAvatar;
