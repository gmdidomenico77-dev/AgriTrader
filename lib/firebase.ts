import { initializeApp, getApps } from 'firebase/app';
// Use React Native entrypoint for Auth so the native module is registered
//@ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, setLogLevel as setFirestoreLogLevel } from 'firebase/firestore';
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

const authInstance = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)

});

/*
// Reduce Firestore log noise in dev
setFirestoreLogLevel('warn');

// Get existing Auth if already registered (avoids double init during fast refresh)
let authInstance;
try {
  authInstance = getAuth(app);
} catch {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}
  */

export const auth = authInstance;

// Initialize Firestore with long polling to avoid WebChannel warnings on RN
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export default app;

