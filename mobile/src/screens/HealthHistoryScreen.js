import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { triageAPI } from '../services/api';
import NetworkBanner from '../components/NetworkBanner';
import { COLORS, URGENCY_CONFIG } from '../constants/colors';

export default function HealthHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadHistory(1);
  }, []);

  const loadHistory = async (p) => {
    setLoading(true);
    try {
      const res = await triageAPI.history(p);
      const items = res.data.items || res.data || [];
      setHistory((prev) => p === 1 ? items : [...prev, ...items]);
      setHasMore(items.length === 20);
      setPage(p);
    } catch (e) {
      setError(e.userMessage || 'Failed to load health history.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const urgency = URGENCY_CONFIG[item.urgency_tier] || URGENCY_CONFIG.UNDETERMINED;
    const date = new Date(item.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const time = new Date(item.created_at).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Result', { result: item })}
        accessibilityRole="button"
        accessibilityLabel={`View triage result from ${date}`}
      >
        <View style={[styles.urgencyBadge, { backgroundColor: urgency.color }]}>
          <Text style={styles.urgencyIcon}>{urgency.icon}</Text>
          <Text style={styles.urgencyText}>{item.urgency_tier}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.petName}>{item.pet_name || 'Pet'}</Text>
          <Text style={styles.date}>{date} · {time}</Text>
          {item.fallback_triggered && (
            <Text style={styles.fallbackTag}>Low confidence — vet recommended</Text>
          )}
        </View>

        <View style={styles.right}>
          <Text style={styles.confidence}>{Math.round((item.confidence_score || 0) * 100)}%</Text>
          <Text style={styles.confidenceLabel}>confidence</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <NetworkBanner />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <NetworkBanner />
      <View style={styles.container}>
        <Text style={styles.title}>Health history</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No triage history yet.</Text>
            <Text style={styles.emptySubtext}>
              Your past symptom checks and vet consultations will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.triage_id || item.id}
            renderItem={renderItem}
            onEndReached={() => hasMore && loadHistory(page + 1)}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loading && page > 1 ? (
                <ActivityIndicator color={COLORS.primary} style={{ padding: 16 }} />
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  error: { backgroundColor: '#FEE2E2', color: COLORS.error, padding: 12,
    borderRadius: 8, marginBottom: 12, fontSize: 14 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border },
  urgencyBadge: { borderRadius: 8, padding: 8, alignItems: 'center', minWidth: 64 },
  urgencyIcon: { fontSize: 18 },
  urgencyText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', marginTop: 2 },
  info: { flex: 1 },
  petName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  date: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  fallbackTag: { fontSize: 11, color: COLORS.URGENT, marginTop: 4, fontStyle: 'italic' },
  right: { alignItems: 'flex-end' },
  confidence: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  confidenceLabel: { fontSize: 11, color: COLORS.textMuted },
  chevron: { fontSize: 22, color: COLORS.textMuted, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
