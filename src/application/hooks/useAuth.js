import { useState, useEffect, useCallback } from 'react';
import { logout } from '../../infrastructure/api';
import { hasAuthCookie } from '../../infrastructure/utils/cookieUtils';

/**
 * Custom hook quản lý trạng thái xác thực và đồng bộ localStorage
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useState(() => {
    // Nếu không có cookie thì chắc chắn ở trạng thái khách
    if (!hasAuthCookie()) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('kiemjob_user');
        localStorage.removeItem('kiemjob_token');
      }
      return null;
    }
    try {
      const stored = localStorage.getItem('kiemjob_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(null);

  useEffect(() => {
    const handleAuthSync = () => {
      if (!hasAuthCookie()) {
        localStorage.removeItem('kiemjob_user');
        localStorage.removeItem('kiemjob_token');
        setCurrentUser(null);
        setToken(null);
        return;
      }
      try {
        const storedUser = localStorage.getItem('kiemjob_user');
        setCurrentUser(storedUser ? JSON.parse(storedUser) : null);
        setToken(null);
      } catch {
        setCurrentUser(null);
        setToken(null);
      }
    };

    window.addEventListener('authChange', handleAuthSync);
    window.addEventListener('storage', handleAuthSync);
    return () => {
      window.removeEventListener('authChange', handleAuthSync);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, []);

  const loginUser = useCallback((user) => {
    localStorage.removeItem('kiemjob_token');
    if (user) localStorage.setItem('kiemjob_user', JSON.stringify(user));
    setCurrentUser(user);
    setToken(null);
    window.dispatchEvent(new Event('authChange'));
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout error in useAuth:', err);
    }
    setCurrentUser(null);
    setToken(null);
  }, []);

  return {
    currentUser,
    token,
    isAuthenticated: Boolean(currentUser),
    role: currentUser?.role || null,
    login: loginUser,
    logout: logoutUser,
  };
}

export default useAuth;
