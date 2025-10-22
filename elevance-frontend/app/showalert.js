import { Alert, Platform } from "react-native";

export const showAlert = (title, message, onConfirm) => {
    if (Platform.OS === "web") {
        if (window.confirm(`${title}\n\n${message}`)) {
            if (onConfirm) onConfirm();
        }
    } else {
        Alert.alert(title, message, [{ text: "OK", onPress: onConfirm }]);
    }
};
