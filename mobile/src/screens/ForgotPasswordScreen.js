import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { authAPI } from '../services/api';
import { COLORS } from '../constants/colors';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setSent(true);
    } catch {
      // Always show success per FRS FR-05 (prevents email enumeration)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.icon}>📧</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>
            If that email address is registered, a password reset link has been sent. The link
            expires after 30 minutes.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.btnText}>Back to log in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.body}>
          Enter your email address and we will send you a reset link.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          placeholder="jane@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send reset link'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back to log in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  icon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  body: { fontSize: 15, color: COLORS.textMuted, marginBottom: 24, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12,
    marginBottom: 20, backgroundColor: COLORS.surface, fontSize: 15 },
  error: { backgroundColor: '#FEE2E2', color: COLORS.error, padding: 12,
    borderRadius: 8, marginBottom: 14, fontSize: 14 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', minHeight: 52 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  link: { color: COLORS.primary, textAlign: 'center', fontSize: 15, marginTop: 16 },
});
