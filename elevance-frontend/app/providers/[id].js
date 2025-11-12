import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { getFirebaseAuth } from "../../firebaseAuth";
import { getAllProviders, getProviderSlots } from "../../utils/backend";
import { showAlert } from "../../utils/showalert";

const OFFICE_HOURS = [
    { label: "Weekdays", value: "8:00 AM - 5:00 PM" },
    { label: "Saturday", value: "9:00 AM - 1:00 PM" },
    { label: "Sunday", value: "Closed" },
];

export default function ProviderDetails() {
    const { id } = useLocalSearchParams();
    const [auth, setAuth] = useState(null);
    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [availableDates, setAvailableDates] = useState([]);

    useEffect(() => {
        (async () => {
            const a = await getFirebaseAuth();
            setAuth(a);
        })();
    }, []);

    useEffect(() => {
        const loadProvider = async () => {
            if (!auth) return;

            try {
                setLoading(true);
                const user = auth.currentUser;
                if (!user) return;

                const token = await user.getIdToken();
                const data = await getAllProviders(token);

                // Find provider by ID
                const foundProvider = data.providers?.find(p => p.id?.toString() === id?.toString());

                if (foundProvider) {
                    setProvider(foundProvider);

                    // Fetch real slots from backend
                    const slotsData = await getProviderSlots(token, id);
                    const slots = slotsData.slots || [];
                    setAvailableSlots(slots);

                    // Group slots by date
                    const dates = {};
                    slots.forEach(slot => {
                        const date = new Date(slot).toISOString().split('T')[0];
                        if (!dates[date]) {
                            dates[date] = [];
                        }
                        dates[date].push(slot);
                    });
                    setAvailableDates(Object.keys(dates).sort());

                    console.log(`✅ Loaded ${slots.length} available slots across ${Object.keys(dates).length} days`);
                } else {
                    showAlert("Error", "Provider not found");
                }
            } catch (e) {
                console.error("Failed to load provider:", e);
                showAlert("Error", "Failed to load provider details");
            } finally {
                setLoading(false);
            }
        };

        loadProvider();
    }, [auth, id]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#002B5C" />
                <Text style={styles.loadingText}>Loading provider...</Text>
            </View>
        );
    }

    if (!provider) {
        return (
            <View style={styles.loadingContainer}>
                <MaterialIcons name="error-outline" size={64} color="#ccc" />
                <Text style={styles.loadingText}>Provider not found</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backTxt}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const timeSlotsForSelectedDate = selectedDate
        ? availableSlots.filter(slot => new Date(slot).toISOString().split('T')[0] === selectedDate)
        : [];

    // Generate calendar grid (next 28 days)
    const calendarDays = [];
    for (let i = 0; i < 28; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        calendarDays.push(date);
    }

    return (
        <View style={styles.screen}>
            <ScrollView style={styles.content}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={20} color="#002B5C" />
                    <Text style={styles.backTxt}>Back to results</Text>
                </TouchableOpacity>

                <Text style={styles.title}>{provider.name}</Text>
                <Text style={styles.subtitle}>{provider.specialty}</Text>

                <View style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>Provider Information</Text>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="star" size={18} color="#FFD700" />
                        <Text style={styles.line}>Rating: {provider.rating}/5</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="attach-money" size={18} color="#002B5C" />
                        <Text style={styles.line}>Cost: ${provider.cost}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialIcons
                            name={provider.in_network ? "check-circle" : "cancel"}
                            size={18}
                            color={provider.in_network ? "#155724" : "#721C24"}
                        />
                        <Text style={styles.line}>
                            {provider.in_network ? "In-Network" : "Out-of-Network"}
                        </Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Select a Date</Text>
                <View style={styles.calendarGrid}>
                    {calendarDays.map((date) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const hasSlots = availableDates.includes(dateStr);
                        const isSelected = dateStr === selectedDate;

                        return (
                            <TouchableOpacity
                                key={dateStr}
                                style={[
                                    styles.calendarDay,
                                    !hasSlots && styles.calendarDayDisabled,
                                    isSelected && styles.calendarDaySelected
                                ]}
                                onPress={() => hasSlots && setSelectedDate(dateStr)}
                                disabled={!hasSlots}
                            >
                                <Text style={[
                                    styles.calendarDayText,
                                    !hasSlots && styles.calendarDayTextDisabled,
                                    isSelected && styles.calendarDayTextSelected
                                ]}>
                                    {date.getDate()}
                                </Text>
                                <Text style={[
                                    styles.calendarDayMonth,
                                    !hasSlots && styles.calendarDayTextDisabled,
                                    isSelected && styles.calendarDayTextSelected
                                ]}>
                                    {date.toLocaleDateString('en-US', { month: 'short' })}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {selectedDate && (
                    <>
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                            Available Times for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                        <View style={styles.timeSlotsContainer}>
                            {timeSlotsForSelectedDate.map((slot) => {
                                const slotDate = new Date(slot);
                                return (
                                    <TouchableOpacity
                                        key={slot}
                                        style={styles.timeSlotBtn}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/book/[id]",
                                                params: {
                                                    providerId: provider.id,
                                                    providerName: provider.name,
                                                    slot: slot
                                                },
                                            })
                                        }
                                    >
                                        <MaterialIcons name="access-time" size={18} color="#002B5C" />
                                        <Text style={styles.timeSlotText}>
                                            {slotDate.toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}

                {availableDates.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="event-busy" size={48} color="#ccc" />
                        <Text style={styles.empty}>No appointments available at this time.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#fff" },
    content: { flex: 1, padding: 16 },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        color: "#002B5C",
        fontSize: 16,
    },
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 16,
        padding: 8,
    },
    backTxt: { color: "#002B5C", fontWeight: "600", fontSize: 16 },
    title: { fontSize: 24, fontWeight: "700", color: "#002B5C", marginBottom: 4 },
    subtitle: { fontSize: 18, color: "#666", marginBottom: 16 },
    infoCard: {
        borderWidth: 1,
        borderColor: "#E0E6ED",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        backgroundColor: "#F8FBFF",
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: "#002B5C", marginBottom: 12 },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    line: { color: "#333", fontSize: 15 },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
    },
    calendarDay: {
        width: "13%",
        aspectRatio: 1,
        backgroundColor: "#F3F7FB",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#002B5C",
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
    },
    calendarDayDisabled: {
        backgroundColor: "#F5F5F5",
        borderColor: "#E0E0E0",
        opacity: 0.4,
    },
    calendarDaySelected: {
        backgroundColor: "#002B5C",
        borderColor: "#002B5C",
    },
    calendarDayText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#002B5C",
    },
    calendarDayMonth: {
        fontSize: 10,
        color: "#002B5C",
        marginTop: 2,
    },
    calendarDayTextDisabled: {
        color: "#999",
    },
    calendarDayTextSelected: {
        color: "#fff",
    },
    timeSlotsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 20,
    },
    timeSlotBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#F3F7FB",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#002B5C",
    },
    timeSlotText: {
        color: "#002B5C",
        fontWeight: "600",
        fontSize: 15,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
    },
    empty: { color: "#666", marginTop: 10, textAlign: "center", fontStyle: "italic" },
});
