import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { petsAPI, triageAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import NetworkBanner from '../components/NetworkBanner';
import { COLORS, URGENCY_CONFIG } from '../constants/colors';
import { logEvent, Events } from '../utils/analytics';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [pets, setPets] = useState([]);
  const [activePet, setActivePet] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const petsRes = await petsAPI.list();
      setPets(petsRes.data);
      if (petsRes.data.length > 0) setActivePet(petsRes.data[0]);
    } catch {}
    try {
      const histRes = await triageAPI.history(1);
      const items = histRes.data?.items || [];
      setRecentActivity(items.slice(0, 3));
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
    logEvent(Events.SCREEN_VIEW, { screen: 'Home' });
  }, [loadData]);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
  };

  const showNotifications = () => {
    Alert.alert(
      '🔔 Notifications',
      recentActivity.length > 0
        ? `Your last triage was ${new Date(recentActivity[0]?.created_at).toLocaleDateString('en-IN')}. Tap Health history to view details.`
        : 'No new notifications. Submit a symptom check to get started.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <NetworkBanner />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')?.[0] || 'there'} 👋</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={showNotifications} style={styles.bellBtn} accessibilityLabel="Notifications">
              <Text style={styles.bellIcon}>🔔</Text>
              {recentActivity.length > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logout}>Log out</Text>
            </TouchableOpacity>
          </View>
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

        {/* Recent activity feed — FRS MOB-04 */}
        {recentActivity.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            {recentActivity.map((item) => {
              const urgency = URGENCY_CONFIG[item.urgency_tier] || URGENCY_CONFIG.UNDETERMINED;
              const date = new Date(item.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short',
              });
              return (
                <TouchableOpacity
                  key={item.triage_id}
                  style={styles.activityItem}
                  onPress={() => navigation.navigate('Result', { result: item })}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.urgency_tier} result from ${date}`}
                >
                  <View style={[styles.activityBadge, { backgroundColor: urgency.color }]}>
                    <Text style={styles.activityBadgeIcon}>{urgency.icon}</Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTier}>{item.urgency_tier}</Text>
                    <Text style={styles.activityDate}>{item.pet_name} · {date}</Text>
                  </View>
                  <Text style={styles.activityConf}>
                    {Math.round((item.confidence_score || 0) * 100)}%
                  </Text>
                  <Text style={styles.activityChevron}>›</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => navigation.navigate('HealthHistory')}>
              <Text style={styles.viewAllLink}>View all history →</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellBtn: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 22 },
  bellDot: { position: 'absolute', top: 2, right: 2, width: 8, height: 8,
    borderRadius: 4, backgroundColor: COLORS.error },
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
  activityItem: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border },
  activityBadge: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  activityBadgeIcon: { fontSize: 16 },
  activityInfo: { flex: 1 },
  activityTier: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  activityDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  activityConf: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  activityChevron: { fontSize: 18, color: COLORS.textMuted, marginLeft: 4 },
  viewAllLink: { color: COLORS.primary, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 8 },
});
