import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { rtdb } from '../firebase';
import { ref, set, onValue, off, remove, push, onDisconnect, get } from 'firebase/database';
import { useAuth } from './AuthContext';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ]
};

export const CallProvider = ({ children }) => {
  const { currentUser, role } = useAuth();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState('idle');
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  
  const peerConnection = useRef(null);
  const currentCallRef = useRef(null);
  const candidatesQueue = useRef([]);
  const listenersRef = useRef([]);

  const cleanupListeners = () => {
    listenersRef.current.forEach(unsub => unsub());
    listenersRef.current = [];
  };

  const endCall = async () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallStatus('idle');
    setIncomingCallData(null);
    setRemoteUser(null);
    setIsMuted(false);
    candidatesQueue.current = [];
    cleanupListeners();

    if (currentCallRef.current && currentUser) {
      await remove(ref(rtdb, `calls/${currentCallRef.current}`));
      currentCallRef.current = null;
    }
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUser) return;

    const callsRef = ref(rtdb, 'calls');
    const unsubscribe = onValue(callsRef, (snapshot) => {
      if (callStatus !== 'idle') return; 

      const calls = snapshot.val();
      if (calls) {
        for (const callId in calls) {
          const callData = calls[callId];
          if (callData.calleeId === currentUser.uid && callData.offer && !callData.answer) {
            currentCallRef.current = callId;
            setIncomingCallData({
              callId,
              callerId: callData.callerId,
              callerName: callData.callerName || 'Pengguna',
              offer: callData.offer
            });
            setRemoteUser({ id: callData.callerId, name: callData.callerName || 'Pengguna' });
            setCallStatus('ringing');
            
            // Listen if the caller cancels before we answer
            const incomingDocRef = ref(rtdb, `calls/${callId}`);
            const unsubIncoming = onValue(incomingDocRef, (docSnap) => {
               if (!docSnap.exists()) {
                  setCallStatus('idle');
                  setIncomingCallData(null);
                  currentCallRef.current = null;
                  off(incomingDocRef, 'value', unsubIncoming);
               }
            });
            
            break;
          }
        }
      }
    });

    return () => off(callsRef, 'value', unsubscribe);
  }, [currentUser, callStatus]);

  const initWebRTC = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    setLocalStream(stream);

    const pc = new RTCPeerConnection(servers);
    peerConnection.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    return pc;
  };

  const processCandidatesQueue = async (pc) => {
    for (const candidate of candidatesQueue.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding queued candidate:', e);
      }
    }
    candidatesQueue.current = [];
  };

  const startCall = async (calleeId, calleeName) => {
    setCallStatus('calling');
    setRemoteUser({ id: calleeId, name: calleeName });
    candidatesQueue.current = [];
    
    const pc = await initWebRTC();
    
    const callRef = push(ref(rtdb, 'calls'));
    currentCallRef.current = callRef.key;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        push(ref(rtdb, `calls/${callRef.key}/callerCandidates`), event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    let myName = currentUser.email;
    try {
        const myDoc = await get(ref(rtdb, `users/${currentUser.uid}`));
        if (myDoc.exists() && myDoc.val().nama) myName = myDoc.val().nama;
    } catch(e) {}

    await set(callRef, {
      callerId: currentUser.uid,
      callerName: myName,
      calleeId: calleeId,
      offer: { sdp: offerDescription.sdp, type: offerDescription.type }
    });
    
    // Set onDisconnect to clean up if caller drops out
    onDisconnect(callRef).remove();

    // Listen for hangup/reject (if document is deleted)
    const callDocRef = ref(rtdb, `calls/${callRef.key}`);
    const unsubHangup = onValue(callDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        endCall();
      }
    });
    listenersRef.current.push(() => off(callDocRef, 'value', unsubHangup));

    // Listen for answer
    const answerRef = ref(rtdb, `calls/${callRef.key}/answer`);
    const unsubAnswer = onValue(answerRef, async (snapshot) => {
      const answer = snapshot.val();
      if (answer && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStatus('connected');
        processCandidatesQueue(pc);
      }
    });
    listenersRef.current.push(() => off(answerRef, 'value', unsubAnswer));

    // Listen for callee's ICE candidates
    const calleeCandRef = ref(rtdb, `calls/${callRef.key}/calleeCandidates`);
    const unsubCand = onValue(calleeCandRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      Object.values(data).forEach(async (candidate) => {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e){}
        } else {
          candidatesQueue.current.push(candidate);
        }
      });
    });
    listenersRef.current.push(() => off(calleeCandRef, 'value', unsubCand));
  };

  const answerCall = async () => {
    if (!incomingCallData) return;
    candidatesQueue.current = [];
    
    const pc = await initWebRTC();
    setCallStatus('connected');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        push(ref(rtdb, `calls/${currentCallRef.current}/calleeCandidates`), event.candidate.toJSON());
      }
    };

    const offerDescription = incomingCallData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
    processCandidatesQueue(pc);

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    // Write answer to DB
    await set(ref(rtdb, `calls/${currentCallRef.current}/answer`), {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    });

    // Listen for remote hangup
    const callDocRef = ref(rtdb, `calls/${currentCallRef.current}`);
    const unsubHangup = onValue(callDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        endCall();
      }
    });
    listenersRef.current.push(() => off(callDocRef, 'value', unsubHangup));

    // Listen for caller's ICE candidates
    const callerCandRef = ref(rtdb, `calls/${currentCallRef.current}/callerCandidates`);
    const unsubCand = onValue(callerCandRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      Object.values(data).forEach(async (candidate) => {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e){}
        } else {
          candidatesQueue.current.push(candidate);
        }
      });
    });
    listenersRef.current.push(() => off(callerCandRef, 'value', unsubCand));
  };

  const rejectCall = () => {
    if (currentCallRef.current) {
      remove(ref(rtdb, `calls/${currentCallRef.current}`));
    }
    setCallStatus('idle');
    setIncomingCallData(null);
    currentCallRef.current = null;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <CallContext.Provider value={{
      callStatus,
      localStream,
      remoteStream,
      remoteUser,
      isMuted,
      incomingCallData,
      startCall,
      answerCall,
      rejectCall,
      endCall,
      toggleMute
    }}>
      {children}
    </CallContext.Provider>
  );
};
