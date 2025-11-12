// codegen-stub.js
// This is a stub for React Native's codegen utilities that don't exist in React Native Web
// These are used by native modules like react-native-maps but aren't needed for web

// Stub for codegenNativeCommands
export function codegenNativeCommands(options) {
    // Return a no-op function for web
    return () => {};
}

// Stub for codegenNativeComponent
export default function codegenNativeComponent(componentName, options) {
    // For web, return a simple component that renders nothing
    // This prevents errors while allowing the code to run
    if (typeof window !== 'undefined') {
        // We're on web, return a dummy component
        const React = require('react');
        return React.forwardRef((props, ref) => null);
    }

    // For native platforms, try to use the actual implementation
    try {
        const actualCodegen = require('react-native/Libraries/Utilities/codegenNativeComponent');
        return actualCodegen.default(componentName, options);
    } catch (e) {
        // Fallback for any issues
        const React = require('react');
        return React.forwardRef((props, ref) => null);
    }
}

// Export both as named exports for compatibility
export { codegenNativeComponent };