import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../../infrastructure/api/notificationApi';
import { webSocketService } from '../../infrastructure/websocket/WebSocketService';
import { hasAuthCookie } from '../../infrastructure/utils/cookieUtils';
import { USER } from '../../config/storageKeys';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  // Cập nhật người dùng khi storage thay đổi
  useEffect(() => {
    const syncUser = () => {
      try {
        const raw = localStorage.getItem(USER);
        setCurrentUser(raw ? JSON.parse(raw) : null);
      } catch {
        setCurrentUser(null);
      }
    };

    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  // Lấy số lượng thông báo chưa đọc
  const fetchUnreadCount = useCallback(async () => {
    if (!currentUser && !hasAuthCookie()) return;
    try {
      const res = await notificationApi.getUnreadCount();
      if (res && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.warn('[NotificationContext] Lỗi lấy số thông báo chưa đọc:', err);
    }
  }, [currentUser]);

  // Lấy danh sách thông báo
  const fetchNotifications = useCallback(async (page = 0, size = 10) => {
    if (!currentUser && !hasAuthCookie()) return;
    try {
      setLoading(true);
      const res = await notificationApi.getMyNotifications({ page, size });
      if (res && Array.isArray(res.content)) {
        setNotifications(res.content);
      } else if (Array.isArray(res)) {
        setNotifications(res);
      }
    } catch (err) {
      console.warn('[NotificationContext] Lỗi lấy danh sách thông báo:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Tải dữ liệu ban đầu khi đã đăng nhập
  useEffect(() => {
    if (currentUser || hasAuthCookie()) {
      fetchUnreadCount();
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser, fetchUnreadCount, fetchNotifications]);

  // Đăng ký nhận thông báo realtime qua WebSocket STOMP
  useEffect(() => {
    if (!currentUser && !hasAuthCookie()) return;

    webSocketService.connect().catch(() => {});

    const unsubscribe = webSocketService.subscribeToNotifications((newNotif) => {
      console.log('[NotificationContext] Nhận thông báo chuông realtime:', newNotif);
      if (!newNotif || !newNotif.id) return;

      // 1. Tăng số đếm chưa đọc
      setUnreadCount((prev) => prev + 1);

      // 2. Nối thông báo mới vào đầu danh sách
      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.id !== newNotif.id);
        return [newNotif, ...filtered];
      });

      // 3. Hiển thị popup Toast nổi góc màn hình
      setActiveToast(newNotif);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Tự động tắt Toast sau 6 giây
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  // Đánh dấu 1 thông báo đã đọc
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationContext] Lỗi đánh dấu đã đọc:', err);
    }
  }, []);

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] Lỗi đánh dấu tất cả đã đọc:', err);
    }
  }, []);

  // Xóa thông báo
  const deleteNotification = useCallback(async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target && !target.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch (err) {
      console.error('[NotificationContext] Lỗi xóa thông báo:', err);
    }
  }, []);

  const value = {
    currentUser,
    notifications,
    unreadCount,
    loading,
    activeToast,
    dismissToast,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      activeToast: null,
      dismissToast: () => {},
      fetchNotifications: () => {},
      fetchUnreadCount: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      deleteNotification: () => {},
    };
  }
  return context;
}
