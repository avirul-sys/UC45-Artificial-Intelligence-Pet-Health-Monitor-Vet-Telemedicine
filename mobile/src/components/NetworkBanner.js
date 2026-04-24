import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkState } from '../hooks/useNetworkState';

export default function NetworkBanner() {
  const isConnected = useNetworkState();

  if (isConnected) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
