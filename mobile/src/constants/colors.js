export const COLORS = {
  primary: '#2563EB',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  error: '#EF4444',
  offlineBanner: '#F59E0B',

  EMERGENCY: '#DC2626',
  URGENT: '#D97706',
  MONITOR: '#2563EB',
  SAFE: '#16A34A',
  UNDETERMINED: '#6B7280',
};

export const URGENCY_CONFIG = {
  EMERGENCY: {
    color: COLORS.EMERGENCY,
    icon: '⚠',
    message: 'Seek emergency veterinary care immediately',
  },
  URGENT: {
    color: COLORS.URGENT,
    icon: '🕐',
    message: 'See a vet within 24 hours',
  },
  MONITOR: {
    color: COLORS.MONITOR,
    icon: '👁',
    message: 'Watch closely — see a vet if symptoms worsen',
  },
  SAFE: {
    color: COLORS.SAFE,
    icon: '✓',
    message: 'Likely minor — home care advice provided',
  },
  UNDETERMINED: {
    color: COLORS.UNDETERMINED,
    icon: '?',
    message: 'Unable to determine urgency',
  },
};
