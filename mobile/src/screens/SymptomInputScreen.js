import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, ScrollView,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { triageAPI } from '../services/api';
import { compressImage, MAX_IMAGE_SIZE_BYTES } from '../utils/imageUtils';
import NetworkBanner from '../components/NetworkBanner';
import { useNetworkState } from '../hooks/useNetworkState';
import { COLORS } from '../constants/colors';

export default function SymptomInputScreen({ navigation, route }) {
  const petId = route.params?.petId;
  const isConnected = useNetworkState();
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');

  const canSubmit = description.length >= 20 && description.length <= 500 && isConnected;

  const pickPhoto = async (useCamera) => {
    const launch = useCamera ? launchCamera : launchImageLibrary;
    launch({ mediaType: 'photo' }, async (response) => {
      if (response.didCancel || !response.assets?.[0]) return;
      const asset = response.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE_BYTES) {
        setError(`Image too large. Please use a photo under 5 MB.`);
        return;
      }
      if (photos.length >= 3) return;
      setPhotos((prev) => [...prev, asset]);
      setError('');
    });
  };

  const removePhoto = (index) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError('');
    navigation.navigate('Processing');

    try {
      const formData = new FormData();
      formData.append('pet_id', petId || 'pet_1');
      formData.append('description', description);

      if (photos.length > 0) {
        try {
          const compressed = await compressImage(photos[0]);
          formData.append('image', { uri: compressed.uri, type: compressed.type, name: compressed.name });
        } catch (imgErr) {
          formData.append('image', {
            uri: photos[0].uri,
            type: photos[0].type || 'image/jpeg',
            name: photos[0].fileName || 'symptom.jpg',
          });
        }
      }

      const response = await triageAPI.submit(formData);
      if (response.data.fallback_triggered) {
        navigation.replace('Fallback', { result: response.data });
      } else {
        navigation.replace('Result', { result: response.data });
      }
    } catch (e) {
      navigation.goBack();
      Alert.alert('Analysis failed', e.userMessage || 'Please check your connection and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <NetworkBanner />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Symptom checker</Text>
        <Text style={styles.instruction}>
          Describe what you have noticed. The more detail you provide, the more accurate the result.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={[styles.textarea, description.length > 500 && styles.textareaError]}
          placeholder="e.g. limping on left front leg since this morning, not bearing weight"
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
          maxLength={520}
        />
        <Text style={[styles.counter, description.length > 500 && styles.counterError]}>
          {description.length} / 500
        </Text>

        <Text style={styles.sectionLabel}>Add a photo for best results (optional)</Text>
        <View style={styles.photoRow}>
          {[0, 1, 2].map((i) => (
            <TouchableOpacity
              key={i}
              style={styles.photoSlot}
              onPress={() => photos[i] ? removePhoto(i) : pickPhoto(i === 0)}
            >
              {photos[i] ? (
                <>
                  <Image source={{ uri: photos[i].uri }} style={styles.thumbnail} />
                  <View style={styles.deleteOverlay}><Text style={styles.deleteIcon}>✕</Text></View>
                </>
              ) : (
                <Text style={styles.photoIcon}>{i === 0 ? '📷' : '🖼'}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {photos.length > 0 && (
          <Text style={styles.photoHint}>
            Tip: ensure the area is well-lit and in focus for accurate analysis.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.btnPrimary, !canSubmit && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityLabel="Analyse symptoms"
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>Analyse symptoms</Text>
        </TouchableOpacity>

        {photos.length === 0 && description.length >= 20 && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'No photo added',
                'Adding a photo significantly improves accuracy. Continue without photo?',
                [{ text: 'Cancel' }, { text: 'Continue', onPress: handleSubmit }]
              )
            }
          >
            <Text style={styles.withoutPhoto}>Analyse without photo</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          Artificial Intelligence (AI)-generated results are not a substitute for professional veterinary diagnosis.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  instruction: { fontSize: 14, color: COLORS.textMuted, marginBottom: 16, lineHeight: 20 },
  error: { backgroundColor: '#FEE2E2', color: COLORS.error, padding: 12,
    borderRadius: 8, marginBottom: 12, fontSize: 14 },
  textarea: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12,
    backgroundColor: COLORS.surface, fontSize: 15, textAlignVertical: 'top',
    minHeight: 120, marginBottom: 4 },
  textareaError: { borderColor: COLORS.error },
  counter: { textAlign: 'right', fontSize: 12, color: COLORS.textMuted, marginBottom: 16 },
  counterError: { color: COLORS.error },
  sectionLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 10 },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  photoSlot: { flex: 1, aspectRatio: 1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, backgroundColor: COLORS.surface, justifyContent: 'center',
    alignItems: 'center', overflow: 'hidden' },
  photoIcon: { fontSize: 28 },
  thumbnail: { width: '100%', height: '100%' },
  deleteOverlay: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  deleteIcon: { color: '#FFFFFF', fontSize: 12 },
  photoHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 16, fontStyle: 'italic' },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', minHeight: 52 },
  btnDisabled: { backgroundColor: '#9CA3AF' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  withoutPhoto: { color: COLORS.primary, textAlign: 'center', marginTop: 12, fontSize: 14 },
  disclaimer: { marginTop: 20, fontSize: 11, color: COLORS.textMuted, textAlign: 'center',
    lineHeight: 16 },
});
