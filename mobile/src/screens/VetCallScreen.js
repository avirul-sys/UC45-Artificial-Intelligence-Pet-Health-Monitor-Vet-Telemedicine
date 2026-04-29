import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, TextInput,
} from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices } from 'react-native-webrtc';
import { callsAPI } from '../services/api';
import { COLORS } from '../constants/colors';
import { logEvent, Events } from '../utils/analytics';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export default function VetCallScreen({ navigation, route }) {
  const { callId, vetName = 'your vet' } = route.params || {};
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pc = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    startLocalStream();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    logEvent(Events.VET_CALL_INITIATED, { has_call_id: !!callId });
    return () => {
      cleanup();
      clearInterval(timerRef.current);
    };
  }, []);

  const startLocalStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      pc.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      stream.getTracks().forEach((track) => pc.current.addTrack(track, stream));
      pc.current.ontrack = (event) => {
        if (event.streams?.[0]) setRemoteStream(event.streams[0]);
      };
    } catch (err) {
      Alert.alert(
        'Camera access required',
        'Please allow camera and microphone access for the vet call. You can still use text consultation.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const cleanup = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
  };

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMuted(!muted);
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setCameraOn(!cameraOn);
  };

  const endCall = async () => {
    clearInterval(timerRef.current);
    try {
      if (callId) await callsAPI.end(callId);
    } catch {}
    cleanup();
    setCallEnded(true);
  };

  const submitRating = async () => {
    if (!callId) {
      navigation.navigate('Home');
      return;
    }
    setSubmitting(true);
    try {
      await callsAPI.rate(callId, rating || 0, note.trim() || null);
    } catch {
      // Non-blocking — rating failure should not prevent navigation
    } finally {
      setSubmitting(false);
      navigation.navigate('Home');
    }
  };

  const formatDuration = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (callEnded) {
    return (
      <SafeAreaView style={styles.ratingContainer}>
        <Text style={styles.ratingTitle}>How was your consultation?</Text>
        <Text style={styles.ratingSubtitle}>Rate your session with {vetName}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starBtn}
              accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
              accessibilityRole="button"
            >
              <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.noteInput}
          placeholder="Optional: add a note about this consultation…"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity
          style={[styles.btnPrimary, submitting && styles.btnDisabled]}
          onPress={submitRating}
          disabled={submitting}
        >
          <Text style={styles.btnText}>
            {submitting ? 'Saving...' : rating ? 'Submit rating' : 'Skip'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.videoContainer}>
        {remoteStream ? (
          <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
        ) : (
          <View style={styles.waitingScreen}>
            <Text style={styles.waitingIcon}>👨‍⚕️</Text>
            <Text style={styles.waitingText}>Connecting to {vetName}...</Text>
          </View>
        )}
        {localStream && (
          <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" />
        )}
      </View>

      <View style={styles.controls}>
        <Text style={styles.timer}>{formatDuration(duration)}</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlBtn, muted && styles.controlBtnActive]}
            onPress={toggleMute}
            accessibilityLabel={muted ? 'Unmute' : 'Mute'}
            accessibilityRole="button"
          >
            <Text style={styles.controlIcon}>{muted ? '🔇' : '🎙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.endCallBtn}
            onPress={endCall}
            accessibilityLabel="End call"
            accessibilityRole="button"
          >
            <Text style={styles.endCallIcon}>📵</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, !cameraOn && styles.controlBtnActive]}
            onPress={toggleCamera}
            accessibilityLabel={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            accessibilityRole="button"
          >
            <Text style={styles.controlIcon}>{cameraOn ? '📷' : '🚫'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000000' },
  videoContainer: { flex: 1, position: 'relative' },
  remoteVideo: { flex: 1 },
  localVideo: { position: 'absolute', bottom: 16, right: 16, width: 100, height: 140,
    borderRadius: 8, borderWidth: 2, borderColor: COLORS.surface },
  waitingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  waitingIcon: { fontSize: 64, marginBottom: 16 },
  waitingText: { color: '#FFFFFF', fontSize: 16, textAlign: 'center' },
  controls: { backgroundColor: '#1F2937', paddingVertical: 20, paddingHorizontal: 32 },
  timer: { color: '#FFFFFF', textAlign: 'center', fontSize: 18, fontWeight: '600', marginBottom: 16 },
  controlRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#374151',
    justifyContent: 'center', alignItems: 'center' },
  controlBtnActive: { backgroundColor: '#6B7280' },
  controlIcon: { fontSize: 24 },
  endCallBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#DC2626',
    justifyContent: 'center', alignItems: 'center' },
  endCallIcon: { fontSize: 28 },
  ratingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center',
    alignItems: 'center', padding: 32 },
  ratingTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  ratingSubtitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 28 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  starBtn: { padding: 4, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  star: { fontSize: 40, color: COLORS.border },
  starActive: { color: '#F59E0B' },
  noteInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12,
    backgroundColor: COLORS.surface, fontSize: 14, width: '100%', minHeight: 80,
    textAlignVertical: 'top', marginBottom: 20 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', minWidth: 200 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
