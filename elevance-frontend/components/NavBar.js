import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function NavBar() {
    const router = useRouter();
    const path = usePathname();

    const isActive = (route) => path === route;

    return (
        <View style={styles.navbar}>
            <TouchableOpacity onPress={() => router.replace("/main/home")} style={styles.navButton}>
                <MaterialIcons name="home" size={26} color={isActive("/main/home") ? "#FFD700" : "#fff"} />
                <Text style={[styles.navText, isActive("/main/home") && styles.activeText]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/main/find-provider")} style={styles.navButton}>
                <MaterialIcons name="search" size={26} color={isActive("/main/find-provider") ? "#FFD700" : "#fff"} />
                <Text style={[styles.navText, isActive("/main/find-provider") && styles.activeText]}>Find</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/main/appointments")} style={styles.navButton}>
                <MaterialIcons name="event" size={26} color={isActive("/main/appointments") ? "#FFD700" : "#fff"} />
                <Text style={[styles.navText, isActive("/main/appointments") && styles.activeText]}>
                    Appointments
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/main/profile")} style={styles.navButton}>
                <MaterialIcons name="person" size={26} color={isActive("/main/profile") ? "#FFD700" : "#fff"} />
                <Text style={[styles.navText, isActive("/main/profile") && styles.activeText]}>Profile</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    navbar: {
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "#002B5C",
        paddingVertical: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    navButton: {
        alignItems: "center",
    },
    navText: {
        color: "#fff",
        fontSize: 13,
        marginTop: 2,
    },
    activeText: {
        color: "#FFD700",
        fontWeight: "700",
    },
});