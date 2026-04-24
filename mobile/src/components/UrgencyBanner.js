import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { URGENCY_CONFIG } from '../constants/colors';

export default function UrgencyBanner({ urgencyTier }) {
  const config = URGENCY_CONFIG[urgencyTier] || URGENCY_CONFIG.UNDETERMINED;

  return (
    <View style={[styles.banner, { backgroundColor: config.color }]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={styles.tier}>{urgencyTier}</Text>
      <Text style={styles.message}>{config.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    marginBottom: 4,
  },
  tier: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
  },
});
