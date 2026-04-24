import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Switch,
} from 'react-native';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import { logEvent, Events } from '../utils/analytics';

export default function LoginScreen({ navigation }) {
  const { login, biometricAvailable, biometricEnabled, setBiometricEnabled, loginWithBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBiometricToggle, setShowBiometricToggle] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      await login(res.data.access_token, res.data.refresh_token, res.data.user);
      setShowBiometricToggle(biometricAvailable);
      if (!biometricAvailable) {
        logEvent(Events.SCREEN_VIEW, { screen: 'Home' });
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
    } catch (e) {
      setError(e.userMessage || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    const success = await loginWithBiometric();
    if (success) {
      logEvent(Events.SCREEN_VIEW, { screen: 'Home' });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      setError('Biometric authentication failed. Please use your password.');
    }
  };

  const handleBiometricToggle = async (value) => {
    await setBiometricEnabled(value);
    if (!value || (value && biometricAvailable)) {
      logEvent(Events.SCREEN_VIEW, { screen: 'Home' });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  };

  // Show biometric enroll prompt if available but not yet set up for this account
  if (showBiometricToggle) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Enable biometric login?</Text>
          <Text style={styles.subtitle}>
            Use fingerprint or Face ID to log in faster next time. You can change this in settings.
          </Text>
          <View style={styles.biometricCard}>
            <Text style={styles.biometricIcon}>🔐</Text>
            <Text style={styles.biometricLabel}>Biometric authentication</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => {
            logEvent(Events.SCREEN_VIEW, { screen: 'Home' });
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          }}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Log in</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="jane@example.com" value={email}
          onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="Your password" value={password}
          onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Logging in...' : 'Log in'}</Text>
        </TouchableOpacity>

        {biometricAvailable && biometricEnabled && (
          <TouchableOpacity style={styles.btnBiometric} onPress={handleBiometricLogin}>
            <Text style={styles.btnBiometricText}>🔐 Use biometric login</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Need an account? Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 14,
    backgroundColor: COLORS.surface, fontSize: 15 },
  error: { backgroundColor: '#FEE2E2', color: COLORS.error, padding: 12, borderRadius: 8,
    marginBottom: 14, fontSize: 14 },
  forgot: { color: COLORS.primary, textAlign: 'right', marginBottom: 20, fontSize: 14 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', minHeight: 52 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  btnBiometric: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 12 },
  btnBiometricText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  link: { color: COLORS.primary, textAlign: 'center', fontSize: 15, marginTop: 16 },
  biometricCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row',
    alignItems: 'center', marginBottom: 24 },
  biometricIcon: { fontSize: 28, marginRight: 12 },
  biometricLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
});
