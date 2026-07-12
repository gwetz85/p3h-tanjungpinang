import React from 'react';
import { useCall } from '../context/CallContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';

const IncomingCall = () => {
  const { callStatus, incomingCallData, answerCall, rejectCall } = useCall();

  if (callStatus !== 'ringing' || !incomingCallData) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="incoming-call-overlay"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="incoming-call-card glass-card">
          <div className="caller-info">
            <div className="caller-avatar">
              <Phone size={24} className="ring-animation" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>{incomingCallData.callerName}</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Panggilan Suara Masuk...</p>
            </div>
          </div>
          
          <div className="call-actions">
            <button className="btn-reject" onClick={rejectCall}>
              <PhoneOff size={20} /> Tolak
            </button>
            <button className="btn-accept" onClick={answerCall}>
              <Phone size={20} /> Terima
            </button>
          </div>
        </div>

        <style>{`
          .incoming-call-overlay {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
          }
          .incoming-call-card {
            background: rgba(15, 23, 42, 0.95) !important;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 1.5rem;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-width: 300px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
          }
          .caller-info {
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .caller-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .call-actions {
            display: flex;
            gap: 1rem;
          }
          .btn-reject {
            flex: 1;
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 0.75rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-reject:hover {
            background: #ef4444;
            color: white;
          }
          .btn-accept {
            flex: 1;
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
            border: 1px solid rgba(34, 197, 94, 0.3);
            padding: 0.75rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-accept:hover {
            background: #22c55e;
            color: white;
          }
          .ring-animation {
            animation: ring 1.5s infinite ease-in-out;
          }
          @keyframes ring {
            0% { transform: rotate(0); }
            10% { transform: rotate(15deg); }
            20% { transform: rotate(-15deg); }
            30% { transform: rotate(15deg); }
            40% { transform: rotate(-15deg); }
            50% { transform: rotate(0); }
            100% { transform: rotate(0); }
          }
          
          /* Responsif untuk Smartphone (Full Screen) */
          @media (max-width: 768px) {
            .incoming-call-overlay {
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              transform: none;
              background: rgba(15, 23, 42, 0.98);
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .incoming-call-card {
              width: 100%;
              height: 100%;
              max-width: none;
              border-radius: 0;
              border: none;
              justify-content: center;
              align-items: center;
              padding: 2rem;
              background: transparent !important;
              box-shadow: none;
            }
            .caller-info {
              flex-direction: column;
              text-align: center;
              margin-bottom: 3rem;
            }
            .caller-avatar {
              width: 120px;
              height: 120px;
              margin-bottom: 1rem;
            }
            .caller-avatar svg {
              width: 50px;
              height: 50px;
            }
            .caller-info h3 {
              font-size: 1.8rem !important;
              margin-bottom: 0.5rem !important;
            }
            .caller-info p {
              font-size: 1.1rem !important;
            }
            .call-actions {
              width: 100%;
              max-width: 400px;
              gap: 1.5rem;
              padding: 0 1rem;
            }
            .btn-reject, .btn-accept {
              padding: 1.2rem;
              font-size: 1.1rem;
              border-radius: 16px;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
};

export default IncomingCall;
