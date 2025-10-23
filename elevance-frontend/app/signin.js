import React, { useState } from "react";
import { View, Text, TextInput, Image, StyleSheet, TouchableOpacity } from "react-native";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
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

    const handleForgotPassword = async () => {
        if (!email) {
            showAlert("Enter Email", "Please enter your email to reset password.");
            return;
        }

        if (!isValidEmail(email)) {
            showAlert("Invalid Email", "Enter a valid email address before requesting a reset.");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email.trim());
            showAlert(
                "Password Reset",
                "If an account exists for that email, Firebase will send reset instructions shortly."
            );
        } catch (error) {
            console.error("Password reset request failed:", error);
            showAlert(
                "Reset Failed",
                error?.message || "Unable to request a password reset right now. Please try again later."
            );
        }
    };

    const handleAuth = async () => {
        try {
            if (!email || !password) {
                showAlert("Missing Fields", "Please enter both email and password.");
                return;
            }
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

    return (
        <View style={styles.container}>
            <Image
                source={require("../assets/elevance-logo.png")}
                style={{ width: 180, height: 60, marginBottom: 20 }}
                resizeMode="contain"
            />

            {/* 馃搫 Mode Switch */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, mode === "signin" && styles.activeTab]}
                    onPress={() => setMode("signin")}
                >
                    <Text style={[styles.tabText, mode === "signin" && styles.activeTabText]}>Sign{'\n'}In</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={[styles.tab, mode === "signup" && styles.activeTab]}
                    onPress={() => setMode("signup")}
                >
                    <Text style={[styles.tabText, mode === "signup" && styles.activeTabText]}>Sign{'\n'}Up</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.formCard}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="#888"
                    style={styles.input}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />
                <Text style={styles.label}>Password</Text>
                <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor="#888"
                    style={styles.input}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
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
            </View>

            {mode === "signin" && (
                <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
            )}

            {/* Optional: Add password requirements hint */}
            {mode === "signup" && (
                <Text style={styles.hint}>
                    Password must be at least 8 characters
                </Text>
            )}

            <Text style={styles.footerText}>
                By clicking continue, you agree to our{" "}
                <Text style={styles.linkText}>Terms of Service</Text> and{" "}
                <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
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
    formCard: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        marginBottom: 20,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#E3E8EF",
        justifyContent: "space-around",
        borderRadius: 10,
        marginBottom: 25,
        overflow: "hidden",
    },
    tab: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        backgroundColor: "#E3E8EF",
        paddingHorizontal: 20,
    },
    divider: {
        width: 1,
        backgroundColor: "#CBD5E0",
    },
    tabText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#7A7A7A",
        textAlign: "center",
    },
    activeTab: {
        backgroundColor: "#002B5C",
        paddingHorizontal: 20,
    },
    tabText: {
        color: "#888",
        fontSize: 16,
        fontWeight: "500",
    },
    activeTabText: {
        color: "#fff",
        fontWeight: "700",
    },
    label: {
        alignSelf: "flex-start",
        fontWeight: "600",
        color: "#002B5C",
        marginBottom: 6,
    },
    input: {
        width: "100%",
        height: 50,
        borderColor: "#E0E0E0",
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        backgroundColor: "#F8F8F8",
    },
    hint: {
        fontSize: 14,
        color: "#231E33",
        marginTop: 10,
        fontStyle: "italic",
        textAlign: "center",
    },
    button: {
        backgroundColor: "#000000",
        width: "100%",
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 10,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
    forgotText: {
        color: "#0047AB",
        marginTop: 10,
        textDecorationLine: "underline",
    },
    footerText: {
        marginTop: 15,
        color: "#666",
        fontSize: 13,
        textAlign: "center",
        width: "90%",
    },
    linkText: {
        color: "#0047AB",
        textDecorationLine: "underline",
    },
});

