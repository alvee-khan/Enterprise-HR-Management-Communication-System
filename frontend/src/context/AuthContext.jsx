import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
  });

  // Attach token to all requests
  api.interceptors.request.use((config) => {
    const t = localStorage.getItem('accessToken');
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
  });

  // Handle 401 responses
  api.interceptors.response.use(
    (res) => res,
    async (error) => {
      const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
                             originalRequest?.url?.includes('/auth/register') ||
                             originalRequest?.url?.includes('/auth/refresh');
      if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true;
        try {
          const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          logout();
        }
      }
      return Promise.reject(error);
    }
  );

  const fetchUser = useCallback(async () => {
    const t = localStorage.getItem('accessToken');
    if (!t) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, password, totpCode = null, reset2FA = false) => {
    const { data } = await api.post('/auth/login', { email, password, totpCode, reset2FA });
    if (data?.require2FA || data?.require2FASetup) {
      return data;
    }
    localStorage.setItem('accessToken', data.accessToken);
    setToken(data.accessToken);
    setUser(data.data);
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const hasRole = (...roles) => user && roles.includes(user.role);

  const isHR = () => hasRole('superAdmin', 'companyAdmin', 'hrManager');
  const isManager = () => hasRole('superAdmin', 'companyAdmin', 'hrManager', 'manager');

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout, updateUser, fetchUser,
      hasRole, isHR, isManager,
      api
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
