import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/colors';

const STEPS = [
  {
    title: 'Welcome to UC45',
    desc: 'Artificial Intelligence (AI)-powered pet health triage — know in seconds if your pet needs a vet.',
  },
  {
    title: 'How it works',
    desc: 'Describe symptoms and optionally add a photo. Our AI analyses the input using four specialist modules simultaneously.',
  },
  {
    title: 'Privacy & Safety',
    desc: 'Your data is encrypted. AI results include a confidence score. When confidence is low, a real vet is one tap away.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{STEPS[step].title}</Text>
        <Text style={styles.desc}>{STEPS[step].desc}</Text>
      </View>

      <View style={styles.actions}>
        {step < STEPS.length - 1 ? (
          <>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setStep(step + 1)}>
              <Text style={styles.btnPrimaryText}>Next</Text>
            </TouchableOpacity>
            {step > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.skip}>Skip</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'space-between', padding: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', paddingTop: 16, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },
  content: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  desc: { fontSize: 16, color: COLORS.textMuted, lineHeight: 24 },
  actions: { gap: 12 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10, alignItems: 'center', minHeight: 52 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  skip: { color: COLORS.textMuted, textAlign: 'center', fontSize: 15, padding: 8 },
  link: { color: COLORS.primary, textAlign: 'center', fontSize: 15, padding: 8 },
});
