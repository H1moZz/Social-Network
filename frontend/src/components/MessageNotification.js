import React, { useEffect } from 'react';

const MessageNotification = ({ newMessage }) => {
  useEffect(() => {
    const showNotification = async () => {
      if (!newMessage) return;

      if (Notification.permission === 'granted') {
        const notification = new Notification('Новое сообщение', {
          body: newMessage.content,
          icon: '/path/to/icon.png'
        });

        try {
          const audio = new Audio('/path/to/notification.mp3');
          await audio.play();
        } catch (error) {
          console.error('Ошибка при воспроизведении звука:', error);
        }
      } else if (Notification.permission !== 'denied') {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const notification = new Notification('Новое сообщение', {
              body: newMessage.content,
              icon: '/path/to/icon.png'
            });
          }
        } catch (error) {
          console.error('Ошибка при запросе разрешения на уведомления:', error);
        }
      }
    };

    showNotification();
  }, [newMessage]);

  return null;
};

export default MessageNotification;
