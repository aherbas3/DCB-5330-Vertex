// platform-shim.js
// This file helps resolve platform-specific imports for React Native Web

const path = require('path');

// Platform-specific module mappings
const platformMappings = {
    'react-native/Libraries/Utilities/Platform': 'react-native-web/dist/exports/Platform',
    'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface': 'react-native-web/dist',
    'react-native/Libraries/Utilities/BackHandler': 'react-native-web/dist/exports/BackHandler',
    'react-native/Libraries/Utilities/DeviceInfo': 'react-native-web/dist/exports/DeviceInfo',
    'react-native/Libraries/Utilities/Dimensions': 'react-native-web/dist/exports/Dimensions',
    'react-native/Libraries/Components/View/View': 'react-native-web/dist/exports/View',
    'react-native/Libraries/Components/Text/Text': 'react-native-web/dist/exports/Text',
    'react-native/Libraries/StyleSheet/StyleSheet': 'react-native-web/dist/exports/StyleSheet',
};

module.exports = platformMappings;