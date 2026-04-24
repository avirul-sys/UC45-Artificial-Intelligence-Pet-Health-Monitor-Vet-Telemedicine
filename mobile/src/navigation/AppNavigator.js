import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';

import OnboardingScreen from '../screens/OnboardingScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import PetProfileScreen from '../screens/PetProfileScreen';
import SymptomInputScreen from '../screens/SymptomInputScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import ResultScreen from '../screens/ResultScreen';
import FallbackScreen from '../screens/FallbackScreen';
import VetBookingScreen from '../screens/VetBookingScreen';
import VetCallScreen from '../screens/VetCallScreen';
import HealthHistoryScreen from '../screens/HealthHistoryScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: '600' },
  headerBackTitleVisible: false,
};

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions} initialRouteName={user ? 'Home' : 'Onboarding'}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log in' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PetProfile" component={PetProfileScreen} options={{ title: 'Pet profile' }} />
        <Stack.Screen name="SymptomInput" component={SymptomInputScreen} options={{ title: 'Symptom checker' }} />
        <Stack.Screen name="Processing" component={ProcessingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Triage result' }} />
        <Stack.Screen name="Fallback" component={FallbackScreen} options={{ title: 'Unable to determine' }} />
        <Stack.Screen name="VetBooking" component={VetBookingScreen} options={{ title: 'Book a vet' }} />
        <Stack.Screen name="VetCall" component={VetCallScreen} options={{ headerShown: false }} />
        <Stack.Screen name="HealthHistory" component={HealthHistoryScreen} options={{ title: 'Health history' }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset password' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
