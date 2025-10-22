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

export default function AuthScreen() {
    const router = useRouter();
    const [mode, setMode] = useState("signup");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAuth = async () => {
        try {
            // 🧠 Client-side validations
            if (!isValidEmail(email)) {
                Alert.alert("Invalid Email", "Please enter a valid email address.");
                return;
            }
            if (!isStrongPassword(password)) {
                Alert.alert(
                    "Weak Password",
                    "Please increase password length to at least 6 characters."
                );
                return;
            }

            setLoading(true);
            let cred;

            if (mode === "signup") {
                cred = await createUserWithEmailAndPassword(auth, email, password);
            } else {
                cred = await signInWithEmailAndPassword(auth, email, password);
            }
            //TODO Not working

            const token = await cred.user.getIdToken();
            await syncUser(token);

            router.replace("/success");
        } catch (err) {
            console.error("Auth error:", err);

            let msg = "An unexpected error occurred. Please try again.";

            if (err.code === "auth/email-already-in-use") {
                msg =
                    "Email is already in our database. Please use the Sign In option instead.";
            } else if (err.code === "auth/invalid-email") {
                msg = "Invalid email format. Please check your email address.";
            } else if (err.code === "auth/user-not-found") {
                msg = "Email is not recognized. Please check or sign up first.";
            } else if (err.code === "auth/wrong-password") {
                msg = "Invalid password. Please try again.";
            } else if (err.code === "auth/invalid-credential") {
                msg = "Invalid email or password.";
            } else if (err.code === "auth/weak-password") {
                msg = "Password too weak. Please use at least 6 characters.";
            }

            Alert.alert("Authentication Error", msg);
        } finally {
            setLoading(false);
        }
    };

    const handleTestBackend = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/`);
            const data = await res.json();
            Alert.alert("Backend Status", JSON.stringify(data));
        } catch (err) {
            Alert.alert("Backend Error", err.message);
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

            {/* 🔄 Mode Switch */}
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

            <InputField label="Email" value={email} onChangeText={setEmail} />
            <InputField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <PrimaryButton
                title={
                    loading
                        ? "Processing..."
                        : mode === "signup"
                            ? "Sign Up"
                            : "Sign In"
                }
                onPress={handleAuth}
                loading={loading}
            />
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
});
