// app/components/Header.js
import React from "react";
import { View, Image, StyleSheet } from "react-native";

export default function Header() {
    return (
        <View style={styles.header}>
            <Image
                source={require("../../assets/elevance-logo.png")}
                style={styles.logo}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    logo: {
        width: 140,
        height: 40,
    },
});