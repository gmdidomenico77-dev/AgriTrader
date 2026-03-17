/**
 * Preorders Context
 * Manages marketplace preorders across the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const PREORDERS_STORAGE_KEY = '@agritrader_preorders';

export function PreordersProvider({ children }: { children: React.ReactNode }) {
  const [preorders, setPreorders] = useState<Preorder[]>([]);

  // Load preorders from storage on mount
  useEffect(() => {
    loadPreorders();
  }, []);

  const loadPreorders = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREORDERS_STORAGE_KEY);
      if (stored) {
        setPreorders(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading preorders:', error);
    }
  };

  const savePreorders = async (newPreorders: Preorder[]) => {
    try {
      await AsyncStorage.setItem(PREORDERS_STORAGE_KEY, JSON.stringify(newPreorders));
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

