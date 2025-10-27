import React from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from "react-native";

export function InputField({ label, value, onChangeText, ...props }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                {...props}
            />
        </View>
    );
}

// 🔹 Primary button
export function PrimaryButton({ title, onPress, loading }) {
    return (
        <TouchableOpacity
            style={[styles.button, loading && styles.disabled]}
            onPress={onPress}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.buttonText}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

export function DebugBanner({ backendUrl, onTest }) {
    return (
        <View style={styles.debug}>
            <Text style={styles.debugText}>Backend: {backendUrl}</Text>
            <TouchableOpacity style={styles.testButton} onPress={onTest}>
                <Text style={styles.testButtonText}>Test</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    field: { width: "100%", marginBottom: 12 },
    label: { fontWeight: "600", marginBottom: 5 },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 10,
        padding: 12,
    },
    button: {
        backgroundColor: "#000",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
    },
    disabled: { backgroundColor: "#777" },
    buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
    debug: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f0f0f0",
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    debugText: { fontSize: 12, marginRight: 10 },
    testButton: {
        backgroundColor: "#FF6B6B",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    testButtonText: { color: "#fff", fontSize: 12 },
});
