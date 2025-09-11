import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface UserProfile {
  displayName: string;
  location: string;
  farmName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType>({
  profile: null,
  loading: true,
  updateProfile: async () => false,
  refreshProfile: async () => {},
});

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

interface UserProfileProviderProps {
  children: React.ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user || !isAuthenticated) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profileData = profileSnap.data() as UserProfile;
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>): Promise<boolean> => {
    if (!user || !isAuthenticated) {
      return false;
    }

    try {
      const profileRef = doc(db, 'users', user.uid);
      const updatedData = {
        ...profileData,
        updatedAt: new Date(),
      };

      await setDoc(profileRef, updatedData, { merge: true });
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...updatedData } : null);
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  const refreshProfile = async () => {
    setLoading(true);
    await fetchProfile();
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  const value = {
    profile,
    loading,
    updateProfile,
    refreshProfile,
  };

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
};
