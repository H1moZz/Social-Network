import React from 'react';
import { useParams } from 'react-router-dom';
import ChatList from './ChatList';
import ChatDialog from './ChatDialog';
import './MessengerLayout.css';

const MessengerLayout = () => {
    const { chatId } = useParams();
    console.log('Current chatId:', chatId); // Для отладки

    return (
        <div className={`messenger-layout ${chatId ? 'chat-opened' : ''}`}>
            <div className="chat-list-container">
                <ChatList />
            </div>
            {chatId && (
                <div className="chat-dialog-container">
                    <ChatDialog key={chatId} /> {/* Добавляем key для пересоздания компонента при смене чата */}
                </div>
            )}
        </div>
    );
};

export default MessengerLayout;
