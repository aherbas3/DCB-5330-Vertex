import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getFirebaseAuth } from "../../firebaseAuth";
import { getAppointments, updateAppointment } from "../../utils/backend";
import { showConfirm, showAlert } from "../../utils/showalert";

export default function AppointmentsScreen() {
    const [auth, setAuth] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("all"); // "all", "upcoming", "past"

    useEffect(() => {
        (async () => {
            const a = await getFirebaseAuth();
            setAuth(a);
        })();
    }, []);

    useEffect(() => {
        if (auth) {
            fetchAppointments();
        }
    }, [auth]);

    const fetchAppointments = async () => {
        if (!auth) return;

        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const data = await getAppointments(token);
            setAppointments(data.appointments || []);
        } catch (err) {
            console.error("Failed to fetch appointments:", err);
            showAlert("Error", "Failed to load appointments. Please try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAppointments();
    };

    const handleCancelAppointment = (appointment) => {
        showConfirm({
            title: "Cancel Appointment",
            message: `Are you sure you want to cancel your appointment with ${appointment.providers?.name}?`,
            confirmText: "Yes, Cancel",
            cancelText: "No, Keep It",
            onConfirm: async () => {
                try {
                    const user = auth.currentUser;
                    const token = await user.getIdToken();

                    await updateAppointment(token, appointment.id, {
                        status: "cancelled",
                        cancellation_reason: "Cancelled by user",
                    });

                    showAlert("Success", "Appointment cancelled successfully");
                    fetchAppointments(); // Reload
                } catch (err) {
                    console.error("Failed to cancel appointment:", err);
                    showAlert("Error", "Failed to cancel appointment. Please try again.");
                }
            },
        });
    };

    const handleAddToCalendar = async (appointment) => {
        try {
            if (appointment.googleCalendarUrl) {
                const supported = await Linking.canOpenURL(appointment.googleCalendarUrl);
                if (supported) {
                    await Linking.openURL(appointment.googleCalendarUrl);
                } else {
                    showAlert("Error", "Unable to open Google Calendar");
                }
            } else {
                showAlert("Error", "Calendar link not available");
            }
        } catch (err) {
            console.error("Failed to open calendar:", err);
            showAlert("Error", "Failed to open calendar. Please try again.");
        }
    };

    const filteredAppointments = appointments.filter((appt) => {
        // Parse date correctly - append time to avoid UTC interpretation
        const apptDate = new Date(appt.appointment_date + " 00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filter === "upcoming") {
            return apptDate >= today && appt.status === "scheduled";
        } else if (filter === "past") {
            return apptDate < today || appt.status !== "scheduled";
        }
        return true; // "all"
    });

    const getStatusColor = (status) => {
        switch (status) {
            case "scheduled":
                return "#155724";
            case "confirmed":
                return "#004085";
            case "cancelled":
                return "#721C24";
            case "completed":
                return "#383d41";
            default:
                return "#666";
        }
    };

    const getStatusBg = (status) => {
        switch (status) {
            case "scheduled":
                return "#D4EDDA";
            case "confirmed":
                return "#D1ECF1";
            case "cancelled":
                return "#F8D7DA";
            case "completed":
                return "#E2E3E5";
            default:
                return "#F8F9FA";
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#002B5C" />
                <Text style={styles.loadingText}>Loading appointments...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Appointments</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
                <TouchableOpacity
                    style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
                    onPress={() => setFilter("all")}
                >
                    <Text style={[styles.filterTabText, filter === "all" && styles.filterTabTextActive]}>
                        All
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterTab, filter === "upcoming" && styles.filterTabActive]}
                    onPress={() => setFilter("upcoming")}
                >
                    <Text
                        style={[styles.filterTabText, filter === "upcoming" && styles.filterTabTextActive]}
                    >
                        Upcoming
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterTab, filter === "past" && styles.filterTabActive]}
                    onPress={() => setFilter("past")}
                >
                    <Text style={[styles.filterTabText, filter === "past" && styles.filterTabTextActive]}>
                        Past
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredAppointments}
                keyExtractor={(item) => item.id?.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="event-busy" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No appointments found</Text>
                        <Text style={styles.emptySubtext}>
                            {filter === "upcoming"
                                ? "You have no upcoming appointments"
                                : "Book an appointment to get started"}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const canCancel = item.status === "scheduled" &&
                        new Date(item.appointment_date + " 00:00:00") > new Date();

                    return (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <MaterialIcons name="local-hospital" size={24} color="#002B5C" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.providerName}>{item.providers?.name || "Provider"}</Text>
                                    <Text style={styles.specialty}>{item.providers?.specialty}</Text>
                                </View>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusBg(item.status) },
                                    ]}
                                >
                                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                        {item.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardBody}>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="event" size={18} color="#666" />
                                    <Text style={styles.infoText}>
                                        {new Date(item.appointment_date + " 00:00:00").toLocaleDateString(
                                            "en-US",
                                            {
                                                weekday: "long",
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            }
                                        )}
                                    </Text>

                                </View>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="access-time" size={18} color="#666" />
                                    <Text style={styles.infoText}>
                                        {item.start_time} - {item.end_time}
                                    </Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="category" size={18} color="#666" />
                                    <Text style={styles.infoText}>{item.appointment_type}</Text>
                                </View>
                                {item.notes && (
                                    <View style={styles.infoRow}>
                                        <MaterialIcons name="note" size={18} color="#666" />
                                        <Text style={styles.infoText}>{item.notes}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Add to Google Calendar Button */}
                            <TouchableOpacity
                                style={styles.calendarBtn}
                                onPress={() => handleAddToCalendar(item)}
                            >
                                <MaterialIcons name="event" size={18} color="#fff" />
                                <Text style={styles.calendarBtnText}>Add to Google Calendar</Text>
                            </TouchableOpacity>

                            {canCancel && (
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => handleCancelAppointment(item)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    loadingText: { marginTop: 10, color: "#002B5C", fontSize: 16 },
    header: {
        padding: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    title: { fontSize: 24, fontWeight: "700", color: "#002B5C" },
    filterTabs: {
        flexDirection: "row",
        backgroundColor: "#F8F9FA",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    filterTab: {
        flex: 1,
        padding: 12,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    filterTabActive: {
        borderBottomColor: "#002B5C",
    },
    filterTabText: { fontSize: 14, fontWeight: "600", color: "#666" },
    filterTabTextActive: { color: "#002B5C" },
    listContent: { padding: 16 },
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
        gap: 12,
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E6ED",
    },
    providerName: { fontSize: 16, fontWeight: "700", color: "#002B5C" },
    specialty: { fontSize: 14, color: "#666", marginTop: 2 },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
    cardBody: { gap: 8 },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    infoText: { fontSize: 14, color: "#333", flex: 1 },
    calendarBtn: {
        marginTop: 12,
        padding: 12,
        backgroundColor: "#4285f4",
        borderRadius: 8,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    calendarBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    cancelBtn: {
        marginTop: 8,
        padding: 10,
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#DC3545",
        alignItems: "center",
    },
    cancelBtnText: { color: "#DC3545", fontWeight: "600" },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
    emptySubtext: { fontSize: 14, color: "#999", marginTop: 8, textAlign: "center" },
});
