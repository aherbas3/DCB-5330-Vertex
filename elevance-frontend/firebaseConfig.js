import { initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA8ow2Y9xPCAKpzEOmrk1RDSITf8x-U4cI",
  authDomain: "elevance-health-af48d.firebaseapp.com",
  projectId: "elevance-health-af48d",
  storageBucket: "elevance-health-af48d.appspot.com",
  messagingSenderId: "173590433233",
  appId: "1:173590433233:web:59954c9080c39e360164f0",
};

const app = initializeApp(firebaseConfig);

let auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
