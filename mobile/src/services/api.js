import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://10.0.2.2:8000/api/v1'; // Android emulator; use your IP for physical device

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
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
      // Try silent refresh
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          await AsyncStorage.setItem('access_token', res.data.access_token);
          error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api.request(error.config);
        }
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
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
};
