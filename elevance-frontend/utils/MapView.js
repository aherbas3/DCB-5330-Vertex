// MapView wrapper that uses react-native-maps (which is aliased to @teovilla/react-native-web-maps on web)
import React from 'react';
import { Platform } from 'react-native';

// Direct import based on platform to bypass any resolution issues
let RNMapView, Marker;
if (Platform.OS === 'web') {
    // For web, directly import from @teovilla
    const maps = require('@teovilla/react-native-web-maps');
    RNMapView = maps.default;
    Marker = maps.Marker;
} else {
    // For native, use react-native-maps
    const maps = require('react-native-maps');
    RNMapView = maps.default;
    Marker = maps.Marker;
}

// Custom MapView wrapper that adds Google Maps API key for web
function CustomMapView({ providers = [], currentLocation, region, style, onMarkerPress, ...props }) {
    const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    const mapRef = React.useRef(null);

    // For web, we need to add the googleMapsApiKey prop
    const webProps = Platform.OS === 'web' ? {
        googleMapsApiKey: googleMapsApiKey,
    } : {};

    // Auto-fit map bounds when providers change
    React.useEffect(() => {
        if (providers.length > 0 && mapRef.current && Platform.OS === 'web') {
            // Give the map a moment to render, then fit bounds
            setTimeout(() => {
                try {
                    const coordinates = providers
                        .filter(p => p.latitude && p.longitude)
                        .map(p => ({
                            latitude: p.latitude,
                            longitude: p.longitude,
                        }));

                    if (coordinates.length > 0 && mapRef.current.fitToCoordinates) {
                        mapRef.current.fitToCoordinates(coordinates, {
                            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                            animated: true,
                        });
                    }
                } catch (e) {
                    console.log('Unable to fit bounds:', e);
                }
            }, 100);
        }
    }, [providers]);

    return (
        <RNMapView
            ref={mapRef}
            key={`map-${providers.length}`} // Force re-render when provider count changes
            style={style}
            initialRegion={region}
            provider="google"
            {...webProps}
            {...props}
        >
            {providers.map((provider) => {
                if (!provider.latitude || !provider.longitude) {
                    return null;
                }

                return (
                    <Marker
                        key={`marker-${provider.id}`}
                        coordinate={{
                            latitude: provider.latitude,
                            longitude: provider.longitude,
                        }}
                        title={provider.name}
                        description={`${provider.specialty} • Rating: ${provider.rating} • $${provider.cost}`}
                        pinColor={provider.in_network ? '#1A3673' : '#B20000'}
                        onPress={() => onMarkerPress && onMarkerPress(provider)}
                    />
                );
            })}

            {/* Current Location Marker */}
            {currentLocation && (
                <Marker
                    key="current-location"
                    coordinate={{
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                    }}
                    title="Your Location"
                    description="You are here"
                    pinColor="#00A86B"
                />
            )}
        </RNMapView>
    );
}

export default CustomMapView;
