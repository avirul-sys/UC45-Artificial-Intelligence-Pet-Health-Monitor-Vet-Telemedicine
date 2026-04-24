import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://10.0.2.2:8000/api/v1'; // Android emulator; use device IP for physical device

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Decode JWT expiry without a library
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // ms
  } catch {
    return 0;
  }
}

// Proactive refresh: silently refresh when < 15 minutes before expiry (FRS §5.1.4)
async function maybeRefreshProactively() {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return;
    const expiry = getTokenExpiry(token);
    const fifteenMin = 15 * 60 * 1000;
    if (expiry && Date.now() > expiry - fifteenMin) {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) return;
      const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
      await SecureStore.setItemAsync('access_token', res.data.access_token);
      await SecureStore.setItemAsync('refresh_token', res.data.refresh_token);
    }
  } catch {
    // Silent — reactive refresh on 401 is the fallback
  }
}

api.interceptors.request.use(async (config) => {
  await maybeRefreshProactively();
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401) {
      // Reactive refresh on 401 (FRS §5.1.4 — "Session expired" fallback)
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          await SecureStore.setItemAsync('access_token', res.data.access_token);
          await SecureStore.setItemAsync('refresh_token', res.data.refresh_token);
          error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api.request(error.config);
        }
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_data');
      }
    }
    return Promise.reject(mapError(error));
  }
);

function mapError(error) {
  const status = error.response?.status;
  const messages = {
    401: 'Session expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Something went wrong on our end. Please try again in a moment.',
  };
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    error.userMessage = 'This is taking longer than expected. Please check your connection.';
  } else {
    error.userMessage = messages[status] || 'An unexpected error occurred.';
  }
  return error;
}

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

export const petsAPI = {
  list: () => api.get('/pets'),
  create: (data) => api.post('/pets', data),
  update: (petId, data) => api.put(`/pets/${petId}`, data),
};

export const triageAPI = {
  submit: (formData) =>
    api.post('/triage', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 }),
  getById: (triageId) => api.get(`/triage/${triageId}`),
  history: (page = 1) => api.get(`/triage/history?page=${page}`),
};

export const callsAPI = {
  initiate: (petId, triageId) => api.post('/calls/initiate', { pet_id: petId, triage_id: triageId }),
  end: (callId) => api.put(`/calls/${callId}/end`),
  rate: (callId, rating, callNote = null) =>
    api.put(`/calls/${callId}/rate`, { rating, call_note: callNote }),
};
