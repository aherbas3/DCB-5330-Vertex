// firebaseConfig.js
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA8ow2Y9xPCAKpzEOmrk1RDSITf8x-U4cI",
  authDomain: "elevance-health-af48d.firebaseapp.com",
  projectId: "elevance-health-af48d",
  storageBucket: "elevance-health-af48d.appspot.com",
  messagingSenderId: "173590433233",
  appId: "1:173590433233:web:59954c9080c39e360164f0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Auth with persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
