import { initializeApp, getApps } from 'firebase/app';
import { Platform } from 'react-native';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDIRK605JDDRoP7WHDjvY-w-gB5SawnUEs",
  authDomain: "agritrader-7ecb5.firebaseapp.com",
  projectId: "agritrader-7ecb5",
  storageBucket: "agritrader-7ecb5.appspot.com",
  messagingSenderId: "193068852739",
  appId: "1:193068852739:web:9dbc484526f58808df9036"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence:
      Platform.OS === 'web'
        ? browserLocalPersistence
        : getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;

// Initialize Firestore with long polling to avoid WebChannel warnings on RN
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export default app;

