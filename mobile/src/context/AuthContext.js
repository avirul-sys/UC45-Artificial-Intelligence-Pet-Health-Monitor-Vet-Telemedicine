import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
      setLoading(false);
    })();
  }, []);

  const login = async (accessToken, refreshToken, userData) => {
    await AsyncStorage.multiSet([
      ['access_token', accessToken],
      ['refresh_token', refreshToken],
      ['user_data', JSON.stringify(userData)],
    ]);
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
