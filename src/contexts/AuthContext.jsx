import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase/auth';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const [{ db }, firestore] = await Promise.all([import('../firebase/db'), import('firebase/firestore')]);
        const { doc, getDoc, setDoc, serverTimestamp } = firestore;

        // Fetch or create user profile in Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          let data = userSnap.data();
          // Always ensure the admin account has premium access
          if (user.email === 'shipontalukdaroffice@gmail.com' && (data.plan !== 'premium' || !data.isAdmin)) {
            data.plan = 'premium';
            data.isAdmin = true;
            await setDoc(userRef, data, { merge: true });
          }
          setUserProfile(data);
        } else {
          // New user, create profile with free plan (unless admin)
          const newProfile = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            plan: user.email === 'shipontalukdaroffice@gmail.com' ? 'premium' : 'free', // 'free' or 'premium'
            isAdmin: user.email === 'shipontalukdaroffice@gmail.com',
            createdAt: serverTimestamp(),
            groups: [] // IDs of groups they manage or are part of
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    return signInWithPopup(auth, googleProvider);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    loginWithGoogle,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
