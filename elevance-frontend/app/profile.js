import React, {useState, useEffect} from "react";
import {
    View,
    Text,
    TextInput,
    Switch,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
} from "react-native";
import {useRouter} from "expo-router";
import {signout} from "firebase/auth";
import {auth} from "../firebaseConfig";
import {Picker} from "@react-native-picker/picker";

export default function ProfileScreen() {
    const router = useRouter();
    const user = auth.currentUser;

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState("");
    const [language, setLanguage] = useState("English");
    const [notifications, setNotifications] = useState(false);

    const handleLogout = async () => {
        try {
            await signout(auth);
            router.replace("/signin");
        } catch (err) {
            console.error("Logout failed:", err);
            Alert.alert("Logout Error", "Unable to sign out. Try again.");
        }
    };

    const handleSave = () => {
        Alert.alert("Profile Saved", "Your profile information has been updated.");
        //TODO: Add Firestore update logic for syncing profile data
    };

    return (
        <View style={styles.container}>
            <Image
                source={require("../assets/elevance-logo.png")}
                style={styles.logo}
                resizeMode="contain"
            />

            <Text style={styles.title}>My Profile</Text>

            <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="First name"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                        style={styles.input}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Last name"
                    />
                </View>
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={email}
                    editable={false}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="Enter phone number"
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Language Preference</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={language}
                        onValueChange={(itemValue) => setLanguage(itemValue)}
                    >
                        <Picker.Item label="English" value="English" />
                        <Picker.Item label="Spanish" value="Spanish" />
                    </Picker>
                </View>
            </View>

            <View style={styles.notificationsContainer}>
                <View>
                    <Text style={styles.label}>Notifications</Text>
                    <Text style={styles.subText}>
                        Notifications are sent through text messages.
                    </Text>
                </View>
                <Switch
                    value={notifications}
                    onValueChange={setNotifications}
                    disabled={!phone}
                    trackColor={{false: "#ccc", true: "#004080"}}
                    thumbColor={notifications ? "#fff" : "#888"}
                />
            </View>

            {!phone && (
                <Text style={styles.disabledNote}>
                    Add and save a phone number to enable notifications.
                </Text>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style= {styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 20,
        alignItems: "center",
    },
    logo: {
        width: 180,
        height: 60,
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#002B5C",
        marginBottom: 20,
    },
    inputRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    inputContainer: {
        width: "48%",
        marginBottom: 15,
    },
    label: {
        fontWeight: "500",
        color: "#002B5C",
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#f9f9f9",
    },
    disabledInput: {
        backgroundColor: "#eee",
        color: "#888",
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        backgroundColor: "#f9f9f9",
    },
    notificationsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginTop: 10,
        marginBottom: 5,
    },
    subText: {
        fontSize: 12,
        color: "#666",
    },
    disabledNote: {
        fontSize: 12,
        color: "#888",
        marginBottom: 10,
        fontStyle: "italic",
    },
    saveButton: {
        backgroundColor: "#002B5C",
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginBottom: 20,
    },
    saveButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    logoutButton: {
        backgroundColor: "#000",
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    logoutText: {
        color: "#fff",
        fontWeight: "600",
    },
});