// webpack.config.js
// Custom webpack configuration for Expo Web

const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(env, argv);

    // IMPORTANT: Alias react-native-maps BEFORE other aliases to ensure it takes precedence
    const teovilla = path.resolve(__dirname, 'node_modules/@teovilla/react-native-web-maps');

    config.resolve.alias = {
        // Put react-native-maps alias FIRST to ensure it's matched before any other rules
        'react-native-maps$': teovilla,
        'react-native-maps/lib': teovilla,
        ...config.resolve.alias,
        'react-native$': 'react-native-web',
        'react-native/Libraries/Utilities/Platform': 'react-native-web/dist/exports/Platform',
        'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface': 'react-native-web/dist',
        'react-native/Libraries/Utilities/BackHandler': 'react-native-web/dist/exports/BackHandler',
        'react-native/Libraries/Utilities/DeviceInfo': 'react-native-web/dist/exports/DeviceInfo',
        'react-native/Libraries/Utilities/Dimensions': 'react-native-web/dist/exports/Dimensions',
    };

    // Add fallbacks for node modules if needed
    config.resolve.fallback = {
        ...config.resolve.fallback,
        "crypto": false,
        "stream": false,
        "assert": false,
        "http": false,
        "https": false,
        "os": false,
        "url": false,
    };

    return config;
};