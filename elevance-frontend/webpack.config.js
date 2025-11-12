// webpack.config.js
// Custom webpack configuration for Expo Web

const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(env, argv);

    // Add custom aliases for React Native modules
    config.resolve.alias = {
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

    // Exclude MapBox GL from Babel transpilation
    config.module.rules.forEach(rule => {
        if (rule.oneOf) {
            rule.oneOf.forEach(oneOfRule => {
                if (oneOfRule.loader && oneOfRule.loader.includes('babel-loader')) {
                    if (!oneOfRule.exclude) {
                        oneOfRule.exclude = [];
                    }
                    if (Array.isArray(oneOfRule.exclude)) {
                        oneOfRule.exclude.push(/node_modules\/mapbox-gl/);
                    } else {
                        oneOfRule.exclude = [oneOfRule.exclude, /node_modules\/mapbox-gl/];
                    }
                }
            });
        }
    });

    return config;
};