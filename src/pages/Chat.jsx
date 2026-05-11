import React, { useState, useEffect, useRef } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, push, serverTimestamp, set, get, update } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, MessageCircle, ArrowLeft, Circle, Users } from 'lucide-react';

const Chat = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserData, setCurrentUserData] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Generate unique chat ID from two user IDs
  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  // Fetch current user data
  useEffect(() => {
    if (!currentUser) return;
    const userRef = ref(rtdb, `users/${currentUser.uid}`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) setCurrentUserData(snap.val());
    });
    return () => unsub();
  }, [currentUser]);

  // Fetch all users (excluding current user and pending users)
  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .filter(([id, val]) => id !== currentUser.uid && val.role !== 'Pending')
          .map(([id, val]) => ({ id, ...val }));
        setUsers(list);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Listen for last messages and unread counts for all user conversations
  useEffect(() => {
    if (!currentUser || users.length === 0) return;

    const unsubscribers = [];
    users.forEach((user) => {
      const chatId = getChatId(currentUser.uid, user.id);
      const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
      const unsub = onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
          const msgs = Object.values(snapshot.val());
          const sorted = msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          const lastMsg = sorted[sorted.length - 1];
          setLastMessages(prev => ({ ...prev, [user.id]: lastMsg }));

          // Count unread
          const unread = sorted.filter(
            m => m.senderId !== currentUser.uid && !m.read
          ).length;
          setUnreadCounts(prev => ({ ...prev, [user.id]: unread }));
        }
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(u => u());
  }, [currentUser, users]);

  // Listen for messages in selected conversation
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const chatId = getChatId(currentUser.uid, selectedUser.id);
    const messagesRef = ref(rtdb, `chats/${chatId}/messages`);

    const unsub = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(list);

        // Mark messages as read
        Object.entries(data).forEach(([msgId, msg]) => {
          if (msg.senderId !== currentUser.uid && !msg.read) {
            update(ref(rtdb, `chats/${chatId}/messages/${msgId}`), { read: true });
          }
        });
      } else {
        setMessages([]);
      }
    });

    return () => unsub();
  }, [selectedUser, currentUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when selecting user
  useEffect(() => {
    if (selectedUser) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [selectedUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const chatId = getChatId(currentUser.uid, selectedUser.id);
    const msgRef = push(ref(rtdb, `chats/${chatId}/messages`));

    await set(msgRef, {
      senderId: currentUser.uid,
      senderName: currentUserData?.nama || currentUser.email,
      text: newMessage.trim(),
      timestamp: Date.now(),
      read: false
    });

    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setIsMobileListOpen(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Kemarin';
    } else {
      return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return '#ef4444';
      case 'Petugas': return '#3b82f6';
      case 'Monitoring': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const filteredUsers = users.filter(u =>
    (u.nama || u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort users: those with messages first (by last message time), then alphabetical
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aTime = lastMessages[a.id]?.timestamp || 0;
    const bTime = lastMessages[b.id]?.timestamp || 0;
    if (aTime && bTime) return bTime - aTime;
    if (aTime) return -1;
    if (bTime) return 1;
    return (a.nama || '').localeCompare(b.nama || '');
  });

  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="page-container" style={{ padding: '0', height: 'calc(100vh - 40px)', maxWidth: '100%' }}>
      <div className="chat-layout">

        {/* Contact List */}
        <div className={`chat-sidebar ${isMobileListOpen ? 'mobile-show' : ''}`}>
          <div className="chat-sidebar-header">
            <h2><MessageCircle size={20} /> Pesan {totalUnread > 0 && <span className="total-badge">{totalUnread}</span>}</h2>
          </div>

          <div className="chat-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="chat-contacts">
            {sortedUsers.length === 0 ? (
              <div className="no-contacts">
                <Users size={32} style={{ opacity: 0.3 }} />
                <p>Belum ada kontak</p>
              </div>
            ) : (
              sortedUsers.map((user) => (
                <motion.div
                  key={user.id}
                  className={`contact-item ${selectedUser?.id === user.id ? 'active' : ''}`}
                  onClick={() => handleSelectUser(user)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="contact-avatar" style={{ background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}88)` }}>
                    {getInitials(user.nama)}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name-row">
                      <span className="contact-name">{user.nama || user.email}</span>
                      {lastMessages[user.id] && (
                        <span className="contact-time">{formatTime(lastMessages[user.id].timestamp)}</span>
                      )}
                    </div>
                    <div className="contact-preview-row">
                      <span className="contact-preview">
                        {lastMessages[user.id]
                          ? (lastMessages[user.id].senderId === currentUser.uid ? 'Anda: ' : '') + lastMessages[user.id].text
                          : <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Mulai percakapan</span>
                        }
                      </span>
                      {unreadCounts[user.id] > 0 && (
                        <span className="unread-badge">{unreadCounts[user.id]}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`chat-main ${!isMobileListOpen ? 'mobile-show' : ''}`}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="chat-main-header">
                <button className="back-btn-mobile" onClick={() => setIsMobileListOpen(true)}>
                  <ArrowLeft size={20} />
                </button>
                <div className="contact-avatar small" style={{ background: `linear-gradient(135deg, ${getRoleColor(selectedUser.role)}, ${getRoleColor(selectedUser.role)}88)` }}>
                  {getInitials(selectedUser.nama)}
                </div>
                <div className="header-info">
                  <h3>{selectedUser.nama || selectedUser.email}</h3>
                  <span className="role-tag" style={{ color: getRoleColor(selectedUser.role) }}>{selectedUser.role}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <MessageCircle size={48} style={{ opacity: 0.15 }} />
                    <p>Belum ada pesan</p>
                    <span>Kirim pesan pertama Anda ke {selectedUser.nama || selectedUser.email}</span>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUser.uid;
                    const showDate = index === 0 || 
                      new Date(msg.timestamp).toDateString() !== new Date(messages[index - 1].timestamp).toDateString();

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="date-divider">
                            <span>{new Date(msg.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                          </div>
                        )}
                        <motion.div
                          className={`message-bubble ${isMe ? 'sent' : 'received'}`}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          <p className="message-text">{msg.text}</p>
                          <span className="message-time">
                            {formatTime(msg.timestamp)}
                            {isMe && <span className="read-status">{msg.read ? ' ✓✓' : ' ✓'}</span>}
                          </span>
                        </motion.div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form className="chat-input-area" onSubmit={handleSend}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ketik pesan..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="chat-input"
                />
                <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="no-chat-selected">
              <div className="no-chat-icon">
                <MessageCircle size={64} />
              </div>
              <h3>P3H Messenger</h3>
              <p>Pilih kontak untuk memulai percakapan</p>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .chat-layout {
          display: flex;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(0,0,0,0.15);
          border: 1px solid rgba(255,255,255,0.08);
        }

        /* Sidebar */
        .chat-sidebar {
          width: 340px;
          min-width: 340px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.1);
        }
        .chat-sidebar-header {
          padding: 1.2rem 1.2rem 0.8rem;
        }
        .chat-sidebar-header h2 {
          color: white;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .total-badge {
          background: #1877f2;
          color: white;
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 700;
        }
        .chat-search {
          padding: 0 1rem 0.8rem;
          position: relative;
        }
        .chat-search .search-icon {
          position: absolute;
          left: 1.8rem;
          top: 50%;
          transform: translateY(-70%);
          color: rgba(255,255,255,0.3);
          pointer-events: none;
        }
        .chat-search input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: white;
          font-size: 0.85rem;
        }
        .chat-search input:focus {
          border-color: #1877f2;
          background: rgba(255,255,255,0.1);
          box-shadow: none;
        }

        .chat-contacts {
          flex: 1;
          overflow-y: auto;
          padding: 0 0.5rem;
        }
        .no-contacts {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: rgba(255,255,255,0.3);
          gap: 8px;
          font-size: 0.85rem;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .contact-item:hover {
          background: rgba(255,255,255,0.06);
        }
        .contact-item.active {
          background: rgba(24, 119, 242, 0.15);
          border: 1px solid rgba(24, 119, 242, 0.2);
        }
        .contact-avatar {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .contact-avatar.small {
          width: 36px;
          height: 36px;
          min-width: 36px;
          font-size: 0.75rem;
        }
        .contact-info {
          flex: 1;
          min-width: 0;
        }
        .contact-name-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
        }
        .contact-name {
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .contact-time {
          color: rgba(255,255,255,0.4);
          font-size: 0.7rem;
          white-space: nowrap;
          margin-left: 8px;
        }
        .contact-preview-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .contact-preview {
          color: rgba(255,255,255,0.45);
          font-size: 0.8rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .unread-badge {
          background: #1877f2;
          color: white;
          font-size: 0.65rem;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          margin-left: 8px;
          padding: 0 5px;
        }

        /* Chat Main */
        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .chat-main-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.1);
        }
        .back-btn-mobile {
          display: none;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
        }
        .header-info h3 {
          color: white;
          font-size: 0.95rem;
          margin: 0;
        }
        .role-tag {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.3);
          gap: 8px;
          text-align: center;
        }
        .empty-chat p {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }
        .empty-chat span {
          font-size: 0.8rem;
          opacity: 0.6;
        }

        .date-divider {
          display: flex;
          justify-content: center;
          margin: 16px 0 8px;
        }
        .date-divider span {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5);
          font-size: 0.7rem;
          padding: 4px 14px;
          border-radius: 8px;
        }

        .message-bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 16px;
          word-wrap: break-word;
          position: relative;
        }
        .message-bubble.sent {
          align-self: flex-end;
          background: #1877f2;
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message-bubble.received {
          align-self: flex-start;
          background: rgba(255,255,255,0.1);
          color: white;
          border-bottom-left-radius: 4px;
        }
        .message-text {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.4;
        }
        .message-time {
          display: block;
          font-size: 0.65rem;
          opacity: 0.6;
          text-align: right;
          margin-top: 4px;
        }
        .read-status {
          color: #60a5fa;
        }
        .message-bubble.sent .read-status {
          color: rgba(255,255,255,0.7);
        }

        /* Input */
        .chat-input-area {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.1);
        }
        .chat-input {
          flex: 1;
          padding: 12px 16px !important;
          border-radius: 24px !important;
          background: rgba(255,255,255,0.08) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: white;
          font-size: 0.9rem;
        }
        .chat-input:focus {
          border-color: #1877f2 !important;
          background: rgba(255,255,255,0.12) !important;
          box-shadow: none !important;
        }
        .send-btn {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 50%;
          border: none;
          background: #1877f2;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .send-btn:hover:not(:disabled) {
          background: #166fe5;
          transform: scale(1.05);
        }
        .send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* No chat selected */
        .no-chat-selected {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.25);
          gap: 12px;
        }
        .no-chat-icon {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(24, 119, 242, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1877f2;
        }
        .no-chat-selected h3 {
          color: rgba(255,255,255,0.6);
          font-size: 1.3rem;
          margin: 0;
        }
        .no-chat-selected p {
          font-size: 0.85rem;
          opacity: 0.5;
        }

        /* Scrollbar */
        .chat-messages::-webkit-scrollbar,
        .chat-contacts::-webkit-scrollbar {
          width: 4px;
        }
        .chat-messages::-webkit-scrollbar-thumb,
        .chat-contacts::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .chat-sidebar {
            position: absolute;
            width: 100%;
            min-width: 100%;
            z-index: 10;
            height: 100%;
            display: none;
            background: rgba(0,0,0,0.95);
          }
          .chat-sidebar.mobile-show {
            display: flex;
          }
          .chat-main {
            display: none;
          }
          .chat-main.mobile-show {
            display: flex;
          }
          .back-btn-mobile {
            display: block;
          }
          .chat-layout {
            position: relative;
          }
          .message-bubble {
            max-width: 85%;
          }
        }
      `}} />
    </div>
  );
};

export default Chat;
