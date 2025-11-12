// firebaseAuth.js
import { getAuth } from "firebase/auth";
import { app } from "./firebaseConfig";

let authInstance = null;

export function getFirebaseAuth() {
    if (!authInstance) {
        authInstance = getAuth(app);
        console.log("Firebase Auth initialized (getAuth only)");
    }
    return authInstance;
}
