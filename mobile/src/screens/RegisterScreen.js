import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { authAPI } from '../services/api';
import { COLORS } from '../constants/colors';

function validate(name, email, phone, password, confirm) {
  if (!name.trim()) return 'Full name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (!/^\+?[\d\s-]{7,15}$/.test(phone)) return 'Enter a valid phone number.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  const handleRegister = async () => {
    const err = validate(name, email, phone, password, confirm);
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.register({ name, email, phone, password });
      setUserId(res.data.user_id);
    } catch (e) {
      setError(e.userMessage || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state — FR-01: show reference ID on screen (FRS §3.1)
  if (userId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Account created!</Text>
          <Text style={styles.successBody}>
            Welcome, {name.split(' ')[0]}. Your account has been created successfully.
          </Text>
          <View style={styles.refCard}>
            <Text style={styles.refLabel}>Reference ID</Text>
            <Text style={styles.refId}>{String(userId || '').slice(0, 8).toUpperCase()}</Text>
          </View>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.btnText}>Set up your pet profile →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} placeholder="Jane Smith" value={name} onChangeText={setName} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="jane@example.com" value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Phone number</Text>
        <TextInput style={styles.input} placeholder="+91 98765 43210" value={phone} onChangeText={setPhone}
          keyboardType="phone-pad" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="Min 8 chars, 1 uppercase, 1 number" value={password}
          onChangeText={setPassword} secureTextEntry />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput style={styles.input} placeholder="Repeat password" value={confirm}
          onChangeText={setConfirm} secureTextEntry />

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Register'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 24 },
  successContainer: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  successBody: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  refCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 28, width: '100%' },
  refLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 6 },
  refId: { fontSize: 22, fontWeight: '700', color: COLORS.primary, letterSpacing: 2 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 14,
    backgroundColor: COLORS.surface, fontSize: 15 },
  error: { backgroundColor: '#FEE2E2', color: COLORS.error, padding: 12, borderRadius: 8,
    marginBottom: 14, fontSize: 14 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', minHeight: 52, marginTop: 8, width: '100%' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  link: { color: COLORS.primary, textAlign: 'center', fontSize: 15, marginTop: 16 },
});
