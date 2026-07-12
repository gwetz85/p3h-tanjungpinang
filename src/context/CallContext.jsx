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
  const [callStatus, setCallStatus] = useState('idle'); // idle, ringing, calling, connected
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  
  const peerConnection = useRef(null);
  const currentCallRef = useRef(null);
  
  // Clean up function for call
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

    if (currentCallRef.current && currentUser) {
      // Clean up Firebase nodes
      await remove(ref(rtdb, `calls/${currentCallRef.current}`));
      currentCallRef.current = null;
    }
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUser) return;

    // Listen to "calls" where the calleeId matches my ID
    const callsRef = ref(rtdb, 'calls');
    const unsubscribe = onValue(callsRef, async (snapshot) => {
      if (callStatus !== 'idle') return; // Ignore if already in a call

      const calls = snapshot.val();
      if (calls) {
        for (const callId in calls) {
          const callData = calls[callId];
          if (callData.calleeId === currentUser.uid && callData.offer && !callData.answer) {
            // Found an incoming call directed to me
            currentCallRef.current = callId;
            setIncomingCallData({
              callId,
              callerId: callData.callerId,
              callerName: callData.callerName || 'Pengguna',
              offer: callData.offer
            });
            setRemoteUser({ id: callData.callerId, name: callData.callerName || 'Pengguna' });
            setCallStatus('ringing');
            break; // Handle one call at a time
          }
          
          // if we are the caller, check if it was answered
          if (callData.callerId === currentUser.uid && currentCallRef.current === callId) {
             if (callData.answer && peerConnection.current && peerConnection.current.signalingState !== 'stable') {
                const remoteDesc = new RTCSessionDescription(callData.answer);
                await peerConnection.current.setRemoteDescription(remoteDesc);
                setCallStatus('connected');
             }
          }
        }
      }
    });

    return () => off(callsRef, 'value', unsubscribe);
  }, [currentUser, callStatus]);

  // Handle remote hangup
  useEffect(() => {
    if (!currentCallRef.current) return;
    const callDocRef = ref(rtdb, `calls/${currentCallRef.current}`);
    
    const unsubscribe = onValue(callDocRef, (snapshot) => {
      if (!snapshot.exists() && callStatus !== 'idle') {
        // The call document was deleted, meaning the other side hung up
        endCall();
      }
    });
    
    return () => off(callDocRef, 'value', unsubscribe);
  }, [callStatus]);

  // Listen to ICE Candidates from remote
  useEffect(() => {
    if (!currentCallRef.current || !peerConnection.current) return;

    const callerCandidatesRef = ref(rtdb, `calls/${currentCallRef.current}/callerCandidates`);
    const calleeCandidatesRef = ref(rtdb, `calls/${currentCallRef.current}/calleeCandidates`);

    const handleNewCandidate = (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      Object.values(data).forEach(async (candidateData) => {
         if (peerConnection.current && peerConnection.current.remoteDescription) {
             try {
                // To avoid adding duplicates, you could store added candidates, but addIceCandidate usually handles it
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidateData));
             } catch(e) {
                console.error('Error adding ICE candidate', e);
             }
         }
      });
    };

    let unsubCaller, unsubCallee;
    
    // If I am the callee, listen to caller's candidates
    if (incomingCallData) {
        unsubCaller = onValue(callerCandidatesRef, handleNewCandidate);
    } else {
        // If I am the caller, listen to callee's candidates
        unsubCallee = onValue(calleeCandidatesRef, handleNewCandidate);
    }

    return () => {
      if (unsubCaller) off(callerCandidatesRef, 'value', unsubCaller);
      if (unsubCallee) off(calleeCandidatesRef, 'value', unsubCallee);
    };
  }, [currentCallRef.current, incomingCallData, callStatus]);

  const initWebRTC = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    setLocalStream(stream);

    const pc = new RTCPeerConnection(servers);
    peerConnection.current = pc;

    // Push tracks from local stream to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Pull tracks from remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return pc;
  };

  const startCall = async (calleeId, calleeName) => {
    setCallStatus('calling');
    setRemoteUser({ id: calleeId, name: calleeName });
    
    const pc = await initWebRTC();
    
    const callRef = push(ref(rtdb, 'calls'));
    currentCallRef.current = callRef.key;

    // Get candidate for caller
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        push(ref(rtdb, `calls/${callRef.key}/callerCandidates`), event.candidate.toJSON());
      }
    };

    // Create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    // Current User Data for callerName
    let myName = currentUser.email;
    try {
        const myDoc = await get(ref(rtdb, `users/${currentUser.uid}`));
        if (myDoc.exists() && myDoc.val().nama) myName = myDoc.val().nama;
    } catch(e) {}

    await set(callRef, {
      callerId: currentUser.uid,
      callerName: myName,
      calleeId: calleeId,
      offer: offer
    });
    
    // Set onDisconnect to clean up if caller drops out
    onDisconnect(callRef).remove();
  };

  const answerCall = async () => {
    if (!incomingCallData) return;
    
    const pc = await initWebRTC();
    setCallStatus('connected');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        push(ref(rtdb, `calls/${currentCallRef.current}/calleeCandidates`), event.candidate.toJSON());
      }
    };

    const callDocRef = ref(rtdb, `calls/${currentCallRef.current}`);
    
    const offerDescription = incomingCallData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    // Write answer to DB
    await set(ref(rtdb, `calls/${currentCallRef.current}/answer`), answer);
  };

  const rejectCall = () => {
    endCall(); // This will delete the call doc, which caller will detect as a hangup
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
