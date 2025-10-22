import React, { useState } from "react";
import { View, Text, Alert, Image, StyleSheet } from "react-native";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import {
    syncUser,
    isValidEmail,
    isStrongPassword,
    BACKEND_URL,
} from "./utils/backend";
import { InputField, PrimaryButton, DebugBanner } from "./utils/components";
import { useRouter } from "expo-router";
import {showAlert} from "./showalert";

export default function AuthScreen() {
    const router = useRouter();
    const [mode, setMode] = useState("signup");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAuth = async () => {
        try {
            if (!isValidEmail(email)) {
                showAlert("Invalid Email", "Please enter a valid email address.");
                return;
            }
            if (!isStrongPassword(password)) {
                showAlert(
                    "Weak Password",
                    "Password must be at least 8 characters long."
                );
                return;
            }

            setLoading(true);
            let cred;

            if (mode === "signup") {
                console.log("Attempting to create new user...");
                cred = await createUserWithEmailAndPassword(auth, email, password);
                console.log("New user created successfully");
            } else {
                console.log("Attempting to sign in user...");
                cred = await signInWithEmailAndPassword(auth, email, password);
                console.log("User signed in successfully");
            }

            // Get the ID token for backend authentication
            const token = await cred.user.getIdToken();
            console.log("Got Firebase ID token");

            // Sync with backend - this ensures user data is stored properly
            try {
                const syncResult = await syncUser(token);
                console.log("Backend sync result:", syncResult);


                router.replace("/profile");

            } catch (syncErr) {
                console.error("Backend sync failed:", syncErr);

                showAlert(
                    "Partial Success",
                    "Signed in but profile sync failed. You can still continue.",
                    [{ text: "OK", onPress: () => router.replace("/profile") }]
                );
            }

        } catch (err) {
            console.error("Auth error:", err);

            let msg = "An unexpected error occurred. Please try again.";
            let title = "Authentication Error";

            switch (err.code) {
                case "auth/email-already-in-use":
                    title = "Email Already Registered";
                    msg = "This email is already registered. Please sign in instead or use a different email.";
                    // Optionally switch to sign in mode
                    setTimeout(() => setMode("signin"), 100);
                    break;

                case "auth/invalid-email":
                    title = "Invalid Email";
                    msg = "The email address format is invalid. Please check and try again.";
                    break;

                case "auth/weak-password":
                    title = "Weak Password";
                    msg = "Password is too weak. Please use at least 6 characters including numbers and letters.";
                    break;

                // Sign In Errors
                case "auth/user-not-found":
                    title = "Account Not Found";
                    msg = "No account exists with this email. Please sign up first or check your email.";
                    // Optionally switch to sign up mode
                    setTimeout(() => setMode("signup"), 100);
                    break;

                case "auth/wrong-password":
                    title = "Incorrect Password";
                    msg = "The password is incorrect. Please try again or reset your password.";
                    break;

                case "auth/invalid-credential":
                    title = "Invalid Credentials";
                    msg = mode === "signin"
                        ? "Invalid email or password. Please check your credentials and try again."
                        : "Unable to create account. Please check your information.";
                    break;

                // Rate Limiting
                case "auth/too-many-requests":
                    title = "Too Many Attempts";
                    msg = "Too many failed attempts. Please wait a few minutes and try again.";
                    break;

                // Network Errors
                case "auth/network-request-failed":
                    title = "Network Error";
                    msg = "Network connection failed. Please check your internet and try again.";
                    break;

                // User Disabled
                case "auth/user-disabled":
                    title = "Account Disabled";
                    msg = "This account has been disabled. Please contact support.";
                    break;

                default:
                    console.error("Unhandled error code:", err.code);
                    msg = err.message || msg;
            }

            showAlert(title, msg);
        } finally {
            setLoading(false);
        }
    };

    const handleTestBackend = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/`);
            const data = await res.json();
            showAlert("Backend Status", `Connected!\n${JSON.stringify(data, null, 2)}`);
        } catch (err) {
            showAlert("Backend Error", `Failed to connect: ${err.message}`);
        }
    };

    return (
        <View style={styles.container}>
            <Image
                source={require("../assets/elevance-logo.png")}
                style={{ width: 180, height: 60, marginBottom: 20 }}
                resizeMode="contain"
            />

            <DebugBanner backendUrl={BACKEND_URL} onTest={handleTestBackend} />

            {/* 📄 Mode Switch */}
            <View style={styles.tabContainer}>
                <Text
                    style={[styles.tab, mode === "signin" && styles.activeTab]}
                    onPress={() => setMode("signin")}
                >
                    Sign In
                </Text>
                <Text
                    style={[styles.tab, mode === "signup" && styles.activeTab]}
                    onPress={() => setMode("signup")}
                >
                    Sign Up
                </Text>
            </View>

            <InputField
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
            />
            <InputField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
            />

            <PrimaryButton
                title={
                    loading
                        ? "Processing..."
                        : mode === "signup"
                            ? "Create Account"
                            : "Sign In"
                }
                onPress={handleAuth}
                loading={loading}
            />

            {/* Optional: Add password requirements hint */}
            {mode === "signup" && (
                <Text style={styles.hint}>
                    Password must be at least 8 characters
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#eee",
        borderRadius: 20,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        textAlign: "center",
        paddingVertical: 10,
        fontWeight: "500",
        color: "#666",
    },
    activeTab: {
        color: "#002B5C",
        fontWeight: "700",
        borderBottomWidth: 2,
        borderColor: "#002B5C",
    },
    hint: {
        fontSize: 12,
        color: "#666",
        marginTop: 8,
        fontStyle: "italic",
    },
});