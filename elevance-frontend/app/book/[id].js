import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { getFirebaseAuth } from "../../firebaseAuth";
import { bookAppointment } from "../../utils/backend";
import { showAlert } from "../../utils/showalert";

export default function BookAppointment() {
    const { providerId, providerName, slot } = useLocalSearchParams();
    const [auth, setAuth] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            const a = await getFirebaseAuth();
            setAuth(a);
        })();
    }, []);

    const handleConfirmBooking = async () => {
        if (!auth) {
            showAlert("Error", "Authentication required. Please sign in.");
            return;
        }

        if (!slot || !providerId) {
            showAlert("Error", "Missing appointment details.");
            return;
        }

        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) {
                showAlert("Error", "Please sign in to book an appointment.");
                return;
            }

            const token = await user.getIdToken();
            const slotDate = new Date(slot);

            // Format date and time for the API
            const appointmentDate = slotDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const startTime = slotDate.toTimeString().substring(0, 5); // HH:MM

            // Calculate end time (1 hour later)
            const endDate = new Date(slotDate);
            endDate.setHours(endDate.getHours() + 1);
            const endTime = endDate.toTimeString().substring(0, 5);

            const appointmentData = {
                provider_id: parseInt(providerId),
                appointment_date: appointmentDate,
                start_time: startTime,
                end_time: endTime,
                appointment_type: "consultation",
                notes: "Booked via web app",
            };

            console.log("Booking appointment:", appointmentData);

            const result = await bookAppointment(token, appointmentData);

            console.log("Appointment booked:", result);

            showAlert(
                "Success!",
                "Your appointment has been booked successfully. You will receive a confirmation email.",
                () => {
                    router.replace("/main/home");
                }
            );
        } catch (error) {
            console.error("Booking error:", error);

            let errorMessage = "Failed to book appointment. Please try again.";

            if (error.message?.includes("Time slot not available")) {
                errorMessage = "This time slot is no longer available. Please choose another time.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            showAlert("Booking Failed", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!slot || !providerId) {
        return (
            <View style={styles.container}>
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={64} color="#DC3545" />
                    <Text style={styles.errorText}>Missing appointment details</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const slotDate = new Date(slot);
    const formattedDate = slotDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = slotDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#002B5C" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confirm Appointment</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <MaterialIcons name="event-available" size={64} color="#002B5C" />
                </View>

                <Text style={styles.title}>Review Your Appointment</Text>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <MaterialIcons name="local-hospital" size={24} color="#002B5C" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Provider</Text>
                            <Text style={styles.value}>{providerName || "Selected Provider"}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.summaryRow}>
                        <MaterialIcons name="calendar-today" size={24} color="#002B5C" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Date</Text>
                            <Text style={styles.value}>{formattedDate}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.summaryRow}>
                        <MaterialIcons name="access-time" size={24} color="#002B5C" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Time</Text>
                            <Text style={styles.value}>{formattedTime}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.summaryRow}>
                        <MaterialIcons name="schedule" size={24} color="#002B5C" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Duration</Text>
                            <Text style={styles.value}>1 hour</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.noteCard}>
                    <MaterialIcons name="info-outline" size={20} color="#004085" />
                    <Text style={styles.noteText}>
                        You will receive a confirmation email once your appointment is confirmed by the provider.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.confirmBtn, loading && styles.disabledBtn]}
                    onPress={handleConfirmBooking}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <MaterialIcons name="check-circle" size={20} color="#fff" />
                            <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#002B5C",
    },
    content: {
        flex: 1,
        padding: 20,
    },
    iconContainer: {
        alignItems: "center",
        marginVertical: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#002B5C",
        textAlign: "center",
        marginBottom: 24,
    },
    summaryCard: {
        borderWidth: 1,
        borderColor: "#E0E6ED",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        backgroundColor: "#F8FBFF",
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
    },
    divider: {
        height: 1,
        backgroundColor: "#E0E6ED",
        marginVertical: 8,
    },
    label: {
        fontSize: 12,
        textTransform: "uppercase",
        color: "#667085",
        fontWeight: "700",
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        color: "#002B5C",
        fontWeight: "600",
    },
    noteCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: "#D1ECF1",
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#BEE5EB",
        marginBottom: 24,
    },
    noteText: {
        flex: 1,
        color: "#004085",
        fontSize: 14,
        lineHeight: 20,
    },
    confirmBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#002B5C",
        padding: 16,
        borderRadius: 10,
        marginBottom: 12,
    },
    confirmBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
    disabledBtn: {
        opacity: 0.6,
    },
    cancelBtn: {
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ddd",
    },
    cancelBtnText: {
        color: "#666",
        fontWeight: "600",
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: "#666",
        marginTop: 16,
        marginBottom: 24,
    },
    backButton: {
        backgroundColor: "#002B5C",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
});
