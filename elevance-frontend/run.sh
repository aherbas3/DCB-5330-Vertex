#!/bin/bash
# fix-bundling.sh
# Script to fix React Native bundling issues

echo "🔧 Fixing React Native bundling issues..."

# Clear all caches
echo "📦 Clearing Metro cache..."
npx expo start --clear

echo "🗑️ Removing cache directories..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

echo "🧹 Clearing watchman..."
watchman watch-del-all 2>/dev/null || true

echo "📱 Resetting Metro bundler cache..."
npx react-native start --reset-cache 2>/dev/null || true

echo "🔄 Installing babel-plugin-module-resolver if not present..."
npm ls babel-plugin-module-resolver || npm install --save-dev babel-plugin-module-resolver

echo "✅ Cache cleared! Now try running your project with:"
echo "   npx expo start --web"
echo "   or"
echo "   npx expo start --clear"