import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

const INITIAL_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! I'm your Trip Wizard assistant 🧙 I can help you plan your days, find great restaurants, get weather tips, and optimize your schedule. Navigate to any trip or day and I'll have full context!",
};

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [tripVersion, setTripVersion] = useState(0);
  const notifyTripUpdated = () => setTripVersion((v) => v + 1);

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
    if (msg.role === 'assistant') {
      setUnread((n) => n + 1);
    }
  };

  const updateMessage = (index, updates) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    );
  };

  const openChat = () => {
    setIsOpen(true);
    setUnread(0);
  };

  const closeChat = () => setIsOpen(false);

  return (
    <ChatContext.Provider value={{ messages, addMessage, updateMessage, isOpen, openChat, closeChat, unread, tripVersion, notifyTripUpdated }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
