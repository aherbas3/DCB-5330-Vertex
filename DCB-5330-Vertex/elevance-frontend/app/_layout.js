import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function Layout() {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            console.log("🔍 _layout.js: Auth state changed, user:", currentUser ? currentUser.email : "null");
            setUser(currentUser);
            setReady(true);
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (!ready) return;

        const inAuthGroup = segments[0] === "signin";
        console.log("🔍 _layout.js: Navigation check - user:", user ? user.email : "null", "current route:", segments[0]);
        
        if (user && inAuthGroup) {
            console.log("🔄 _layout.js: Redirecting logged-in user from signin to profile");
            router.replace("/profile");
        } else if (!user && !inAuthGroup) {
            console.log("🔄 _layout.js: Redirecting logged-out user to signin");
            router.replace("/signin");
        }
    }, [user, ready, segments]);

    if (!ready) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#002B5C" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return <Slot />;
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
