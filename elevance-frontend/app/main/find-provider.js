import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    FlatList,
    TextInput,
    ActivityIndicator,
    Modal,
} from "react-native";
import MapView from "../../utils/MapView";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import { MaterialIcons } from "@expo/vector-icons";
import { getFirebaseAuth } from "../../firebaseAuth";
import { getAllProviders } from "../../utils/backend";

export default function FindProvider() {
    const router = useRouter();
    const [auth, setAuth] = useState(null);
    const [allProviders, setAllProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("list"); // "map" or "list"
    const [selectedProvider, setSelectedProvider] = useState(null); // For modal

    // Filter states - Start with permissive defaults
    const [inNetwork, setInNetwork] = useState(false);
    const [maxCost, setMaxCost] = useState(2000); // High default to show all providers
    const [minRating, setMinRating] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    const [region, setRegion] = useState({
        latitude: 33.7490,
        longitude: -84.3880,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });

    // Initialize Firebase Auth
    useEffect(() => {
        (async () => {
            const a = await getFirebaseAuth();
            setAuth(a);
        })();
    }, []);

    // Fetch all providers once
    useEffect(() => {
        const fetchProviders = async () => {
            if (!auth) return;

            try {
                setLoading(true);
                const user = auth.currentUser;
                if (!user) {
                    console.warn("No user signed in");
                    return;
                }

                const token = await user.getIdToken();
                const data = await getAllProviders(token);
                setAllProviders(data.providers || []);
                console.log(`✅ Loaded ${data.providers?.length || 0} providers`);
                if (data.providers && data.providers.length > 0) {
                    console.log('Sample provider:', data.providers[0]);
                }
            } catch (err) {
                console.error("❌ Failed to fetch providers:", err);
                console.error("Error details:", err.message);
                console.error("Error stack:", err.stack);
            } finally {
                setLoading(false);
            }
        };

        fetchProviders();
    }, [auth]);

    // Client-side filtering
    const filteredProviders = useMemo(() => {
        console.log('Filtering - Total providers:', allProviders.length);
        console.log('Filter settings:', { inNetwork, maxCost, minRating, searchQuery });

        let filtered = allProviders;

        // Filter by in-network (only if toggle is ON)
        if (inNetwork) {
            filtered = filtered.filter(p => p.in_network === true);
            console.log('After in-network filter:', filtered.length);
        }

        // Filter by max cost
        filtered = filtered.filter(p => p.cost <= maxCost);
        console.log('After cost filter (≤', maxCost, '):', filtered.length);

        // Filter by min rating
        filtered = filtered.filter(p => p.rating >= minRating);
        console.log('After rating filter (≥', minRating, '):', filtered.length);

        // Filter by search query (name or specialty)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name?.toLowerCase().includes(query) ||
                p.specialty?.toLowerCase().includes(query)
            );
            console.log('After search filter:', filtered.length);
        }

        console.log('Final filtered count:', filtered.length);
        return filtered;
    }, [allProviders, inNetwork, maxCost, minRating, searchQuery]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#002B5C" />
                <Text style={styles.loadingText}>Loading providers...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Filters Panel - Always Visible */}
            <View style={styles.filtersContainer}>
                <ScrollView style={styles.filterPanel} nestedScrollEnabled>
                    {/* Debug Info */}
                    <View style={styles.debugPanel}>
                        <Text style={styles.debugText}>
                            📊 Loaded: {allProviders.length} | Showing: {filteredProviders.length}
                        </Text>
                    </View>

                    {/* Search */}
                    <Text style={styles.filterLabel}>Search by Name or Specialty</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="e.g., Dr. Smith or Cardiology"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />

                    {/* In-Network Toggle */}
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>In-Network Only</Text>
                        <Switch
                            value={inNetwork}
                            onValueChange={setInNetwork}
                            trackColor={{ false: "#ccc", true: "#1A3673" }}
                            thumbColor={inNetwork ? "#fff" : "#888"}
                        />
                    </View>

                    {/* Max Cost Slider */}
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Max Cost: ${maxCost}</Text>
                    </View>
                    <Slider
                        minimumValue={0}
                        maximumValue={2000}
                        step={50}
                        value={maxCost}
                        onValueChange={setMaxCost}
                        minimumTrackTintColor="#1A3673"
                        thumbTintColor="#1A3673"
                    />

                    {/* Min Rating Slider */}
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Min Rating: {minRating.toFixed(1)}⭐</Text>
                    </View>
                    <Slider
                        minimumValue={0}
                        maximumValue={5}
                        step={0.5}
                        value={minRating}
                        onValueChange={setMinRating}
                        minimumTrackTintColor="#FFD700"
                        thumbTintColor="#FFD700"
                    />

                    {/* View Mode Toggle */}
                    <View style={styles.viewModeContainer}>
                        <Text style={styles.filterLabel}>View Mode</Text>
                        <View style={styles.viewToggle}>
                            <TouchableOpacity
                                style={[styles.viewBtn, viewMode === "list" && styles.viewBtnActive]}
                                onPress={() => setViewMode("list")}
                            >
                                <MaterialIcons
                                    name="list"
                                    size={20}
                                    color={viewMode === "list" ? "#fff" : "#002B5C"}
                                />
                                <Text style={[styles.viewBtnText, viewMode === "list" && styles.viewBtnTextActive]}>
                                    List
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.viewBtn, viewMode === "map" && styles.viewBtnActive]}
                                onPress={() => setViewMode("map")}
                            >
                                <MaterialIcons
                                    name="map"
                                    size={20}
                                    color={viewMode === "map" ? "#fff" : "#002B5C"}
                                />
                                <Text style={[styles.viewBtnText, viewMode === "map" && styles.viewBtnTextActive]}>
                                    Map
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.resultsText}>
                        {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
                    </Text>
                </ScrollView>
            </View>

            {/* Map or List View */}
            {viewMode === "map" ? (
                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
                        region={region}
                        providers={filteredProviders.filter(p => p.latitude && p.longitude)}
                        onMarkerPress={(provider) => setSelectedProvider(provider)}
                    />
                    {filteredProviders.filter(p => p.latitude && p.longitude).length === 0 && (
                        <View style={styles.mapOverlay}>
                            <MaterialIcons name="location-off" size={48} color="#999" />
                            <Text style={styles.mapOverlayText}>
                                No providers with location data
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filteredProviders}
                    keyExtractor={(item) => item.id?.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="search-off" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No providers match your filters</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push({ pathname: "/providers/[id]", params: { id: item.id } })}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.specialty}>{item.specialty}</Text>
                                <View style={styles.metaRow}>
                                    <Text style={[styles.badge, item.in_network ? styles.badgeInNetwork : styles.badgeOutNetwork]}>
                                        {item.in_network ? "In-Network" : "Out-of-Network"}
                                    </Text>
                                    <Text style={styles.meta}>⭐ {item.rating}</Text>
                                    <Text style={styles.meta}>${item.cost}</Text>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color="#002B5C" />
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Provider Details Modal */}
            <Modal
                visible={!!selectedProvider}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedProvider(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedProvider(null)}
                >
                    <TouchableOpacity
                        style={styles.modalContent}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {selectedProvider && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalTitle}>{selectedProvider.name}</Text>
                                        <Text style={styles.modalSubtitle}>{selectedProvider.specialty}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setSelectedProvider(null)}
                                        style={styles.modalCloseBtn}
                                    >
                                        <MaterialIcons name="close" size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modalBody}>
                                    <View style={styles.modalInfoRow}>
                                        <MaterialIcons name="star" size={20} color="#FFD700" />
                                        <Text style={styles.modalInfoText}>Rating: {selectedProvider.rating}/5</Text>
                                    </View>
                                    <View style={styles.modalInfoRow}>
                                        <MaterialIcons name="attach-money" size={20} color="#002B5C" />
                                        <Text style={styles.modalInfoText}>Cost: ${selectedProvider.cost}</Text>
                                    </View>
                                    <View style={styles.modalInfoRow}>
                                        <MaterialIcons
                                            name={selectedProvider.in_network ? "check-circle" : "cancel"}
                                            size={20}
                                            color={selectedProvider.in_network ? "#155724" : "#721C24"}
                                        />
                                        <Text style={styles.modalInfoText}>
                                            {selectedProvider.in_network ? "In-Network" : "Out-of-Network"}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.modalBookBtn}
                                    onPress={() => {
                                        setSelectedProvider(null);
                                        router.push({
                                            pathname: "/providers/[id]",
                                            params: { id: selectedProvider.id }
                                        });
                                    }}
                                >
                                    <MaterialIcons name="calendar-today" size={20} color="#fff" />
                                    <Text style={styles.modalBookBtnText}>Book Appointment</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", flexDirection: "row" },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    loadingText: {
        marginTop: 10,
        color: "#002B5C",
        fontSize: 16,
    },
    filtersContainer: {
        width: 320,
        borderRightWidth: 1,
        borderRightColor: "#E0E6ED",
        backgroundColor: "#F8F9FA",
    },
    filterPanel: {
        padding: 16,
    },
    debugPanel: {
        backgroundColor: "#FFF3CD",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#FFC107",
    },
    debugText: {
        fontSize: 12,
        color: "#856404",
        fontWeight: "600",
    },
    viewModeContainer: {
        marginTop: 16,
        marginBottom: 12,
    },
    viewToggle: {
        flexDirection: "row",
        borderRadius: 8,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#002B5C",
        marginTop: 8,
    },
    viewBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        backgroundColor: "#fff",
        gap: 6,
    },
    viewBtnActive: {
        backgroundColor: "#002B5C",
    },
    viewBtnText: {
        color: "#002B5C",
        fontWeight: "600",
    },
    viewBtnTextActive: {
        color: "#fff",
    },
    filterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 8,
    },
    filterLabel: {
        fontWeight: "600",
        color: "#002B5C",
        marginBottom: 8,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#fff",
        marginBottom: 16,
    },
    resultsText: {
        marginTop: 12,
        fontSize: 14,
        color: "#002B5C",
        fontWeight: "700",
        textAlign: "center",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 8,
    },
    mapContainer: {
        flex: 1,
        position: "relative",
    },
    map: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    mapOverlay: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -100 }, { translateY: -50 }],
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: 20,
        borderRadius: 12,
        width: 200,
    },
    mapOverlayText: {
        marginTop: 12,
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: "#F3F7FB",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: "#E0E6ED",
    },
    name: {
        fontSize: 16,
        fontWeight: "700",
        color: "#002B5C",
        marginBottom: 4,
    },
    specialty: {
        color: "#666",
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    badge: {
        fontSize: 11,
        fontWeight: "700",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeInNetwork: {
        backgroundColor: "#D4EDDA",
        color: "#155724",
    },
    badgeOutNetwork: {
        backgroundColor: "#F8D7DA",
        color: "#721C24",
    },
    meta: {
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: "#999",
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        width: "90%",
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#002B5C",
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 16,
        color: "#666",
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalBody: {
        marginBottom: 20,
    },
    modalInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
    },
    modalInfoText: {
        fontSize: 15,
        color: "#333",
        fontWeight: "500",
    },
    modalBookBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#002B5C",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginTop: 8,
    },
    modalBookBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});
