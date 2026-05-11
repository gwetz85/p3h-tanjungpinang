import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, rtdb } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, update, remove, onValue } from 'firebase/database';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let roleUnsubscribe = () => {};

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Listen to role changes in real-time
        const userRef = ref(rtdb, `users/${user.uid}`);
        roleUnsubscribe = onValue(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            setRole(snapshot.val().role);
            setLoading(false);
          } else {
            // Check by Email (for pre-registered users)
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
                // Migrate to UID node
                await update(ref(rtdb, `users/${user.uid}`), preRegisteredUser[1]);
                await remove(ref(rtdb, `users/${preRegisteredUser[0]}`));
              }
            }
            setRole(foundRole);
            setLoading(false);
          }
        });
      } else {
        setCurrentUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      roleUnsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    role,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
