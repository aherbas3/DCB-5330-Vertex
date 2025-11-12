import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "../firebaseAuth";
import { useRouter } from "expo-router";

export default function SuccessScreen() {
    const router = useRouter();
    const [auth, setAuth] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            const a = await getFirebaseAuth();
            setAuth(a);
            console.log(" Firebase Auth ready in success.js");
        })();
    }, []);

    const handleLogout = async () => {
        if (!auth) {
            console.warn("⚠ Firebase Auth not ready yet, skipping logout.");
            return;
        }

        try {
            setLoading(true);
            await signOut(auth);
            console.log("✅ Firebase signout successful");
            router.replace("/signin");
        } catch (err) {
            console.error("❌ Logout failed:", err);
            alert("Logout failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!auth) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#002B5C" />
                <Text style={styles.title}>Preparing logout...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Successful Sign In / Sign Up</Text>

            <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.6 }]}
                onPress={handleLogout}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Log Out</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#002B5C",
        marginBottom: 20,
    },
    button: {
        backgroundColor: "#000",
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
    },
});
