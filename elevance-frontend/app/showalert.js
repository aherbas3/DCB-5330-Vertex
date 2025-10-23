import { Alert, Platform } from "react-native";

export const showAlert = (title, message, actions) => {
    const isFunction = typeof actions === "function";
    const isButtonArray = Array.isArray(actions) && actions.length > 0;

    if (Platform.OS === "web") {
        const confirmResult = window.confirm(`${title}\n\n${message}`);
        if (!confirmResult) {
            return;
        }

        if (isButtonArray) {
            const primary = actions[0];
            if (primary?.onPress) {
                primary.onPress();
            }
        } else if (isFunction) {
            actions();
        }
    } else {
        if (isButtonArray) {
            Alert.alert(title, message, actions);
        } else {
            Alert.alert(title, message, [
                {
                    text: "OK",
                    onPress: isFunction ? actions : undefined,
                },
            ]);
        }
    }
};
