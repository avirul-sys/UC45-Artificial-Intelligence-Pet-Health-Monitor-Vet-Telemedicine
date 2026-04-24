import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function ConfidenceBar({ score }) {
  const pct = Math.round((score || 0) * 100);
  const barColor = score >= 0.6 ? COLORS.SAFE : COLORS.URGENT;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Artificial Intelligence (AI) confidence</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.pct}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  track: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  pct: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },
});
