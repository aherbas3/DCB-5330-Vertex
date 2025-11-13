import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { getFirebaseAuth } from "../../firebaseAuth";
import { getAppointments } from "../../utils/backend";

export default function HomeScreen() {
    const router = useRouter();
    const [appointmentCount, setAppointmentCount] = useState(0);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        (async () => {
            const a = await getFirebaseAuth();
            setAuth(a);
        })();
    }, []);

    useEffect(() => {
        const loadAppointments = async () => {
            if (!auth) return;
            const user = auth.currentUser;
            if (!user) {
                setAppointmentCount(0);
                return;
            }
            try {
                const token = await user.getIdToken();
                const data = await getAppointments(token);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const upcoming = data.appointments?.filter(a =>
                    a.status === 'scheduled' && new Date(a.appointment_date + " 00:00:00") >= today
                ) || [];
                setAppointmentCount(upcoming.length);
                setUpcomingAppointments(upcoming.slice(0, 3)); // Show max 3
            } catch (err) {
                console.warn("Unable to load appointments on home screen:", err.message);
                setAppointmentCount(0);
            }
        };
        loadAppointments();
    }, [auth]);

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                <Text style={styles.title}>Welcome to Elevance Health</Text>

                {/* Appointment Summary */}
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push('/main/appointments')}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="event" size={24} color="#002B5C" />
                        <Text style={styles.cardTitle}>Upcoming Appointments</Text>
                    </View>
                    <Text style={styles.notificationText}>
                        Check on your {appointmentCount} {appointmentCount === 1 ? "appointment" : "appointments"} scheduled
                    </Text>
                    <View style={styles.viewAllBtn}>
                        <Text style={styles.viewAllText}>View Details</Text>
                        <MaterialIcons name="chevron-right" size={20} color="#002B5C" />
                    </View>
                </TouchableOpacity>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/main/find-provider')}
                >
                    <MaterialIcons name="search" size={28} color="#002B5C" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>Find a Provider</Text>
                        <Text style={styles.actionDesc}>Search for doctors and specialists</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                </TouchableOpacity>

                {/* Health Tips */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="lightbulb" size={24} color="#FFD700" />
                        <Text style={styles.cardTitle}>Health Tips</Text>
                    </View>
                    <Text style={styles.notificationText}>💡 Remember your flu shot this season!</Text>
                    <Text style={styles.notificationText}>🏃 Aim for 30 minutes of exercise daily</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    content: { flex: 1, padding: 20 },
    title: { fontSize: 24, fontWeight: "700", color: "#002B5C", marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: "#002B5C", marginTop: 20, marginBottom: 12 },
    card: {
        backgroundColor: "#F3F7FB",
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E0E6ED",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: { fontSize: 18, fontWeight: "700", color: "#002B5C" },
    notificationText: { fontSize: 15, color: "#333", marginTop: 8 },
    appointmentsList: {
        marginTop: 12,
        gap: 8,
    },
    appointmentItem: {
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#1A3673",
    },
    appointmentProvider: { fontSize: 15, fontWeight: "600", color: "#002B5C" },
    appointmentDate: { fontSize: 14, color: "#666", marginTop: 4 },
    viewAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
        padding: 10,
        backgroundColor: "#fff",
        borderRadius: 8,
    },
    viewAllText: { color: "#002B5C", fontWeight: "600", marginRight: 4 },
    actionCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F7FB",
        padding: 16,
        borderRadius: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: "#E0E6ED",
    },
    actionTitle: { fontSize: 16, fontWeight: "700", color: "#002B5C" },
    actionDesc: { fontSize: 14, color: "#666", marginTop: 2 },
});