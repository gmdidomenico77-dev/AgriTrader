/**
 * Alerts Context
 * Manages price and weather alerts across the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PriceAlert {
  id: string;
  crop: string;
  condition: 'above' | 'below';
  targetPrice: number;
  createdAt: string;
}

interface AlertsContextType {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => Promise<void>;
  removeAlert: (id: string) => Promise<void>;
  updateAlert: (id: string, updates: Partial<PriceAlert>) => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

const ALERTS_STORAGE_KEY = '@agritrader_alerts';

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  // Load alerts from storage on mount
  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const stored = await AsyncStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) {
        setAlerts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const saveAlerts = async (newAlerts: PriceAlert[]) => {
    try {
      await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(newAlerts));
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  };

  const addAlert = async (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    await saveAlerts([...alerts, newAlert]);
  };

  const removeAlert = async (id: string) => {
    await saveAlerts(alerts.filter(a => a.id !== id));
  };

  const updateAlert = async (id: string, updates: Partial<PriceAlert>) => {
    await saveAlerts(
      alerts.map(a => a.id === id ? { ...a, ...updates } : a)
    );
  };

  return (
    <AlertsContext.Provider value={{ alerts, addAlert, removeAlert, updateAlert }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertsProvider');
  }
  return context;
}

