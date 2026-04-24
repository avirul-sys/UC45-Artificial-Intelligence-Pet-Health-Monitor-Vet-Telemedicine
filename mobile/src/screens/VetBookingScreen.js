import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { callsAPI } from '../services/api';
import NetworkBanner from '../components/NetworkBanner';
import { COLORS } from '../constants/colors';

const MOCK_VETS = [
  { id: 'vet_1', name: 'Dr. Priya Mehta', specialty: 'Dogs & Cats', rating: 4.9, nextSlot: '2:30 PM Today' },
  { id: 'vet_2', name: 'Dr. Rohan Sharma', specialty: 'All species', rating: 4.7, nextSlot: '4:00 PM Today' },
  { id: 'vet_3', name: 'Dr. Ananya Iyer', specialty: 'Birds & Exotic', rating: 4.8, nextSlot: '9:00 AM Tomorrow' },
];

export default function VetBookingScreen({ navigation, route }) {
  const triageId = route.params?.triageId;
  const petId = route.params?.petId;
  const [vets] = useState(MOCK_VETS);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await callsAPI.initiate(petId, triageId);
      navigation.navigate('VetCall', {
        callId: res.data.call_id,
        peerId: res.data.peer_id,
        signalingToken: res.data.signalling_token,
        vetName: selected.name,
      });
    } catch (e) {
      setError(e.userMessage || 'Failed to initiate call. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <NetworkBanner />
      <View style={styles.container}>
        <Text style={styles.title}>Book a vet</Text>
        <Text style={styles.subtitle}>Select a veterinarian and confirm your booking</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          data={vets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.vetCard, selected?.id === item.id && styles.vetCardSelected]}
              onPress={() => setSelected(item)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.name}`}
            >
              <View style={styles.vetAvatar}>
                <Text style={styles.vetAvatarText}>{item.name.split(' ').map((n) => n[0]).join('')}</Text>
              </View>
              <View style={styles.vetInfo}>
                <Text style={styles.vetName}>{item.name}</Text>
                <Text style={styles.vetSpecialty}>{item.specialty}</Text>
                <View style={styles.vetMeta}>
                  <Text style={styles.vetRating}>⭐ {item.rating}</Text>
                  <Text style={styles.vetSlot}>🕐 {item.nextSlot}</Text>
                </View>
              </View>
              {selected?.id === item.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          )}
          style={styles.list}
        />

        <TouchableOpacity
          style={[styles.btnPrimary, (!selected || loading) && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={!selected || loading}
          accessibilityLabel="Confirm booking"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>
              {selected ? `Confirm booking with ${selected.name}` : 'Select a vet to continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20 },
  error: { backgroundColor: '#FEE2E2', color: COLORS.error, padding: 12,
    borderRadius: 8, marginBottom: 12, fontSize: 14 },
  list: { flex: 1 },
  vetCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12,
    borderWidth: 2, borderColor: COLORS.border },
  vetCardSelected: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  vetAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center' },
  vetAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  vetInfo: { flex: 1 },
  vetName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  vetSpecialty: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  vetMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  vetRating: { fontSize: 13, color: COLORS.text },
  vetSlot: { fontSize: 13, color: COLORS.text },
  checkmark: { fontSize: 22, color: COLORS.primary, fontWeight: '700' },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', minHeight: 52 },
  btnDisabled: { backgroundColor: '#9CA3AF' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
