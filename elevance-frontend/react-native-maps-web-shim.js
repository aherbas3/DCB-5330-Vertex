// MapBox implementation for web
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import mapboxgl from 'mapbox-gl';

// Set MapBox token
mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

export default function MapView({ region, providers = [], style }) {
    const router = useRouter();
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        // Initialize map
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [region.longitude, region.latitude],
            zoom: 12
        });

        // Add navigation controls (zoom in/out)
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add geolocate control (find user's location)
        const geolocate = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true
        });
        map.current.addControl(geolocate, 'top-right');

        // Get user's location when map loads
        map.current.on('load', () => {
            geolocate.trigger();
        });

        geolocate.on('geolocate', (e) => {
            setUserLocation({
                longitude: e.coords.longitude,
                latitude: e.coords.latitude
            });
        });

        // Ensure map is fully loaded before adding markers
        map.current.on('idle', () => {
            console.log('Map is ready');
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!map.current) return;

        // Wait for map to be fully loaded
        const addMarkers = () => {
            // Clear existing markers
            markers.current.forEach(marker => marker.remove());
            markers.current = [];

            console.log(`🗺️ Adding ${providers.length} markers to map`);

            // Add provider markers
            providers.forEach((provider, index) => {
                if (!provider.latitude || !provider.longitude) {
                    console.warn(`⚠️ Provider ${provider.id} missing coordinates`);
                    return;
                }

                console.log(`📍 Creating marker for ${provider.name} at [${provider.longitude}, ${provider.latitude}]`);

                // Create custom marker element - BIGGER SIZE
                const el = document.createElement('div');
                el.className = 'custom-marker';
                el.style.width = '40px';
                el.style.height = '40px';
                el.style.borderRadius = '50%';
                el.style.backgroundColor = provider.in_network ? '#1A3673' : '#B20000';
                el.style.border = '4px solid white';
                el.style.cursor = 'pointer';
                el.style.boxShadow = '0 3px 6px rgba(0,0,0,0.4)';
                el.style.transition = 'transform 0.2s';

                // Hover effect
                el.addEventListener('mouseenter', () => {
                    el.style.transform = 'scale(1.2)';
                });
                el.addEventListener('mouseleave', () => {
                    el.style.transform = 'scale(1)';
                });

                // Create popup (only show on click)
                const popup = new mapboxgl.Popup({
                    offset: 25,
                    closeButton: true,
                    closeOnClick: false
                }).setHTML(`
                    <div style="padding: 12px; min-width: 200px;">
                        <h3 style="margin: 0 0 8px 0; color: #002B5C; font-size: 16px; font-weight: 700;">
                            ${provider.name}
                        </h3>
                        <p style="margin: 0 0 8px 0; color: #666; font-size: 13px;">
                            ${provider.specialty}
                        </p>
                        <div style="display: flex; gap: 12px; margin: 8px 0; flex-wrap: wrap;">
                            <span style="font-size: 13px; font-weight: 600;">⭐ ${provider.rating}</span>
                            <span style="font-size: 13px; font-weight: 600;">💰 $${provider.cost}</span>
                        </div>
                        <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: ${provider.in_network ? '#D4EDDA' : '#F8D7DA'}; color: ${provider.in_network ? '#155724' : '#721C24'}; margin-bottom: 12px;">
                            ${provider.in_network ? 'In-Network' : 'Out-of-Network'}
                        </span>
                        <button
                            onclick="window.navigateToProvider(${provider.id})"
                            style="width: 100%; margin-top: 8px; padding: 10px; background: #002B5C; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;"
                        >
                            Book Appointment
                        </button>
                        ${userLocation ? `
                        <button
                            onclick="window.getDirections(${provider.latitude}, ${provider.longitude})"
                            style="width: 100%; margin-top: 8px; padding: 10px; background: #fff; color: #002B5C; border: 1px solid #002B5C; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;"
                        >
                            Get Directions
                        </button>
                        ` : ''}
                    </div>
                `);

                // Add marker to map
                const marker = new mapboxgl.Marker(el)
                    .setLngLat([provider.longitude, provider.latitude])
                    .setPopup(popup)
                    .addTo(map.current);

                markers.current.push(marker);

                console.log(`✅ Added marker ${index + 1}/${providers.length} for ${provider.name}`);
            });

            console.log(`🎉 Successfully added ${markers.current.length} markers to the map!`);
        };

        // Try to add markers immediately, and also listen for load events
        const tryAddMarkers = () => {
            try {
                addMarkers();
            } catch (e) {
                console.error('❌ Error adding markers:', e);
            }
        };

        // Try multiple times to ensure markers are added
        setTimeout(tryAddMarkers, 100);
        setTimeout(tryAddMarkers, 500);
        setTimeout(tryAddMarkers, 1000);

        map.current.on('load', () => {
            console.log('🗺️ Map loaded event fired');
            tryAddMarkers();
        });

        map.current.on('idle', () => {
            console.log('🗺️ Map idle event fired');
            if (markers.current.length === 0 && providers.length > 0) {
                tryAddMarkers();
            }
        });

        // Global functions for popup buttons
        window.navigateToProvider = (id) => {
            router.push({ pathname: "/providers/[id]", params: { id } });
        };

        window.getDirections = (lat, lon) => {
            if (userLocation) {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${lat},${lon}&travelmode=driving`;
                window.open(url, '_blank');
            }
        };

    }, [providers, userLocation, router]);

    return (
        <View style={[styles.container, style]}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#1A3673' }]} />
                    <Text style={styles.legendText}>In-Network</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#B20000' }]} />
                    <Text style={styles.legendText}>Out-of-Network</Text>
                </View>
                <Text style={styles.legendHint}>Click markers for details • Use + - to zoom</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        position: 'relative',
    },
    legend: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E6ED',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    legendText: {
        fontSize: 12,
        color: '#333',
        fontWeight: '600',
    },
    legendHint: {
        fontSize: 11,
        color: '#666',
        marginLeft: 8,
        fontStyle: 'italic',
    },
});
