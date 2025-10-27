import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA8ow2Y9xPCAKpzEOmrk1RDSITf8x-U4cI",
  authDomain: "elevance-health-af48d.firebaseapp.com",
  projectId: "elevance-health-af48d",
  storageBucket: "elevance-health-af48d.appspot.com",
  messagingSenderId: "173590433233",
  appId: "1:173590433233:web:59954c9080c39e360164f0",
};


let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (err) {
  auth = getAuth(app);
}

export { app, auth };