import React, { useEffect } from 'react';

const MessageNotification = ({ newMessage }) => {
  useEffect(() => {
    if (newMessage) {
      console.log("Получено новое сообщение для уведомления:", newMessage);
      
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          console.log("Уведомления разрешены, показываем уведомление");
          showNotification(newMessage);
        } else if (Notification.permission !== "denied") {
          console.log("Запрашиваем разрешение на уведомления");
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              console.log("Разрешение получено, показываем уведомление");
              showNotification(newMessage);
            } else {
              console.log("Разрешение не получено");
            }
          });
        } else {
          console.log("Уведомления заблокированы пользователем");
        }
      } else {
        console.log("Ваш браузер не поддерживает уведомления");
      }
  
      console.log("Пытаемся воспроизвести звук");
      playNotificationSound();
    }
  }, [newMessage]);

  const showNotification = (message) => {
    try {
      new Notification(`Новое сообщение от ${message.sender_name}`, {
        body: message.content,
      });
    } catch (error) {
      console.error("Ошибка создания уведомления:", error);
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('http://localhost:3001/static/sounds/notification-sound.mp3');
audio.play().catch(error =>
      console.error('Ошибка воспроизведения звука:', error)
    );
  };

  return null;
};

export default MessageNotification;
