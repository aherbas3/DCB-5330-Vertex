const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Configure source extensions
config.resolver.sourceExts = [
    "web.ts", "web.tsx", "web.js",
    "ts", "tsx", "jsx", "js", "json"
];

// Configure main fields
config.resolver.mainFields = ["browser", "module", "main"];

// Remove svg from asset extensions if you're using svg as a component
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== "svg");

// Add platform-specific module resolution
config.resolver.platforms = ["web", "ios", "android"];

// Create a path for codegen stub
const codegenStubPath = path.join(__dirname, 'codegen-stub.js');

// Create platform-specific aliases for React Native modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Handle the specific missing module
    if (moduleName === "../Utilities/Platform") {
        return {
            filePath: path.resolve(
                __dirname,
                "node_modules/react-native-web/dist/exports/Platform/index.js"
            ),
            type: "sourceFile",
        };
    }

    // Handle ReactNativePrivateInterface
    if (moduleName.includes("ReactNativePrivateInterface")) {
        return {
            filePath: path.resolve(
                __dirname,
                "node_modules/react-native-web/dist/index.js"
            ),
            type: "sourceFile",
        };
    }

    // Handle codegenNativeCommands and codegenNativeComponent (doesn't exist in react-native-web)
    if (moduleName.includes("codegenNativeCommands") ||
        moduleName.includes("codegenNativeComponent") ||
        moduleName.includes("Utilities/codegen")) {
        // Return a stub module for codegen
        return {
            filePath: codegenStubPath,
            type: "sourceFile",
        };
    }

    // Handle other React Native internal modules
    if (moduleName.startsWith("react-native/Libraries")) {
        const webModuleName = moduleName.replace("react-native/Libraries", "react-native-web/dist");
        try {
            return {
                filePath: require.resolve(webModuleName),
                type: "sourceFile",
            };
        } catch (e) {
            // If it's a codegen related module, use stub
            if (moduleName.includes("codegen")) {
                return {
                    filePath: codegenStubPath,
                    type: "sourceFile",
                };
            }
            // Otherwise fallback to default resolution
        }
    }

    // Handle react-native-web/dist paths that don't exist
    if (moduleName.includes("react-native-web/dist/Utilities/codegen")) {
        return {
            filePath: codegenStubPath,
            type: "sourceFile",
        };
    }

    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
};

// Add extra node modules for better resolution
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    "react-native": path.resolve(__dirname, "node_modules/react-native-web"),
};

// Ensure web platform is properly configured
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Exclude mapbox-gl from being transformed
config.transformer.getTransformOptions = async () => ({
    transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
    },
});

// Add mapbox-gl to blacklist/blockList to prevent transformation
config.resolver.blockList = [
    /node_modules\/mapbox-gl\/dist\/mapbox-gl-csp-worker\.js/,
];

module.exports = config;