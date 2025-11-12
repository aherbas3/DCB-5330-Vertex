import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "../firebaseAuth";
import { AlertProvider } from "../utils/showalert";

export default function Layout() {
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        (async () => {
            const a = await getFirebaseAuth();
            if (!a) {
                console.error("❌ Firebase Auth not ready, skipping onAuthStateChanged");
                return;
            }
            setAuth(a);

            const unsub = onAuthStateChanged(a, (currentUser) => {
                console.log("🔍 Auth state changed:", currentUser?.email || "null");
                setUser(currentUser);
                setReady(true);
            });

            return () => unsub();
        })();
    }, []);


    // ✅ Handle redirects once auth/user ready
    useEffect(() => {
        if (!ready) return;

        const inAuthGroup = segments[0] === "signin";
        console.log(
            "🔍 Navigation check - user:",
            user ? user.email : "null",
            "current route:",
            segments[0]
        );

        if (user && inAuthGroup) {
            console.log("🔄 Redirecting logged-in user to home");
            router.replace("/main/home");
        } else if (!user && !inAuthGroup) {
            console.log("🔄 Redirecting logged-out user to signin");
            router.replace("/signin");
        }
    }, [user, ready, segments]);

    if (!ready || !auth) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#002B5C" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <AlertProvider>
            <Slot />
        </AlertProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    loadingText: {
        marginTop: 10,
        color: "#002B5C",
        fontSize: 16,
        fontWeight: "500",
    },
});
