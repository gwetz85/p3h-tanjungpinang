import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { auth, rtdb } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, update, remove, onValue } from 'firebase/database';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionKicked, setSessionKicked] = useState(false);

  useEffect(() => {
    let roleUnsubscribe = () => {};
    let sessionUnsubscribe = () => {};

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        const userRef = ref(rtdb, `users/${user.uid}`);
        roleUnsubscribe = onValue(userRef, async (snapshot) => {
          const SUPERADMIN_EMAILS = ['admin@tarunabangsa.id', 'sihalal-akun@gmail.com'];
          if (SUPERADMIN_EMAILS.includes(user.email)) {
            setRole('superadmin');
            if (snapshot.exists()) setUserData(snapshot.val());
            setLoading(false);
            return;
          }
          
          if (snapshot.exists()) {
            setRole(snapshot.val().role);
            setUserData(snapshot.val());
            setLoading(false);
          } else {
            const allUsersRef = ref(rtdb, 'users');
            const allUsersSnapshot = await get(allUsersRef);
            let foundRole = 'Pending';
            
            if (allUsersSnapshot.exists()) {
              const usersData = allUsersSnapshot.val();
              const preRegisteredUser = Object.entries(usersData).find(
                ([id, data]) => data.email === user.email && !id.startsWith(user.uid)
              );
              
              if (preRegisteredUser) {
                foundRole = preRegisteredUser[1].role;
                await update(ref(rtdb, `users/${user.uid}`), preRegisteredUser[1]);
                await remove(ref(rtdb, `users/${preRegisteredUser[0]}`));
              }
            }
            setRole(foundRole);
            setLoading(false);
          }
        });

        const sessionRef = ref(rtdb, `users/${user.uid}/activeSession`);
        sessionUnsubscribe = onValue(sessionRef, (snapshot) => {
          const localSession = sessionStorage.getItem('sessionId');
          const remoteSession = snapshot.val();
          if (localSession && remoteSession && localSession !== remoteSession) {
            sessionStorage.removeItem('sessionId');
            setSessionKicked(true);
            signOut(auth);
          }
        });

      } else {
        setCurrentUser(null);
        setRole(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      roleUnsubscribe();
      sessionUnsubscribe();
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders of all consumers
  const value = useMemo(() => ({
    currentUser,
    role,
    userData,
    loading,
    sessionKicked,
    clearSessionKicked: () => setSessionKicked(false)
  }), [currentUser, role, userData, loading, sessionKicked]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
