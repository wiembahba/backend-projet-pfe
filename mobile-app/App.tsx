import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  // انتظر لحد ما يتحمل الخط
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0f1e', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#185FA5" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}