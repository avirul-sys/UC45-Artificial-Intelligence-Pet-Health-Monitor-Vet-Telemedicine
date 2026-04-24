import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    (async () => {
      // Check biometric hardware availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);

      // Restore session from secure store
      const token = await SecureStore.getItemAsync('access_token');
      const userData = await SecureStore.getItemAsync('user_data');
      const bioEnabled = await SecureStore.getItemAsync('biometric_enabled');
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
      if (bioEnabled === 'true') setBiometricEnabledState(true);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (accessToken, refreshToken, userData) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_data');
    setUser(null);
  }, []);

  const setBiometricEnabled = useCallback(async (enabled) => {
    await SecureStore.setItemAsync('biometric_enabled', enabled ? 'true' : 'false');
    setBiometricEnabledState(enabled);
  }, []);

  // Returns true if biometric auth succeeds and a stored session exists
  const loginWithBiometric = useCallback(async () => {
    const token = await SecureStore.getItemAsync('access_token');
    const userData = await SecureStore.getItemAsync('user_data');
    if (!token || !userData) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Log in to AI Pet Health Monitor',
      fallbackLabel: 'Use password',
      cancelLabel: 'Cancel',
    });
    if (result.success) {
      setUser(JSON.parse(userData));
      return true;
    }
    return false;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      biometricAvailable, biometricEnabled,
      setBiometricEnabled, loginWithBiometric,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
