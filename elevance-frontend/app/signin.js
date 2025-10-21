import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { auth } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

// ✅ Use your actual local IP and backend port
const BACKEND_URL = "http://143.215.52.58:5050";

// Helper: validate email
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function SignScreen() {
  const [activeTab, setActiveTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 🔹 Handle signup or signin
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters long.");
      return;
    }

    console.log(`🔹 Attempting ${activeTab} for:`, email);

    try {
      let userCredential;

      if (activeTab === "signup") {
        // 🟢 Create new user in Firebase
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        Alert.alert("Success", "Account created successfully!");
      } else {
        // 🔵 Sign in existing user
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        Alert.alert("Welcome Back!", "You are now signed in.");
      }

      // ✅ Get Firebase ID token
      const token = await userCredential.user.getIdToken();
      console.log("🪪 JWT Token:", token);

      // ✅ Send token to backend
      const endpoint = activeTab === "signup" ? "/signup" : "/login";
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({})); // Prevent JSON parse error
      console.log("✅ Backend Response:", data);

      if (response.ok) {
        Alert.alert("Success", data.message || "Authentication complete!");
      } else {
        Alert.alert("Error", data.error || "Something went wrong.");
      }
    } catch (error) {
      console.error("❌ Auth Error:", error.code || error.message);
      Alert.alert("Authentication Error", error.message || "An error occurred.");
    }
  };

  // 🔹 Forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Enter Email", "Please enter your email to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Password Reset", "A password reset link has been sent.");
    } catch (error) {
      console.error("❌ Password Reset Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  console.log("Firebase connected:", !!auth);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Logo */}
      <Image
        source={require("../assets/elevance-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "signin" && styles.activeTab]}
          onPress={() => setActiveTab("signin")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "signin" && styles.activeTabText,
            ]}
          >
            Sign In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "signup" && styles.activeTab]}
          onPress={() => setActiveTab("signup")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "signup" && styles.activeTabText,
            ]}
          >
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* Email Field */}
      <Text style={styles.label}>Email</Text>
      <TextInput
        placeholder="Enter your email"
        placeholderTextColor="#888"
        style={styles.input}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      {/* Password Field */}
      <Text style={styles.label}>Password</Text>
      <TextInput
        placeholder="Enter your password"
        placeholderTextColor="#888"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Continue Button */}
      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>
          {activeTab === "signin" ? "Sign In" : "Sign Up"}
        </Text>
      </TouchableOpacity>

      {/* Forgot Password */}
      {activeTab === "signin" && (
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      )}

      {/* Terms and Privacy */}
      <Text style={styles.footerText}>
        By clicking continue, you agree to our{" "}
        <Text style={styles.linkText}>Terms of Service</Text> and{" "}
        <Text style={styles.linkText}>Privacy Policy</Text>
      </Text>
    </View>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 180,
    height: 60,
    marginBottom: 30,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 30,
    padding: 3,
    marginBottom: 30,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 30,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#002B5C",
    fontWeight: "700",
  },
  label: {
    alignSelf: "flex-start",
    fontWeight: "600",
    color: "#002B5C",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    height: 50,
    borderColor: "#E0E0E0",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: "#F8F8F8",
  },
  button: {
    backgroundColor: "#000000",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  forgotText: {
    color: "#0047AB",
    marginTop: 10,
    textDecorationLine: "underline",
  },
  footerText: {
    marginTop: 15,
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    width: "90%",
  },
  linkText: {
    color: "#0047AB",
    textDecorationLine: "underline",
  },
});
