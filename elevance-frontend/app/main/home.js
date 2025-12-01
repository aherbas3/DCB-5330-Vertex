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
    const [showCostGuide, setShowCostGuide] = useState(false);
    const [expandedTerm, setExpandedTerm] = useState(null);
    const [openGlossary, setOpenGlossary] = useState(null);

    const costTerms = [
        {
            key: "deductible",
            title: "Deductible",
            summary: "What you pay first each year before insurance chips in.",
            detail: "You pay medical costs until this amount is reached. After that, your plan starts sharing the bill.",
            tip: "If you expect more care, a lower deductible can help keep surprises down.",
            math: "Example: With a $1,000 deductible, you pay the first $1,000 of covered care each year.",
        },
        {
            key: "copay",
            title: "Copay",
            summary: "A flat fee you pay for certain visits or prescriptions.",
            detail: "It stays the same no matter the visit cost. You usually pay it at the time of care.",
            tip: "Check your card or app for the copay amount before your visit so you know what to bring.",
            math: "Example: You might pay $25 to see a primary care doctor, even if the visit is billed higher.",
        },
        {
            key: "coinsurance",
            title: "Coinsurance",
            summary: "A percentage you pay after the deductible is met.",
            detail: "Your share goes up or down with the price of care. The plan pays the rest.",
            tip: "Ask for an estimated cost so you know your percentage in dollars.",
            math: "Example: 20% coinsurance on a $200 service means you pay $40, the plan pays $160.",
        },
    ];

    const glossaryTerms = [
        {
            key: "primary-care",
            term: "Primary care doctor",
            summary: "Your main doctor for everyday care.",
            meaning: "Your go-to doctor for checkups, colds, and questions. Start here before seeing most specialists.",
            example: "Book this for annual visits or when you feel sick and need advice.",
        },
        {
            key: "referral",
            term: "Referral",
            summary: "A note that lets you see a specialist.",
            meaning: "A primary doctor’s note that says a specialist can see you. Some plans need this first.",
            example: "Get one before booking some specialists to avoid extra costs.",
        },
        {
            key: "in-network",
            term: "In-network",
            summary: "Doctors that made price deals with your plan.",
            meaning: "Clinics and doctors that agreed to lower prices with your insurance.",
            example: "Choosing in-network usually means smaller bills.",
        },
        {
            key: "out-of-pocket-max",
            term: "Out-of-pocket max",
            summary: "The most you’ll pay this year.",
            meaning: "A cap on what you pay for covered care in a year. After that, the plan pays 100% of covered costs.",
            example: "Once you hit this, covered care is fully paid by the plan for the rest of the year.",
        },
        {
            key: "urgent-care",
            term: "Urgent care",
            summary: "Walk-in help for non-emergencies.",
            meaning: "Clinics for quick care when it’s not life-threatening but shouldn’t wait.",
            example: "Good for stitches, fevers, sprains. Usually cheaper than the ER.",
        },
        {
            key: "emergency-room",
            term: "Emergency room (ER)",
            summary: "For life-threatening issues.",
            meaning: "Hospital care for serious or life-threatening problems.",
            example: "Go for chest pain, trouble breathing, major injury. Costs are usually highest.",
        },
        {
            key: "telehealth",
            term: "Telehealth",
            summary: "Care by phone or video.",
            meaning: "Visits with a doctor or nurse by video or phone instead of in person.",
            example: "Great for follow-ups, rashes, or prescription questions without leaving home.",
        },
        {
            key: "prior-auth",
            term: "Prior authorization",
            summary: "Plan approval before a service.",
            meaning: "A green light from your plan before certain tests, meds, or procedures.",
            example: "Ask your doctor to submit it early so appointments aren’t delayed.",
        },
        {
            key: "preventive-care",
            term: "Preventive care",
            summary: "Care to keep you healthy.",
            meaning: "Services like vaccines, annual checkups, and screenings to catch issues early.",
            example: "Often covered at low or no cost when in-network.",
        },
    ];

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

                {/* Cost basics tutorial */}
                <View style={styles.tutorialHeader}>
                    <Text style={[styles.sectionTitle, styles.inlineSectionTitle]}>Understand Your Costs</Text>
                    <TouchableOpacity
                        style={styles.tutorialButton}
                        activeOpacity={0.8}
                        onPress={() => setShowCostGuide(!showCostGuide)}
                    >
                        <MaterialIcons
                            name={showCostGuide ? "expand-less" : "play-circle-outline"}
                            size={22}
                            color="#002B5C"
                        />
                        <Text style={styles.tutorialButtonText}>
                            {showCostGuide ? "Hide tutorial" : "Cost basics"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showCostGuide && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="school" size={22} color="#002B5C" />
                            <Text style={styles.cardTitle}>Example visit: $250 billed</Text>
                        </View>
                        <Text style={styles.notificationText}>
                            See how a deductible, copay, and coinsurance split up one bill.
                        </Text>
                        <View style={styles.breakdownBox}>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Deductible</Text>
                                <Text style={styles.breakdownValue}>You pay $150</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Copay</Text>
                                <Text style={styles.breakdownValue}>Flat $25 per visit</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Coinsurance</Text>
                                <Text style={styles.breakdownValue}>20% of the rest = $20</Text>
                            </View>
                            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                                <Text style={styles.breakdownLabel}>Plan pays</Text>
                                <Text style={styles.breakdownValue}>$55</Text>
                            </View>
                            <View style={styles.callout}>
                                <Text style={styles.calloutText}>You’d pay $195, the plan covers $55.</Text>
                            </View>
                        </View>
                        <View style={styles.pillsRow}>
                            {costTerms.map(term => {
                                const isOpen = expandedTerm === term.key;
                                return (
                                    <TouchableOpacity
                                        key={term.key}
                                        style={[styles.pill, isOpen && styles.pillOpen]}
                                        activeOpacity={0.85}
                                        onPress={() => setExpandedTerm(isOpen ? null : term.key)}
                                    >
                                        <View style={styles.termHeader}>
                                            <View style={styles.termTitleRow}>
                                                <View style={styles.termDot} />
                                                <Text style={styles.pillTitle}>{term.title}</Text>
                                            </View>
                                            <MaterialIcons
                                                name={isOpen ? "expand-less" : "expand-more"}
                                                size={20}
                                                color="#002B5C"
                                            />
                                        </View>
                                        <Text style={styles.pillText}>{term.summary}</Text>
                                        {isOpen && (
                                            <View style={styles.termDetailBox}>
                                                <Text style={styles.termDetail}>{term.detail}</Text>
                                                <Text style={styles.termMath}>{term.math}</Text>
                                                <View style={styles.termTip}>
                                                    <MaterialIcons name="lightbulb-outline" size={16} color="#1A3673" />
                                                    <Text style={styles.termTipText}>{term.tip}</Text>
                                                </View>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Health Tips */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="lightbulb" size={24} color="#FFD700" />
                        <Text style={styles.cardTitle}>Health Tips</Text>
                    </View>
                    <Text style={styles.notificationText}>💡 Remember your flu shot this season!</Text>
                    <Text style={styles.notificationText}>🏃 Aim for 30 minutes of exercise daily</Text>
                </View>

                {/* Plain language glossary */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="menu-book" size={22} color="#002B5C" />
                        <Text style={styles.cardTitle}>Plain Words Glossary</Text>
                    </View>
                    <Text style={styles.glossaryIntro}>
                        Quick meanings in easy words. Tap a term and keep it handy for your visits.
                    </Text>
                    <View style={styles.glossaryList}>
                        {glossaryTerms.map(item => {
                            const isOpen = openGlossary === item.key;
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[styles.glossaryItem, isOpen && styles.glossaryItemOpen]}
                                    activeOpacity={0.85}
                                    onPress={() => setOpenGlossary(isOpen ? null : item.key)}
                                >
                                    <View style={styles.glossaryTitleRow}>
                                        <View style={styles.glossaryDot} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.glossaryTerm}>{item.term}</Text>
                                            <Text style={styles.glossarySummary}>{item.summary}</Text>
                                        </View>
                                        <MaterialIcons
                                            name={isOpen ? "expand-less" : "expand-more"}
                                            size={20}
                                            color="#002B5C"
                                        />
                                    </View>
                                    {isOpen && (
                                        <View style={styles.glossaryDetailBox}>
                                            <Text style={styles.glossaryMeaning}>{item.meaning}</Text>
                                            <View style={styles.glossaryExampleBox}>
                                                <MaterialIcons name="info-outline" size={16} color="#1A3673" />
                                                <Text style={styles.glossaryExample}>{item.example}</Text>
                                            </View>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
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
    inlineSectionTitle: { marginTop: 0, marginBottom: 0 },
    tutorialHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 24,
        marginBottom: 12,
    },
    tutorialButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E6EEF7",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        gap: 8,
        borderWidth: 1,
        borderColor: "#D5E0ED",
    },
    tutorialButtonText: { color: "#002B5C", fontWeight: "700", fontSize: 14 },
    breakdownBox: {
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E0E6ED",
        marginTop: 12,
        paddingVertical: 10,
        gap: 10,
    },
    breakdownRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
    },
    breakdownLabel: { fontSize: 14, color: "#002B5C", fontWeight: "600" },
    breakdownValue: { fontSize: 14, color: "#333", fontWeight: "600" },
    breakdownTotal: { borderTopWidth: 1, borderTopColor: "#E0E6ED", paddingTop: 10, marginTop: 2 },
    callout: {
        marginHorizontal: 12,
        marginBottom: 6,
        backgroundColor: "#E6F4FF",
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: "#CFE4F8",
    },
    calloutText: { color: "#002B5C", fontWeight: "700", fontSize: 14 },
    pillsRow: { marginTop: 14, gap: 10 },
    pill: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E0E6ED",
        borderRadius: 10,
        padding: 12,
    },
    pillTitle: { fontSize: 15, fontWeight: "700", color: "#002B5C", marginBottom: 6 },
    pillText: { fontSize: 14, color: "#333", lineHeight: 20 },
    pillOpen: { backgroundColor: "#EEF4FB", borderColor: "#C3D6EE" },
    termHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    termTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    termDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#1A3673",
    },
    termDetailBox: {
        marginTop: 6,
        padding: 10,
        borderRadius: 8,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#D7E3F3",
        gap: 6,
    },
    termDetail: { fontSize: 14, color: "#1A1A1A", lineHeight: 20 },
    termMath: { fontSize: 13, color: "#3A4A63", fontWeight: "700" },
    termTip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EAF3FF", padding: 8, borderRadius: 6 },
    termTipText: { fontSize: 13, color: "#1A3673", flex: 1, lineHeight: 18 },
    glossaryIntro: { fontSize: 14, color: "#333", lineHeight: 20 },
    glossaryList: { marginTop: 12, gap: 10 },
    glossaryItem: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E0E6ED",
        borderRadius: 10,
        padding: 12,
        gap: 6,
    },
    glossaryItemOpen: { backgroundColor: "#EEF4FB", borderColor: "#C3D6EE" },
    glossaryTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    glossaryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1A3673" },
    glossaryTerm: { fontSize: 15, fontWeight: "700", color: "#002B5C" },
    glossarySummary: { fontSize: 13, color: "#3A4A63", lineHeight: 18 },
    glossaryMeaning: { fontSize: 14, color: "#1A1A1A", lineHeight: 20 },
    glossaryDetailBox: { gap: 8 },
    glossaryExampleBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EAF3FF", padding: 8, borderRadius: 8 },
    glossaryExample: { fontSize: 13, color: "#1A3673", flex: 1, lineHeight: 18 },
});
