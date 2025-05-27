import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChatList from './ChatList';
import ChatDialog from './ChatDialog';
import Header from './Header';
import './MessengerLayout.css';

const MessengerLayout = () => {
    const { chatId } = useParams();
    const chat = null;
    const [currentChat, setCurrentChat] = useState(null);

    useEffect(() => {
        setCurrentChat(localStorage.getItem('current_chat'));
    }, [chatId]);

    return (
        <>
            <Header currentChat={currentChat} />
            <div className={`messenger-layout ${chatId ? 'chat-opened' : ''}`}>
                <div className="chat-list-container">
                    <ChatList />
                </div>
                {chatId && (
                    <div className="chat-dialog-container">
                        <ChatDialog key={chatId} />
                    </div>
                )}
            </div>
        </>
    );
};

export default MessengerLayout;
