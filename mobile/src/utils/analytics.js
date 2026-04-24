// FRS §5.1.4 — no PII in any analytics event payload
export const Events = {
  SCREEN_VIEW: 'screen_view',
  TRIAGE_SUBMITTED: 'triage_submitted',
  TRIAGE_RESULT_VIEWED: 'triage_result_viewed',
  VET_CALL_INITIATED: 'vet_call_initiated',
};

export function logEvent(name, params = {}) {
  if (__DEV__) {
    console.log('[Analytics]', name, params);
  }
  // Wire to your analytics platform here (Amplitude, Mixpanel, Firebase, etc.)
  // Ensure params never contain email, phone, name, or any PII.
}
