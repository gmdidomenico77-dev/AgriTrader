/**
 * Preorders Context
 * Manages marketplace preorders across the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export interface Preorder {
  id: string;
  listingId: string;
  crop: string;
  quantity: number;
  pricePerUnit: number;
  seller: string;
  location: string;
  orderedAt: string;
}

interface PreordersContextType {
  preorders: Preorder[];
  addPreorder: (preorder: Omit<Preorder, 'id' | 'orderedAt'>) => Promise<void>;
  removePreorder: (id: string) => Promise<void>;
  isPreordered: (listingId: string) => boolean;
}

const PreordersContext = createContext<PreordersContextType | undefined>(undefined);

const PREORDERS_STORAGE_KEY_PREFIX = '@agritrader_preorders';

export function PreordersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preorders, setPreorders] = useState<Preorder[]>([]);

  // Reload whenever the signed-in account changes, so switching accounts on
  // the same device never leaks one farmer's preorders into another's session.
  useEffect(() => {
    if (user?.uid) {
      loadPreorders(user.uid);
    } else {
      setPreorders([]);
    }
  }, [user?.uid]);

  const loadPreorders = async (uid: string) => {
    try {
      const stored = await AsyncStorage.getItem(`${PREORDERS_STORAGE_KEY_PREFIX}:${uid}`);
      setPreorders(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Error loading preorders:', error);
    }
  };

  const savePreorders = async (newPreorders: Preorder[]) => {
    if (!user?.uid) return;
    try {
      await AsyncStorage.setItem(`${PREORDERS_STORAGE_KEY_PREFIX}:${user.uid}`, JSON.stringify(newPreorders));
      setPreorders(newPreorders);
    } catch (error) {
      console.error('Error saving preorders:', error);
    }
  };

  const addPreorder = async (preorder: Omit<Preorder, 'id' | 'orderedAt'>) => {
    const newPreorder: Preorder = {
      ...preorder,
      id: Date.now().toString(),
      orderedAt: new Date().toISOString()
    };
    await savePreorders([...preorders, newPreorder]);
  };

  const removePreorder = async (id: string) => {
    await savePreorders(preorders.filter(p => p.id !== id));
  };

  const isPreordered = (listingId: string) => {
    return preorders.some(p => p.listingId === listingId);
  };

  return (
    <PreordersContext.Provider value={{ preorders, addPreorder, removePreorder, isPreordered }}>
      {children}
    </PreordersContext.Provider>
  );
}

export function usePreorders() {
  const context = useContext(PreordersContext);
  if (!context) {
    throw new Error('usePreorders must be used within PreordersProvider');
  }
  return context;
}
