/**
 * Listings Context
 * Manages user's marketplace listings
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Listing {
  id: string;
  crop: string;
  quantity: number;
  pricePerUnit: number;
  location: string;
  description?: string;
  createdAt: string;
  isUserListing: boolean;
}

interface ListingsContextType {
  listings: Listing[];
  addListing: (listing: Omit<Listing, 'id' | 'createdAt' | 'isUserListing'>) => Promise<void>;
  removeListing: (id: string) => Promise<void>;
  getUserListings: () => Listing[];
}

const ListingsContext = createContext<ListingsContextType | undefined>(undefined);

const LISTINGS_STORAGE_KEY = '@agritrader_listings';

export function ListingsProvider({ children }: { children: React.ReactNode}) {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const stored = await AsyncStorage.getItem(LISTINGS_STORAGE_KEY);
      if (stored) {
        setListings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  };

  const saveListings = async (newListings: Listing[]) => {
    try {
      await AsyncStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(newListings));
      setListings(newListings);
    } catch (error) {
      console.error('Error saving listings:', error);
    }
  };

  const addListing = async (listing: Omit<Listing, 'id' | 'createdAt' | 'isUserListing'>) => {
    const newListing: Listing = {
      ...listing,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isUserListing: true
    };
    await saveListings([...listings, newListing]);
  };

  const removeListing = async (id: string) => {
    await saveListings(listings.filter(l => l.id !== id));
  };

  const getUserListings = () => {
    return listings.filter(l => l.isUserListing);
  };

  return (
    <ListingsContext.Provider value={{ listings, addListing, removeListing, getUserListings }}>
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const context = useContext(ListingsContext);
  if (!context) {
    throw new Error('useListings must be used within ListingsProvider');
  }
  return context;
}

