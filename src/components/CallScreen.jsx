import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../context/CallContext';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Mic, MicOff, User } from 'lucide-react';

const CallScreen = () => {
  const { callStatus, remoteUser, remoteStream, isMuted, toggleMute, endCall } = useCall();
  const audioRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (remoteStream && audioRef.current) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Timer for call duration
  useEffect(() => {
    let interval;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (callStatus !== 'calling' && callStatus !== 'connected') return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="call-screen-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="call-screen-container">
          <div className="call-header">
            <h2 style={{ margin: 0, fontWeight: 600 }}>Panggilan Suara</h2>
          </div>

          <div className="call-center-info">
            <div className="call-avatar-large">
              <User size={64} color="white" />
              {callStatus === 'calling' && <div className="ripple-effect"></div>}
            </div>
            
            <h1 className="call-user-name">{remoteUser?.name || 'Pengguna'}</h1>
            <p className="call-status-text">
              {callStatus === 'calling' ? 'Memanggil...' : formatDuration(callDuration)}
            </p>
          </div>

          <div className="call-controls">
            <button 
              className={`control-btn ${isMuted ? 'muted' : ''}`} 
              onClick={toggleMute}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button className="control-btn end-call" onClick={endCall}>
              <PhoneOff size={28} />
            </button>
          </div>

          <audio ref={audioRef} autoPlay />
        </div>

        <style>{`
          .call-screen-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.98);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .call-screen-container {
            width: 100%;
            max-width: 400px;
            height: 100%;
            max-height: 700px;
            display: flex;
            flex-direction: column;
            padding: 2rem;
            color: white;
            text-align: center;
          }
          .call-header {
            margin-bottom: auto;
          }
          .call-center-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
          }
          .call-avatar-large {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: linear-gradient(135deg, #475569, #1e293b);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          }
          .call-user-name {
            font-size: 1.8rem;
            margin: 0;
            font-weight: 700;
          }
          .call-status-text {
            color: #94a3b8;
            font-size: 1.1rem;
            margin: 0;
          }
          .call-controls {
            margin-top: auto;
            display: flex;
            justify-content: center;
            gap: 2rem;
            padding-bottom: 2rem;
          }
          .control-btn {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            backdrop-filter: blur(10px);
          }
          .control-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
          }
          .control-btn.muted {
            background: white;
            color: #0f172a;
          }
          .control-btn.end-call {
            background: #ef4444;
            color: white;
            width: 72px;
            height: 72px;
          }
          .control-btn.end-call:hover {
            background: #dc2626;
          }
          .ripple-effect {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: 50%;
            border: 2px solid #3b82f6;
            animation: ripple 2s infinite ease-out;
          }
          @keyframes ripple {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallScreen;
