import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import Slider from "@react-native-community/slider";
import { auth } from "../../firebaseConfig";
import { getProviders } from "../../utils/backend";

export default function FindProvider() {
    const [filtersVisible, setFiltersVisible] = useState(true);
    const [providers, setProviders] = useState([]);
    const [inNetwork, setInNetwork] = useState(true);
    const [maxCost, setMaxCost] = useState(300);
    const [minRating, setMinRating] = useState(3);
    const [loading, setLoading] = useState(false);

    const [region, setRegion] = useState({
        latitude: 33.7490,
        longitude: -84.3880,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });

    const fetchProviders = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            const token = await user.getIdToken();

            const params = new URLSearchParams({
                lat: region.latitude,
                lon: region.longitude,
                maxDistance: 25,
                in_network: inNetwork,
                minRating,
                maxCost,
            });

            const data = await getProviders(token, params.toString());
            setProviders(data.results || []);
            console.log("Providers loaded:", data.results?.length || 0);
        } catch (err) {
            console.error("Provider fetch failed:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    return (
        <View style={styles.container}>
            {/* Filter toggle */}
            <TouchableOpacity
                style={styles.filterToggle}
                onPress={() => setFiltersVisible(!filtersVisible)}
            >
                <Text style={styles.filterToggleText}>
                    {filtersVisible ? "Hide Filters ▲" : "Show Filters ▼"}
                </Text>
            </TouchableOpacity>

            {/* Collapsible filter panel */}
            {filtersVisible && (
                <ScrollView style={styles.filterPanel}>
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>In-Network Only</Text>
                        <Switch value={inNetwork} onValueChange={setInNetwork} />
                    </View>

                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Max Cost: ${maxCost}</Text>
                    </View>
                    <Slider
                        minimumValue={50}
                        maximumValue={500}
                        step={10}
                        value={maxCost}
                        onValueChange={setMaxCost}
                        minimumTrackTintColor="#1A3673"
                        thumbTintColor="#1A3673"
                    />

                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Min Rating: {minRating}⭐</Text>
                    </View>
                    <Slider
                        minimumValue={1}
                        maximumValue={5}
                        step={0.5}
                        value={minRating}
                        onValueChange={setMinRating}
                        minimumTrackTintColor="#FFD700"
                        thumbTintColor="#FFD700"
                    />

                    <TouchableOpacity style={styles.applyButton} onPress={fetchProviders}>
                        <Text style={styles.applyText}>
                            {loading ? "Loading..." : "Apply Filters"}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* Map */}
            <MapView style={styles.map} region={region}>
                {providers.map((p, idx) => (
                    <Marker
                        key={idx}
                        coordinate={{
                            latitude: parseFloat(p.latitude || 0),
                            longitude: parseFloat(p.longitude || 0),
                        }}
                        title={p.name}
                        description={`${p.specialty} • ⭐${p.rating} • $${p.cost}`}
                        pinColor={p.in_network ? "#1A3673" : "#B20000"}
                    />
                ))}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    filterToggle: {
        backgroundColor: "#1A3673",
        padding: 10,
    },
    filterToggleText: {
        color: "#fff",
        fontWeight: "bold",
        textAlign: "center",
    },
    filterPanel: {
        backgroundColor: "#fff",
        padding: 10,
        borderBottomWidth: 1,
        borderColor: "#ddd",
    },
    filterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 8,
    },
    filterLabel: {
        fontWeight: "600",
        color: "#1A3673",
    },
    applyButton: {
        backgroundColor: "#1A3673",
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    applyText: { color: "#fff", fontWeight: "bold" },
});
