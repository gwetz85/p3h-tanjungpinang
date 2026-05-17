import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';

const RunningText = () => {
  const [text, setText] = useState('');

  useEffect(() => {
    const textRef = ref(rtdb, 'runningText');
    
    const unsub = onValue(textRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val()) {
        setText(snapshot.val());
      } else {
        setText('');
      }
    }, (error) => {
      console.warn("Firebase read error for runningText:", error);
      setText('');
    });
    
    return () => unsub();
  }, []);

  if (!text) return null;

  return (
    <div className="running-text-bar">
      <div className="running-text-content">
        {text}
      </div>
    </div>
  );
};

export default RunningText;
