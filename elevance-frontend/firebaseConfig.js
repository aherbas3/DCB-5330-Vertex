// firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { Platform } from "react-native";

const firebaseConfig = {
    apiKey: "AIzaSyA8ow2Y9xPCAKpzEOmrk1RDSITf8x-U4cI",
    authDomain: "elevance-health-af48d.firebaseapp.com",
    projectId: "elevance-health-af48d",
    storageBucket: "elevance-health-af48d.appspot.com",
    messagingSenderId: "173590433233",
    appId: "1:173590433233:web:59954c9080c39e360164f0",
};

if (Platform.OS === 'android') {
    firebaseConfig.databaseURL = `https://${firebaseConfig.projectId}.firebaseio.com`;
}

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} else {
    app = getApp();
    console.log("Using existing Firebase app instance");
}

export { app };