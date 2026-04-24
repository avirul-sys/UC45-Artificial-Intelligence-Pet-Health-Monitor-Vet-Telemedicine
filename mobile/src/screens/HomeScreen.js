import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { petsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import NetworkBanner from '../components/NetworkBanner';
import { COLORS } from '../constants/colors';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [pets, setPets] = useState([]);
  const [activePet, setActivePet] = useState(null);

  useEffect(() => {
    petsAPI.list()
      .then((res) => {
        setPets(res.data);
        if (res.data.length > 0) setActivePet(res.data[0]);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <NetworkBanner />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'} 👋</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logout}>Log out</Text>
          </TouchableOpacity>
        </View>

        {activePet ? (
          <View style={styles.petCard}>
            <Text style={styles.petName}>{activePet.name}</Text>
            <Text style={styles.petMeta}>{activePet.breed} · {activePet.species}</Text>
            <Text style={styles.petMeta}>{activePet.age_months} months · {activePet.weight_kg} kg</Text>
          </View>
        ) : (
          <View style={styles.noPetCard}>
            <Text style={styles.noPetText}>No pet profile yet. Add one to get started.</Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('PetProfile')}>
              <Text style={styles.btnSecondaryText}>Add a pet</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick actions</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('SymptomInput', { petId: activePet?.id })}
          disabled={!activePet}
        >
          <Text style={styles.actionIcon}>🔍</Text>
          <View>
            <Text style={styles.actionTitle}>Check symptoms</Text>
            <Text style={styles.actionDesc}>Get an Artificial Intelligence (AI) triage result in seconds</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('VetBooking', { petId: activePet?.id })}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <View>
            <Text style={styles.actionTitle}>Book a vet</Text>
            <Text style={styles.actionDesc}>Browse available veterinarians and book a slot</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('HealthHistory')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <View>
            <Text style={styles.actionTitle}>Health history</Text>
            <Text style={styles.actionDesc}>View past triage results and vet consultations</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardOutline]}
          onPress={() => navigation.navigate('PetProfile', { pet: activePet })}
        >
          <Text style={styles.actionIcon}>🐾</Text>
          <View>
            <Text style={styles.actionTitle}>{activePet ? 'Edit pet profile' : 'Add pet profile'}</Text>
            <Text style={styles.actionDesc}>Manage your pet's details and breed information</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  logout: { color: COLORS.textMuted, fontSize: 14 },
  petCard: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 20, marginBottom: 24 },
  petName: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  petMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 2 },
  noPetCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
  noPetText: { color: COLORS.textMuted, fontSize: 15, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  actionCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border },
  actionCardOutline: { borderStyle: 'dashed' },
  actionIcon: { fontSize: 28 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  actionDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  btnSecondary: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8,
    padding: 12, alignItems: 'center' },
  btnSecondaryText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
});
