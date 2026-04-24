import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { petsAPI } from '../services/api';
import NetworkBanner from '../components/NetworkBanner';
import { COLORS } from '../constants/colors';

const SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'other'];
const CONDITIONS = ['diabetes', 'arthritis', 'heart disease', 'kidney disease', 'allergies', 'epilepsy'];

export default function PetProfileScreen({ navigation, route }) {
  const existing = route.params?.pet;
  const [name, setName] = useState(existing?.name || '');
  const [species, setSpecies] = useState(existing?.species || '');
  const [breed, setBreed] = useState(existing?.breed || '');
  const [age, setAge] = useState(existing?.age_months?.toString() || '');
  const [weight, setWeight] = useState(existing?.weight_kg?.toString() || '');
  const [conditions, setConditions] = useState(existing?.conditions || []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleCondition = (c) =>
    setConditions((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleSave = async () => {
    if (!name.trim() || !species || !breed.trim()) {
      setError('Name, species, and breed are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        species,
        breed: breed.trim(),
        age_months: parseInt(age) || 0,
        weight_kg: parseFloat(weight) || 0,
        conditions,
      };
      if (existing?.id) {
        await petsAPI.update(existing.id, payload);
      } else {
        await petsAPI.create(payload);
      }
      navigation.navigate('Home');
    } catch (e) {
      setError(e.userMessage || 'Failed to save pet profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <NetworkBanner />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{existing ? 'Edit pet profile' : 'Add pet profile'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Pet name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Max" value={name} onChangeText={setName} />

        <Text style={styles.label}>Species *</Text>
        <View style={styles.chipRow}>
          {SPECIES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, species === s && styles.chipActive]}
              onPress={() => setSpecies(s)}
            >
              <Text style={[styles.chipText, species === s && styles.chipTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Breed *</Text>
        <TextInput style={styles.input} placeholder="e.g. Labrador Retriever" value={breed}
          onChangeText={setBreed} />

        <Text style={styles.label}>Age (months)</Text>
        <TextInput style={styles.input} placeholder="e.g. 24" value={age}
          onChangeText={setAge} keyboardType="numeric" />

        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput style={styles.input} placeholder="e.g. 12.5" value={weight}
          onChangeText={setWeight} keyboardType="numeric" />

        <Text style={styles.label}>Pre-existing conditions</Text>
        <View style={styles.chipRow}>
          {CONDITIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, conditions.includes(c) && styles.chipActive]}
              onPress={() => toggleCondition(c)}
            >
              <Text style={[styles.chipText, conditions.includes(c) && styles.chipTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Saving...' : 'Save pet profile'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12,
    marginBottom: 14, backgroundColor: COLORS.surface, fontSize: 15 },
  error: { backgroundColor: '#FEE2E2', color: COLORS.error, padding: 12,
    borderRadius: 8, marginBottom: 14, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.text, fontSize: 14 },
  chipTextActive: { color: '#FFFFFF' },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', minHeight: 52, marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
