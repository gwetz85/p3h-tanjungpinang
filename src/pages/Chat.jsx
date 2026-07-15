import React, { useState, useEffect, useRef } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, push, serverTimestamp, set, get, update, remove } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, MessageCircle, ArrowLeft, Circle, Users, Trash2, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall } from 'lucide-react';

const Chat = () => {
  const { currentUser } = useAuth();
  const { startCall } = useCall();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserData, setCurrentUserData] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [koordinators, setKoordinators] = useState([]);
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('pesan');
  const [calls, setCalls] = useState([]);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callState, setCallState] = useState('idle'); // idle, calling, connected
  const [callDuration, setCallDuration] = useState(0);
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
        const SUPERADMIN_EMAILS = ['admin@tarunabangsa.id', 'sihalal-akun@gmail.com'];
        const list = Object.entries(data)
          .filter(([id, val]) => 
            id !== currentUser.uid && 
            val.role !== 'Pending' && 
            val.role?.toLowerCase() !== 'superadmin' &&
            !SUPERADMIN_EMAILS.includes(val.email)
          )
          .map(([id, val]) => ({ id, ...val }));
        setUsers(list);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Fetch koordinators for fallback photos
  useEffect(() => {
    const coordRef = ref(rtdb, 'koordinators');
    const unsub = onValue(coordRef, (snapshot) => {
      if (snapshot.exists()) {
        setKoordinators(Object.values(snapshot.val()));
      }
    });
    return () => unsub();
  }, []);

  // Listen for last messages and unread counts for all user conversations
  useEffect(() => {
    if (!currentUser || users.length === 0) return;

    const unsubscribers = [];
    users.forEach((user) => {
      const chatId = getChatId(currentUser.uid, user.id);
      
      // Listen for clearedAt timestamp
      const clearedRef = ref(rtdb, `chats/${chatId}/clearedAt/${currentUser.uid}`);
      let clearedAt = 0;
      onValue(clearedRef, (snap) => {
        clearedAt = snap.val() || 0;
      });

      const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
      const unsub = onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
          const msgs = Object.values(snapshot.val());
          const filtered = msgs.filter(m => (m.timestamp || 0) > clearedAt);
          const sorted = filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          
          if (sorted.length > 0) {
            const lastMsg = sorted[sorted.length - 1];
            setLastMessages(prev => ({ ...prev, [user.id]: lastMsg }));
          } else {
            setLastMessages(prev => {
              const newState = { ...prev };
              delete newState[user.id];
              return newState;
            });
          }

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
    const clearedRef = ref(rtdb, `chats/${chatId}/clearedAt/${currentUser.uid}`);

    // Get clearedAt once or listen? Listening is safer
    const unsubCleared = onValue(clearedRef, (clearedSnap) => {
      const clearedAt = clearedSnap.val() || 0;
      
      onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.entries(data)
            .map(([id, val]) => ({ id, ...val }))
            .filter(m => (m.timestamp || 0) > clearedAt)
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          
          setMessages(list);

          // Mark messages as read
          Object.entries(data).forEach(([msgId, msg]) => {
            if (msg.senderId !== currentUser.uid && !msg.read && (msg.timestamp || 0) > clearedAt) {
              update(ref(rtdb, `chats/${chatId}/messages/${msgId}`), { read: true });
            }
          });
        } else {
          setMessages([]);
        }
      });
    });

    return () => unsubCleared();
  }, [selectedUser, currentUser]);

  // Call Timer Effect
  useEffect(() => {
    let interval;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Fetch calls in selected conversation
  useEffect(() => {
    if (!selectedUser || !currentUser) return;
    const chatId = getChatId(currentUser.uid, selectedUser.id);
    const callsRef = ref(rtdb, `chats/${chatId}/calls`);
    
    const unsubCalls = onValue(callsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // newest first
        setCalls(list);
      } else {
        setCalls([]);
      }
    });

    return () => unsubCalls();
  }, [selectedUser, currentUser]);

  const handleStartCall = () => {
    setIsCallModalOpen(true);
    setCallState('calling');
    setCallDuration(0);
  };

  const handleSimulateAnswer = () => {
    setCallState('connected');
  };

  const handleEndCall = async () => {
    if (!selectedUser || !currentUser) return;
    
    const chatId = getChatId(currentUser.uid, selectedUser.id);
    const callRef = push(ref(rtdb, `chats/${chatId}/calls`));
    
    // If ended before connected, it's missed. Otherwise answered.
    const status = callState === 'calling' ? 'missed' : 'answered';
    
    await set(callRef, {
      callerId: currentUser.uid,
      timestamp: Date.now(),
      duration: callState === 'connected' ? callDuration : 0,
      status: status
    });
    
    setCallState('idle');
    setIsCallModalOpen(false);
    setCallDuration(0);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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

  const handleClearChat = async () => {
    if (!selectedUser || !currentUser) return;
    if (window.confirm(`Hapus riwayat pesan Anda dengan ${selectedUser.nama || selectedUser.email}? (Pesan tetap ada di akun lawan bicara)`)) {
      const chatId = getChatId(currentUser.uid, selectedUser.id);
      try {
        // Set clearedAt for current user to now
        await set(ref(rtdb, `chats/${chatId}/clearedAt/${currentUser.uid}`), Date.now());
        setMessages([]);
        alert('Riwayat chat Anda berhasil dibersihkan.');
      } catch (err) {
        alert('Gagal membersihkan riwayat chat.');
      }
    }
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

  const getUserPhoto = (user) => {
    if (user.photoURL) return user.photoURL;
    if (user.nama) {
      const coord = koordinators.find(c => c.nama === user.nama);
      if (coord && coord.photoURL) return coord.photoURL;
    }
    return null;
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
    <div className="page-container" style={{ padding: '0', height: 'calc(100vh - 130px)', maxWidth: '100%' }}>
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
                    {getUserPhoto(user) ? (
                      <img src={getUserPhoto(user)} alt={user.nama} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      getInitials(user.nama)
                    )}
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
                  {getUserPhoto(selectedUser) ? (
                    <img src={getUserPhoto(selectedUser)} alt={selectedUser.nama} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(selectedUser.nama)
                  )}
                </div>
                <div className="header-info" style={{ flex: 1 }}>
                  <h3>{selectedUser.nama || selectedUser.email}</h3>
                  <span className="role-tag">{selectedUser.role}</span>
                </div>
                
                <div className="chat-tabs">
                  <button 
                    className={`tab-btn ${activeTab === 'pesan' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pesan')}
                  >
                    Pesan
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'panggilan' ? 'active' : ''}`}
                    onClick={() => setActiveTab('panggilan')}
                  >
                    Panggilan
                  </button>
                </div>

                <div className="header-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => startCall(selectedUser.id, selectedUser.nama || selectedUser.email)} 
                    className="call-btn"
                    title="Panggil Suara (WebRTC)"
                  >
                    <Phone size={18} />
                  </button>
                  
                  <button 
                    onClick={handleStartCall} 
                    className="phone-btn"
                    title="Simulasi Panggil & Log"
                  >
                    <PhoneCall size={18} />
                  </button>

                  <button 
                    onClick={handleClearChat} 
                    className="clear-chat-btn"
                    title="Hapus Riwayat Chat"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Call Simulation Modal */}
              <AnimatePresence>
                {isCallModalOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="call-modal"
                  >
                    <div className="call-modal-content glass-card">
                      <div className="call-avatar" style={{ background: `linear-gradient(135deg, ${getRoleColor(selectedUser.role)}, ${getRoleColor(selectedUser.role)}88)` }}>
                        {getUserPhoto(selectedUser) ? (
                          <img src={getUserPhoto(selectedUser)} alt={selectedUser.nama} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(selectedUser.nama)
                        )}
                      </div>
                      <h3 className="call-name">{selectedUser.nama || selectedUser.email}</h3>
                      <p className="call-status">
                        {callState === 'calling' ? 'Memanggil...' : `Terhubung - ${formatDuration(callDuration)}`}
                      </p>
                      
                      <div className="call-actions">
                        {callState === 'calling' && (
                          <button onClick={handleSimulateAnswer} className="btn-answer">
                            <PhoneCall size={20} />
                            <span>Angkat (Simulasi)</span>
                          </button>
                        )}
                        <button onClick={handleEndCall} className="btn-end">
                          <Phone size={20} style={{ transform: 'rotate(135deg)' }} />
                          <span>Akhiri</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Content Area */}
              {activeTab === 'pesan' ? (
                <>
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
                <div className="call-history-container">
                  {calls.length === 0 ? (
                    <div className="empty-chat">
                      <Phone size={48} style={{ opacity: 0.15 }} />
                      <p>Belum ada riwayat panggilan</p>
                    </div>
                  ) : (
                    <div className="call-list">
                      {calls.map((call, index) => {
                        const isCaller = call.callerId === currentUser.uid;
                        const isMissed = call.status === 'missed' || call.duration === 0;
                        
                        let CallIcon = PhoneOutgoing;
                        let iconColor = '#10b981'; // green
                        let typeText = 'Panggilan Keluar';

                        if (!isCaller) {
                          CallIcon = PhoneIncoming;
                          typeText = 'Panggilan Masuk';
                        }
                        
                        if (isMissed) {
                          CallIcon = PhoneMissed;
                          iconColor = '#ef4444'; // red
                          typeText = 'Panggilan Tidak Terjawab';
                        }

                        const showDate = index === 0 || 
                          new Date(call.timestamp).toDateString() !== new Date(calls[index - 1].timestamp).toDateString();

                        return (
                          <React.Fragment key={call.id}>
                            {showDate && (
                              <div className="date-divider">
                                <span>{new Date(call.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                              </div>
                            )}
                            <div className="call-item glass-card">
                              <div className="call-icon-wrap" style={{ color: iconColor, backgroundColor: `${iconColor}15` }}>
                                <CallIcon size={20} />
                              </div>
                              <div className="call-details">
                                <h4>{typeText}</h4>
                                <span className="call-time">{new Date(call.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="call-duration">
                                {isMissed ? 'Tidak dijawab' : formatDuration(call.duration)}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        /* Sidebar */
        .chat-sidebar {
          width: 340px;
          min-width: 340px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #e5e7eb;
          background: #f8fafc;
        }
        .chat-sidebar-header {
          padding: 1.2rem 1.2rem 0.8rem;
        }
        .chat-sidebar-header h2 {
          color: #000000;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .total-badge {
          background: #ef4444;
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
          color: #94a3b8;
          pointer-events: none;
        }
        .chat-search input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #0f172a;
          font-size: 0.85rem;
        }
        .chat-search input:focus {
          border-color: #3b82f6;
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
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
          color: #94a3b8;
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
          background: #f1f5f9;
        }
        .contact-item.active {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
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
          color: #000000;
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .contact-time {
          color: #64748b;
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
          color: #475569;
          font-size: 0.8rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .unread-badge {
          background: #ef4444;
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
          background: #ffffff;
        }
        .chat-main-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
        }
        .back-btn-mobile {
          display: none;
          background: none;
          border: none;
          color: #0f172a;
          cursor: pointer;
          padding: 4px;
        }
        .header-info h3 {
          color: #000000;
          font-size: 0.95rem;
          margin: 0;
        }
        .role-tag {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #2563eb;
        }
        .header-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .clear-chat-btn, .call-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .clear-chat-btn:hover {
          background: #fee2e2;
          color: #ef4444;
        }
        .call-btn:hover {
          background: #dcfce7;
          color: #22c55e;
        }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: #f8fafc;
        }
        .empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          gap: 8px;
          text-align: center;
        }
        .empty-chat p {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          color: #475569;
        }
        .empty-chat span {
          font-size: 0.8rem;
        }

        .date-divider {
          display: flex;
          justify-content: center;
          margin: 16px 0 8px;
        }
        .date-divider span {
          background: #e2e8f0;
          color: #475569;
          font-size: 0.7rem;
          padding: 4px 14px;
          border-radius: 8px;
          font-weight: 500;
        }

        .message-bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 16px;
          word-wrap: break-word;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .message-bubble.sent {
          align-self: flex-end;
          background: #e0f2fe;
          border-bottom-right-radius: 4px;
        }
        .message-bubble.received {
          align-self: flex-start;
          background: #ffffff;
          border-bottom-left-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        .message-text {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.4;
          color: #000000;
        }
        .message-time {
          display: block;
          font-size: 0.65rem;
          color: #64748b;
          text-align: right;
          margin-top: 4px;
        }
        .read-status {
          color: #3b82f6;
        }

        /* Input */
        .chat-input-area {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          background: #ffffff;
        }
        .chat-input {
          flex: 1;
          padding: 12px 16px !important;
          border-radius: 24px !important;
          background: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
          color: #000000;
          font-size: 0.9rem;
        }
        .chat-input:focus {
          border-color: #3b82f6 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
          outline: none;
        }
        .send-btn {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 50%;
          border: none;
          background: #3b82f6;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .send-btn:hover:not(:disabled) {
          background: #2563eb;
          transform: scale(1.05);
        }
        .send-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        /* No chat selected */
        .no-chat-selected {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          gap: 12px;
          background: #f8fafc;
        }
        .no-chat-icon {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
        }
        .no-chat-selected h3 {
          color: #0f172a;
          font-size: 1.3rem;
          margin: 0;
          font-weight: 600;
        }
        .no-chat-selected p {
          font-size: 0.85rem;
          color: #64748b;
        }

        /* Call Feature Styles */
        .chat-tabs {
          display: flex;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 4px;
          margin: 0 10px;
        }
        .tab-btn {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #ffffff;
          color: #3b82f6;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .phone-btn {
          background: #ecfdf5;
          color: #10b981;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: 8px;
        }
        .phone-btn:hover {
          background: #10b981;
          color: white;
          transform: scale(1.05);
        }

        .call-modal {
          position: absolute;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
          width: 300px;
        }
        .call-modal-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .call-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 16px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .call-name {
          margin: 0 0 8px 0;
          font-size: 1.2rem;
          color: #0f172a;
        }
        .call-status {
          margin: 0 0 24px 0;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .call-actions {
          display: flex;
          gap: 16px;
          width: 100%;
        }
        .btn-answer, .btn-end {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        .btn-answer {
          background: #10b981;
          color: white;
        }
        .btn-answer:hover { background: #059669; transform: translateY(-2px); }
        .btn-end {
          background: #ef4444;
          color: white;
        }
        .btn-end:hover { background: #dc2626; transform: translateY(-2px); }

        .call-history-container {
          flex: 1;
          overflow-y: auto;
          background: #f8fafc;
          padding: 1.5rem;
        }
        .call-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 600px;
          margin: 0 auto;
        }
        .call-item {
          display: flex;
          align-items: center;
          padding: 16px;
          border-radius: 12px;
          background: white;
          gap: 16px;
          transition: all 0.2s;
        }
        .call-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .call-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .call-details {
          flex: 1;
        }
        .call-details h4 {
          margin: 0 0 4px 0;
          font-size: 0.95rem;
          color: #0f172a;
        }
        .call-time {
          font-size: 0.8rem;
          color: #64748b;
        }
        .call-duration {
          font-weight: 600;
          color: #334155;
          font-size: 0.9rem;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 20px;
        }

        /* Scrollbar */
        .chat-messages::-webkit-scrollbar,
        .chat-contacts::-webkit-scrollbar {
          width: 5px;
        }
        .chat-messages::-webkit-scrollbar-thumb,
        .chat-contacts::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .chat-messages::-webkit-scrollbar-thumb:hover,
        .chat-contacts::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
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
            background: #ffffff;
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
