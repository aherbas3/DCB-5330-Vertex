import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

export default function MainLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#1A3673",
                tabBarInactiveTintColor: "#888",
                tabBarStyle: { backgroundColor: "#f9f9f9" },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="find-provider"
                options={{
                    title: "Find Provider",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-circle-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="appointments"
                options={{
                    href: null, // Hide from tab bar
                }}
            />
        </Tabs>
    );
}
