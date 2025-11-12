import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Image,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Platform
} from "react-native";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
} from "firebase/auth";
import { getFirebaseAuth } from "../firebaseAuth";
import {
    syncUser,
    isValidEmail,
    isStrongPassword,
} from "../utils/backend";
import { PrimaryButton } from "../utils/components";
import { showAlert } from "../utils/showalert";
import { useRouter } from "expo-router";

export default function AuthScreen() {
    const router = useRouter();
    const [auth, setAuth] = useState(null);
    const [mode, setMode] = useState("signup");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // ✅ Lazily initialize Firebase Auth (native-safe)
    useEffect(() => {
        (async () => {
            const a = await getFirebaseAuth();
            setAuth(a);
            console.log("✅ Firebase Auth ready in signin.js");
        })();
    }, []);

    const handleForgotPassword = async () => {
        if (!auth) return;

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
                "If an account exists for that email, we’ll send reset instructions shortly."
            );
        } catch (error) {
            console.error("Password reset request failed:", error);
            showAlert(
                "Reset Failed",
                error?.message || "Unable to request a password reset right now."
            );
        }
    };

    const handleAuth = async () => {
        if (!auth) {
            showAlert("Firebase not ready", "Please wait for initialization and try again.");
            return;
        }

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

            try {
                const syncResult = await syncUser(token);
                console.log("Backend sync result:", syncResult);
                router.replace("/main/home");
            } catch (syncErr) {
                console.error("Backend sync failed:", syncErr);
                showAlert(
                    "Partial Success",
                    "Signed in but profile sync failed. You can still continue.",
                    [{ text: "OK", onPress: () => router.replace("/main/home") }]
                );
            }
        } catch (err) {
            console.error("Auth error:", err);
            handleAuthError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthError = (err) => {
        let title = "Authentication Error";
        let msg = "An unexpected error occurred. Please try again.";

        switch (err.code) {
            case "auth/email-already-in-use":
                title = "Email Already Registered";
                msg = "This email is already registered. Please sign in instead.";
                setTimeout(() => setMode("signin"), 100);
                break;
            case "auth/invalid-email":
                title = "Invalid Email";
                msg = "The email address format is invalid.";
                break;
            case "auth/weak-password":
                title = "Weak Password";
                msg = "Password is too weak. Use at least 6 characters.";
                break;
            case "auth/user-not-found":
                title = "Account Not Found";
                msg = "No account exists with this email. Please sign up first.";
                setTimeout(() => setMode("signup"), 100);
                break;
            case "auth/wrong-password":
                title = "Incorrect Password";
                msg = "The password is incorrect. Try again or reset your password.";
                break;
            case "auth/too-many-requests":
                title = "Too Many Attempts";
                msg = "Please wait a few minutes and try again.";
                break;
            case "auth/network-request-failed":
                title = "Network Error";
                msg = "Network connection failed. Please check your internet.";
                break;
            case "auth/user-disabled":
                title = "Account Disabled";
                msg = "This account has been disabled. Please contact support.";
                break;
            default:
                msg = err.message || msg;
        }

        showAlert(title, msg);
    };

    if (!auth) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#002B5C" />
                <Text style={styles.hint}>Initializing Firebase...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Image
                source={require("../assets/elevance-logo.png")}
                style={{ width: 180, height: 60, marginBottom: 20 }}
                resizeMode="contain"
            />

            {/* Mode Switch */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, mode === "signin" && styles.activeTab]}
                    onPress={() => setMode("signin")}
                >
                    <Text style={[styles.tabText, mode === "signin" && styles.activeTabText]}>Sign{"\n"}In</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={[styles.tab, mode === "signup" && styles.activeTab]}
                    onPress={() => setMode("signup")}
                >
                    <Text style={[styles.tabText, mode === "signup" && styles.activeTabText]}>Sign{"\n"}Up</Text>
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

            {mode === "signup" && (
                <Text style={styles.hint}>Password must be at least 8 characters</Text>
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
        shadowOffset: { width: 0, height: 2 },
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
    },
    divider: { width: 1, backgroundColor: "#CBD5E0" },
    activeTab: { backgroundColor: "#002B5C" },
    tabText: { color: "#888", fontSize: 16, fontWeight: "500" },
    activeTabText: { color: "#fff", fontWeight: "700" },
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
    hint: {
        fontSize: 14,
        color: "#231E33",
        marginTop: 10,
        fontStyle: "italic",
        textAlign: "center",
    },
});
