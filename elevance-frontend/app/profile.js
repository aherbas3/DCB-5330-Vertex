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
    ActivityIndicator,
} from "react-native";
import {useRouter} from "expo-router";
import {signOut} from "firebase/auth";
import {auth} from "../firebaseConfig";
import {Picker} from "@react-native-picker/picker";
import {getPostgresProfile, updatePostgresProfile, syncToPostgres} from "./utils/backend";

export default function ProfileScreen() {
    const router = useRouter();
    const user = auth.currentUser;

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState("");
    const [language, setLanguage] = useState("English");
    const [notifications, setNotifications] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Phone number validation function
    const validatePhoneNumber = (phone) => {
        const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
        const result = phoneRegex.test(phone);
        console.log("🔍 Phone validation for '" + phone + "':", result);
        return result;
    };

    // Load user profile data from PostgreSQL
    useEffect(() => {
        const loadProfile = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const token = await user.getIdToken();
                
                try {
                    // Try to get existing profile from PostgreSQL
                    const response = await getPostgresProfile(token);
                    const profileData = response.user;
                    
                    setFirstName(profileData.first_name || "");
                    setLastName(profileData.last_name || "");
                    setPhone(profileData.phone_number || "");
                    setLanguage(profileData.language || "English");
                    setNotifications(profileData.notifications_enabled || false);
                    
                    console.log("✅ Profile loaded from PostgreSQL");
                } catch (error) {
                    console.log("⚠️ No PostgreSQL profile found, creating new one...");
                    
                    // If no profile exists, create one with default values
                    const defaultData = {
                        first_name: "FirstName",
                        last_name: "LastName",
                        phone_number: "999-999-9999",
                        language: "English",
                        notifications_enabled: true
                    };
                    
                    await syncToPostgres(token, defaultData);
                    
                    // Set the default values
                    setFirstName(defaultData.first_name);
                    setLastName(defaultData.last_name);
                    setPhone(defaultData.phone_number);
                    setLanguage(defaultData.language);
                    setNotifications(defaultData.notifications_enabled);
                    
                    console.log("✅ New profile created in PostgreSQL");
                }
            } catch (error) {
                console.error("❌ Failed to load profile:", error);
                Alert.alert("Error", "Failed to load profile data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [user]);

    const handleLogout = async () => {
        try {
            console.log("🔄 Starting logout process...");
            console.log("🔄 Current user before signout:", auth.currentUser?.email);
            
            await signOut(auth);
            
            console.log("✅ Firebase signout successful");
            console.log("🔄 Current user after signout:", auth.currentUser?.email);
            
            // Force immediate navigation with multiple methods
            console.log("🔄 Forcing navigation to signin page...");
            
            // Try multiple navigation methods
            try {
                router.replace("/signin");
                console.log("✅ Router replace successful");
            } catch (e) {
                console.log("🔄 Replace failed, trying push...");
                router.push("/signin");
                console.log("✅ Router push successful");
            }
            
            // Also try a direct window location change as backup
            if (typeof window !== 'undefined') {
                setTimeout(() => {
                    console.log("🔄 Trying window.location fallback...");
                    window.location.href = '/signin';
                }, 200);
            }
            
        } catch (logoutError) {
            console.error("❌ Logout failed:", logoutError);
            Alert.alert("Logout Error", "Unable to sign out. Please try again.");
        }
    };

    const handleSave = async () => {
        if (!user) {
            Alert.alert("Error", "You must be logged in to save your profile.");
            return;
        }

        console.log("🔍 Current phone state:", phone);
        console.log("🔍 Phone length:", phone?.length);
        console.log("🔍 Phone type:", typeof phone);
        
        // Validate phone number format
        console.log("🔍 Validating phone number:", phone);
        console.log("🔍 Phone validation result:", validatePhoneNumber(phone));
        
        if (phone && !validatePhoneNumber(phone)) {
            console.log("❌ Phone number validation failed");
            Alert.alert(
                "Invalid Phone Number", 
                "Please enter your phone number in the format ###-###-#### (e.g., 123-456-7890)"
            );
            return;
        }
        
        console.log("✅ Phone number validation passed");

        try {
            setSaving(true);
            const token = await user.getIdToken();

            const updates = {
                first_name: firstName,
                last_name: lastName,
                phone_number: phone,
                language: language,
                notifications_enabled: notifications
            };

            await updatePostgresProfile(token, updates);
            
            Alert.alert("Profile Saved", "Your profile information has been updated successfully!");
            console.log("✅ Profile saved to PostgreSQL");
        } catch (error) {
            console.error("❌ Failed to save profile:", error);
            Alert.alert("Save Error", "Failed to save your profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Show loading spinner while loading profile data
    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Image
                    source={require("../assets/elevance-logo.png")}
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
                    placeholder="123-456-7890"
                />
                <Text style={styles.helperText}>Format: ###-###-####</Text>
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

            <TouchableOpacity 
                style={[styles.saveButton, saving && styles.disabledButton]} 
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <View style={styles.savingContainer}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.saveButtonText}>Saving...</Text>
                    </View>
                ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
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
        backgroundColor: "#ffffff",
        padding: 20,
        alignItems: "center",
    },
    logo: {
        width: 180,
        height: 60,
        marginBottom: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1A3673",
        marginBottom: 40,
    },
    inputRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    inputContainer: {
        width: "48%",
        marginBottom: 30,
    },
    label: {
        fontWeight: "500",
        color: "#1A3673",
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: "#B2EBEA",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#fafafa",
    },
    disabledInput: {
        backgroundColor: "#eeeeee",
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
        backgroundColor: "#1A3673",
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
        backgroundColor: "#231E33",
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    logoutText: {
        color: "#fff",
        fontWeight: "600",
    },
    centered: {
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        color: "#002B5C",
        textAlign: "center",
    },
    disabledButton: {
        backgroundColor: "#ccc",
        opacity: 0.7,
    },
    savingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    helperText: {
        fontSize: 12,
        color: "#666",
        marginTop: 5,
        fontStyle: "italic",
    },
});