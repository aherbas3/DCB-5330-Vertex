// babel.config.js
module.exports = function(api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        // Exclude mapbox-gl from transformation
        ignore: [
            'node_modules/mapbox-gl/dist/mapbox-gl.js',
            'node_modules/mapbox-gl/dist/mapbox-gl-unminified.js'
        ],
        plugins: [
            // Add module resolver plugin to handle path aliases
            [
                'module-resolver',
                {
                    root: ['./'],
                    extensions: [
                        '.ios.ts',
                        '.android.ts',
                        '.ts',
                        '.ios.tsx',
                        '.android.tsx',
                        '.tsx',
                        '.jsx',
                        '.js',
                        '.json',
                        '.web.js',
                        '.web.ts',
                        '.web.tsx',
                    ],
                    alias: {
                        // Map React Native internal modules to React Native Web
                        'react-native/Libraries/Utilities/Platform': 'react-native-web/dist/exports/Platform',
                        'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface': 'react-native-web/dist',
                        'react-native/Libraries/Utilities/codegenNativeCommands': './codegen-stub',
                        'react-native/Libraries/Utilities/codegenNativeComponent': './codegen-stub',
                        'react-native-web/dist/Utilities/codegenNativeCommands': './codegen-stub',
                        'react-native-web/dist/Utilities/codegenNativeComponent': './codegen-stub',
                        'react-native/Libraries': 'react-native-web/dist',
                        // Platform-specific aliases for react-native-maps on web
                        'react-native-maps': './react-native-maps-web-shim',
                    },
                },
            ],
            // Add React Native Web plugin
            'react-native-web',
        ],
    };
};