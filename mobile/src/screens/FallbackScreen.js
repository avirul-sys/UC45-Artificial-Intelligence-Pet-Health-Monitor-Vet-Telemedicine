import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/colors';

export default function FallbackScreen({ navigation, route }) {
  const triageId = route.params?.result?.triage_id;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.icon}>🤔</Text>
        <Text style={styles.title}>Unable to determine</Text>
        <Text style={styles.body}>
          Our Artificial Intelligence (AI) could not assess this with sufficient confidence. Please
          provide a clearer photo or connect with a qualified veterinarian.
        </Text>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('VetBooking', { triageId })}
          accessibilityLabel="Talk to a vet"
          accessibilityRole="button"
        >
          <Text style={styles.btnPrimaryText}>Talk to a vet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('SymptomInput')}
          accessibilityLabel="Retry with better details"
          accessibilityRole="button"
        >
          <Text style={styles.btnSecondaryText}>Retry with better details</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.link}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 32, justifyContent: 'center' },
  icon: { fontSize: 56, textAlign: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', minHeight: 52, marginBottom: 12 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  btnSecondary: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10,
    padding: 16, alignItems: 'center', minHeight: 52, marginBottom: 12 },
  btnSecondaryText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  link: { color: COLORS.textMuted, textAlign: 'center', fontSize: 14, marginTop: 8 },
});
