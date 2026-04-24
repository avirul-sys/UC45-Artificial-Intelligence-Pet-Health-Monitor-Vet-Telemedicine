import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/colors';

const STEPS = [
  'Analysing your description...',
  'Examining the photo...',
  'Checking breed risk profile...',
  'Calculating urgency...',
];

export default function ProcessingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.Text style={[styles.icon, { transform: [{ scale: pulse }] }]}>🔬</Animated.Text>
      <Text style={styles.title}>Artificial Intelligence (AI) Analysis</Text>
      <Text style={styles.subtitle}>Please wait — estimated time under 5 seconds</Text>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.step}>
            <Text style={[styles.stepDot, i <= currentStep && styles.stepDotActive]}>
              {i < currentStep ? '✓' : i === currentStep ? '●' : '○'}
            </Text>
            <Text style={[styles.stepText, i === currentStep && styles.stepTextActive]}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center',
    alignItems: 'center', padding: 32 },
  icon: { fontSize: 56, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 40, textAlign: 'center' },
  steps: { width: '100%', gap: 16 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: { fontSize: 18, color: COLORS.border, width: 24 },
  stepDotActive: { color: COLORS.primary },
  stepText: { fontSize: 15, color: COLORS.textMuted },
  stepTextActive: { color: COLORS.text, fontWeight: '600' },
});
