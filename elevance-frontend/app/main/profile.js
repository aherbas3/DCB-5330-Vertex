import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Switch,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "../../firebaseAuth";
import { Picker } from "@react-native-picker/picker";
import { getUserProfile, updateUserProfile, syncUser } from "../../utils/backend";

export default function ProfileScreen() {
    const router = useRouter();

    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [language, setLanguage] = useState("English");
    const [notifications, setNotifications] = useState(false);
    const [notificationMethod, setNotificationMethod] = useState("SMS");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ✅ Lazily initialize Firebase Auth
    useEffect(() => {
        (async () => {
            const a = await getFirebaseAuth();
            setAuth(a);
            console.log("✅ Firebase Auth ready in profile.js");

            // Subscribe to auth state changes
            const unsub = onAuthStateChanged(a, (u) => {
                console.log("👤 Auth state changed:", u?.email || "null");
                setUser(u);
                setEmail(u?.email || "");
            });

            return unsub;
        })();
    }, []);

    // ✅ Validate phone format
    const validatePhoneNumber = (phone) => {
        const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
        return phoneRegex.test(phone);
    };

    // ✅ Load profile data after user is available
    useEffect(() => {
        const loadProfile = async () => {
            if (!auth || !user) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const token = await user.getIdToken();

                try {
                    const response = await getUserProfile(token);
                    const profileData = response.user;

                    setFirstName(profileData.first_name || "");
                    setLastName(profileData.last_name || "");
                    setPhone(profileData.phone_number || "");
                    setLanguage(profileData.language || "English");
                    setNotifications(profileData.notifications_enabled || false);
                    setNotificationMethod(profileData.notification_method || "SMS");

                    console.log("✅ Profile loaded from backend");
                } catch (error) {
                    console.log("⚠️ No profile found — creating default one...");
                    const defaultData = {
                        first_name: "FirstName",
                        last_name: "LastName",
                        phone_number: "999-999-9999",
                        language: "English",
                        notifications_enabled: true,
                        notification_method: "SMS",
                    };

                    await syncUser(token, defaultData);
                    setFirstName(defaultData.first_name);
                    setLastName(defaultData.last_name);
                    setPhone(defaultData.phone_number);
                    setLanguage(defaultData.language);
                    setNotifications(defaultData.notifications_enabled);
                    setNotificationMethod(defaultData.notification_method || "SMS");
                }
            } catch (error) {
                console.error("❌ Failed to load profile:", error);
                Alert.alert("Error", "Failed to load profile data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [auth, user]);

    // ✅ Handle logout safely
    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            console.log("✅ Signed out successfully");
            router.replace("/signin");
        } catch (err) {
            console.error("❌ Logout failed:", err);
            Alert.alert("Error", "Logout failed. Please try again.");
        }
    };

    // ✅ Save profile updates
    const handleSave = async () => {
        if (!auth || !user) return;

        if (phone && !validatePhoneNumber(phone)) {
            Alert.alert(
                "Invalid Phone Number",
                "Please enter phone as ###-###-#### (e.g., 123-456-7890)"
            );
            return;
        }

        try {
            setSaving(true);
            const token = await user.getIdToken();

            const updates = {
                first_name: firstName,
                last_name: lastName,
                phone_number: phone,
                language,
                notifications_enabled: notifications,
                notification_method: notificationMethod,
            };

            await updateUserProfile(token, updates);
            Alert.alert("Success", "Profile updated successfully!");
            console.log("✅ Profile saved to backend");
        } catch (err) {
            console.error("❌ Save failed:", err);
            Alert.alert("Error", "Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !auth) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Image
                    source={require("../../assets/elevance-logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <ActivityIndicator size="large" color="#002B5C" />
                <Text style={styles.loadingText}>Loading your profile...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Image
                source={require("../../assets/elevance-logo.png")}
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={styles.title}>My Profile</Text>

            {/* Name */}
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

            {/* Email (read-only) */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={email}
                    editable={false}
                />
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="123-456-7890"
                />
                <Text style={styles.helperText}>Format: ###-###-####</Text>
            </View>

            {/* Language */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Language Preference</Text>
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={language} onValueChange={setLanguage}>
                        <Picker.Item label="English" value="English" />
                        <Picker.Item label="Spanish" value="Spanish" />
                    </Picker>
                </View>
            </View>

            {/* Notifications */}
            <View style={styles.notificationsContainer}>
                <View>
                    <Text style={styles.label}>Notifications</Text>
                    <Text style={styles.subText}>Receive appointment notifications via your preferred method.</Text>
                </View>
                <Switch
                    value={notifications}
                    onValueChange={setNotifications}
                    disabled={!phone}
                    trackColor={{ false: "#ccc", true: "#004080" }}
                    thumbColor={notifications ? "#fff" : "#888"}
                />
            </View>

            {/* Notification Method */}
            {notifications && phone && (
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Notification Method</Text>
                    <View style={styles.pickerContainer}>
                        <Picker 
                            selectedValue={notificationMethod} 
                            onValueChange={setNotificationMethod}
                            enabled={notifications && phone}
                        >
                            <Picker.Item label="SMS" value="SMS" />
                            <Picker.Item label="WhatsApp" value="WhatsApp" />
                        </Picker>
                    </View>
                </View>
            )}

            {!phone && (
                <Text style={styles.disabledNote}>
                    Add and save a phone number to enable notifications.
                </Text>
            )}

            {/* Save */}
            <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </View>
    );
}

// Keep your existing styles unchanged
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
        padding: 20,
        alignItems: "center",
    },
    logo: { width: 180, height: 60, marginBottom: 40 },
    title: { fontSize: 22, fontWeight: "700", color: "#1A3673", marginBottom: 40 },
    inputRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
    inputContainer: { width: "48%", marginBottom: 30 },
    label: { fontWeight: "500", color: "#1A3673", marginBottom: 5 },
    input: {
        borderWidth: 1,
        borderColor: "#B2EBEA",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#fafafa",
    },
    disabledInput: { backgroundColor: "#eeeeee", color: "#888" },
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
    subText: { fontSize: 12, color: "#666" },
    disabledNote: {
        fontSize: 12,
        color: "#888",
        marginBottom: 10,
        fontStyle: "italic",
    },
    saveButton: {
        backgroundColor: "#1A3673",
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginBottom: 20,
    },
    saveButtonText: { color: "#fff", fontWeight: "600" },
    logoutButton: {
        backgroundColor: "#231E33",
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    logoutText: { color: "#fff", fontWeight: "600" },
    centered: { justifyContent: "center" },
    loadingText: { marginTop: 20, fontSize: 16, color: "#002B5C", textAlign: "center" },
    disabledButton: { backgroundColor: "#ccc", opacity: 0.7 },
    helperText: { fontSize: 12, color: "#666", marginTop: 5, fontStyle: "italic" },
});
