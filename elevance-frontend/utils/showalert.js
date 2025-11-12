import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";

// Context for app-wide alerts
const AlertContext = createContext();
let globalAlertHandler = null;

export const AlertProvider = ({ children }) => {
    const [alertData, setAlertData] = useState({
        visible: false,
        title: "",
        message: "",
        buttons: [],
    });

    const triggerAlert = useCallback((config) => {
        setAlertData({
            visible: true,
            title: config.title,
            message: config.message,
            buttons: config.buttons?.length ? config.buttons : [],
        });
    }, []);

    const closeAlert = useCallback(() => {
        setAlertData((prev) => ({ ...prev, visible: false }));
    }, []);

    const handleButtonPress = (button) => {
        closeAlert();
        button?.onPress?.();
    };

    useEffect(() => {
        globalAlertHandler = triggerAlert;
        return () => {
            if (globalAlertHandler === triggerAlert) {
                globalAlertHandler = null;
            }
        };
    }, [triggerAlert]);

    return (
        <AlertContext.Provider
            value={{
                showAlert: (title, message, onConfirm) =>
                    triggerAlert({
                        title,
                        message,
                        buttons: [
                            {
                                text: "OK",
                                variant: "primary",
                                onPress: onConfirm,
                            },
                        ],
                    }),
            }}
        >
            {children}
            <Modal
                transparent
                visible={alertData.visible}
                animationType="fade"
                onRequestClose={closeAlert}
            >
                <View style={styles.overlay}>
                    <View style={styles.alertBox}>
                        <Text style={styles.title}>{alertData.title}</Text>
                        <Text style={styles.message}>{alertData.message}</Text>
                        <View style={styles.buttonRow}>
                            {(alertData.buttons.length ? alertData.buttons : [{ text: "OK", variant: "primary" }]).map(
                                (button, index) => (
                                    <TouchableOpacity
                                        key={`${button.text}-${index}`}
                                        style={[
                                            styles.button,
                                            button.variant === "secondary" && styles.buttonSecondary,
                                        ]}
                                        onPress={() => handleButtonPress(button)}
                                    >
                                        <Text
                                            style={[
                                                styles.buttonText,
                                                button.variant === "secondary" && styles.buttonSecondaryText,
                                            ]}
                                        >
                                            {button.text}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </AlertContext.Provider>
    );
};

// Hook to call inside any screen
export const useAppAlert = () => {
    const ctx = useContext(AlertContext);
    if (!ctx) throw new Error("useAppAlert must be used inside an <AlertProvider>");
    return ctx.showAlert;
};

const emitAlert = (config) => {
    if (globalAlertHandler) {
        globalAlertHandler(config);
    } else {
        console.warn("showAlert called before provider initialized:", config.title, config.message);
    }
};

// Compatibility helper
export const showAlert = (title, message, onConfirm) => {
    emitAlert({
        title,
        message,
        buttons: [
            {
                text: "OK",
                variant: "primary",
                onPress: onConfirm,
            },
        ],
    });
};

export const showConfirm = ({
                                title,
                                message,
                                confirmText = "Confirm",
                                cancelText = "Cancel",
                                onConfirm,
                                onCancel,
                            }) => {
    emitAlert({
        title,
        message,
        buttons: [
            {
                text: cancelText,
                variant: "secondary",
                onPress: onCancel,
            },
            {
                text: confirmText,
                variant: "primary",
                onPress: onConfirm,
            },
        ],
    });
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    alertBox: {
        backgroundColor: "#fff",
        borderRadius: 16,
        width: 320,
        paddingVertical: 25,
        paddingHorizontal: 20,
        alignItems: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#002B5C",
        marginBottom: 10,
        textAlign: "center",
    },
    message: {
        fontSize: 15,
        color: "#333",
        textAlign: "center",
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
        justifyContent: "center",
    },
    button: {
        backgroundColor: "#002B5C",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        minWidth: 110,
        alignItems: "center",
    },
    buttonSecondary: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#002B5C",
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
    buttonSecondaryText: {
        color: "#002B5C",
    },
});