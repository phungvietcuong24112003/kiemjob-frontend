import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { conversationApi } from '../../infrastructure/api/conversationApi';
import { webSocketService } from '../../infrastructure/websocket/WebSocketService';
import { hasAuthCookie } from '../../infrastructure/utils/cookieUtils';
import { USER } from '../../config/storageKeys';
import { ROLES } from '../../domain/constants/roles';
import {
  getNotificationPermission,
  showChatNotification,
  handleEnableNotifications,
} from '../../infrastructure/utils/notificationUtils';

const RecruiterChatContext = createContext(null);

export function formatChatTime(time) {
  if (!time) return 'Mới';
  try {
    const d = new Date(time);
    if (isNaN(d.getTime())) return time;
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return 'Hôm qua';
    }

    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return 'Mới';
  }
}

export function RecruiterChatProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationPermission()
  );

  const enableNotifications = useCallback(async () => {
    return handleEnableNotifications(setNotificationPermission);
  }, []);

  // Dọn dẹp cache tin nhắn cũ của nhà tuyển dụng trong localStorage nếu có
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('kiemjob_recruiter_chat_thread_')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch { }
  }, []);

  // Sync user from localStorage if cookie exists
  const loadUser = useCallback(() => {
    if (!hasAuthCookie()) {
      setCurrentUser(null);
      setConversations([]);
      try {
        webSocketService.disconnect();
      } catch {}
      return;
    }
    try {
      const stored = localStorage.getItem(USER);
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      } else {
        setCurrentUser(null);
        try {
          webSocketService.disconnect();
        } catch {}
      }
    } catch {
      setCurrentUser(null);
      try {
        webSocketService.disconnect();
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadUser();
    window.addEventListener('authChange', loadUser);
    window.addEventListener('storage', loadUser);
    return () => {
      window.removeEventListener('authChange', loadUser);
      window.removeEventListener('storage', loadUser);
    };
  }, [loadUser]);

  const isLoggedIn = Boolean(currentUser);

  // Fetch conversations directly from backend conversationApi (no hardcoding)
  const fetchConversations = useCallback(async () => {
    if (!hasAuthCookie()) {
      setConversations([]);
      return;
    }
    setLoadingConversations(true);
    try {
      const res = await conversationApi.getConversations();
      if (Array.isArray(res)) {
        setConversations(res);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách cuộc trò chuyện từ API:', err);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchConversations();
    } else {
      setConversations([]);
      setIsChatOpen(false);
      setIsMinimized(false);
    }
  }, [isLoggedIn, fetchConversations]);


  // Nhận thông báo tin nhắn mới cho tài khoản Recruiter
  useEffect(() => {
    const role = String(currentUser?.role || '')
      .toLowerCase()
      .replace(/^role_/, '');

    if (
      !isLoggedIn ||
      !currentUser?.email ||
      role !== 'recruiter'
    ) {
      return;
    }

    console.log('[RecruiterChatContext] Đăng ký nhận thông báo qua /user/queue/messages cho:', currentUser.email);

    const unsubscribe = webSocketService.subscribeToUserMessages(
      (newMsg) => {
        console.log('[RecruiterChatContext] Nhận tin nhắn từ /user/queue/messages:', newMsg);
        if (!newMsg?.conversationId || !newMsg?.id) {
          return;
        }

        // Không hiển thị thông báo cho tin nhắn do chính nhà tuyển dụng gửi
        if (newMsg.senderType && String(newMsg.senderType).toLowerCase() === 'recruiter') {
          return;
        }

        const conversationId = newMsg.conversationId;

        // Tìm thông tin người gửi trong danh sách hội thoại
        const conversation = conversations.find(
          (c) => String(c.id) === String(conversationId)
        );

        // Kiểm tra người dùng có đang trực tiếp xem và focus vào cuộc trò chuyện này không
        const isViewingConversation =
          document.visibilityState === 'visible' &&
          document.hasFocus() &&
          isChatOpen &&
          !isMinimized &&
          String(activeConversationId) === String(conversationId);

        console.log('[RecruiterChatContext] isViewingConversation:', isViewingConversation, {
          activeConversationId,
          incomingConversationId: conversationId,
          isChatOpen,
          isMinimized,
          hasFocus: document.hasFocus()
        });

        // Nếu chưa có hội thoại trong danh sách thì tải lại và phát thông báo desktop
        if (!conversation) {
          fetchConversations();
          if (!isViewingConversation) {
            showChatNotification({
              title: 'KiemJob - Tin nhắn mới',
              senderName: 'Ứng viên',
              content: newMsg.content,
              conversationId,
              onClick: () => {
                setActiveConversationId(conversationId);
                setIsChatOpen(true);
                setIsMinimized(false);
              },
            });
          }
          return;
        }

        // Cập nhật danh sách hội thoại và số tin chưa đọc
        setConversations((prev) =>
          prev.map((c) => {
            if (String(c.id) !== String(conversationId)) {
              return c;
            }

            return {
              ...c,
              lastMessage: newMsg.content,
              lastMessageTime: newMsg.createdAt,
              unreadCount: isViewingConversation
                ? 0
                : (c.unreadCount || 0) + 1,
            };
          })
        );

        // Không hiện thông báo nếu đang xem đúng cuộc trò chuyện
        if (isViewingConversation) {
          return;
        }

        const senderName = conversation.candidateName || 'Ứng viên';

        // Hiển thị thông báo màn hình nếu không trực tiếp xem cuộc hội thoại
        showChatNotification({
          title: 'KiemJob - Tin nhắn mới',
          senderName,
          content: newMsg.content,
          conversationId,
          onClick: () => {
            setActiveConversationId(conversationId);
            setIsChatOpen(true);
            setIsMinimized(false);

            setConversations((prev) =>
              prev.map((c) =>
                String(c.id) === String(conversationId)
                  ? { ...c, unreadCount: 0 }
                  : c
              )
            );
          },
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [
    isLoggedIn,
    currentUser?.email,
    currentUser?.role,
    conversations,
    activeConversationId,
    isChatOpen,
    isMinimized,
    fetchConversations,
  ]);


  // Connect WebSocket when recruiter logs in & listen to status
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.email) {
      setWsConnected(false);
      try {
        webSocketService.disconnect();
      } catch {}
      return;
    }

    setWsConnected(webSocketService.isConnected());

    const removeListener = webSocketService.addListener((event) => {
      if (event === 'connected') {
        setWsConnected(true);
      } else if (event === 'disconnected' || event === 'error') {
        setWsConnected(false);
      }
    });

    webSocketService
      .connect()
      .then((client) => {
        setWsConnected(Boolean(client));
      })
      .catch(() => {
        setWsConnected(false);
      });

    return () => {
      removeListener();
    };
  }, [isLoggedIn, currentUser]);

  // Load messages when activeConversationId changes
  useEffect(() => {
    if (!activeConversationId || !isLoggedIn) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    // Tải tin nhắn từ backend bằng REST
    conversationApi
      .getMessages(activeConversationId)
      .then((res) => {
        if (isMounted && Array.isArray(res)) {
          setMessages(res);
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải tin nhắn cuộc hội thoại:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    // Subscribe WebSocket cho cuộc hội thoại đang chọn
    const unsubscribe = webSocketService.subscribeToConversation(activeConversationId, (newMsg) => {
      if (!isMounted || !newMsg) return;

      setMessages((prev) => {
        // 1. Nếu tin nhắn này đã tồn tại trong danh sách thì bỏ qua để tránh trùng
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev;
        }

        // 2. Tìm tin nhắn tạm (optimistic) tương ứng vừa gửi
        const optimisticIndex = prev.findIndex((m) => {
          const isTemp =
            m.isOptimistic === true ||
            (typeof m.id === 'string' && m.id.startsWith('temp_')) ||
            (typeof m.id === 'number' && m.id > 1000000000000);

          if (!isTemp) return false;

          const sameContent = (m.content || '').trim() === (newMsg.content || '').trim();
          const sameSender =
            !m.senderType ||
            !newMsg.senderType ||
            m.senderType.toLowerCase() === newMsg.senderType.toLowerCase();

          return sameContent && sameSender;
        });

        let updated;
        if (optimisticIndex !== -1) {
          updated = [...prev];
          updated[optimisticIndex] = newMsg;
        } else {
          updated = [...prev, newMsg];
        }

        // 3. Khử trùng lặp an toàn theo ID
        const seenIds = new Set();
        const deduplicated = [];
        for (const msg of updated) {
          if (msg.id && !seenIds.has(msg.id)) {
            seenIds.add(msg.id);
            deduplicated.push(msg);
          }
        }

        return deduplicated;
      });

      // Cập nhật tóm tắt tin nhắn trong danh sách hội thoại
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, lastMessage: newMsg.content, lastMessageTime: 'Vừa xong' }
            : c
        )
      );
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [activeConversationId, isLoggedIn]);

  // Polling REST fallback 10s khi WebSocket chưa kết nối
  useEffect(() => {
    if (!activeConversationId || !isLoggedIn || wsConnected) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await conversationApi.getMessages(activeConversationId);
        if (Array.isArray(res)) {
          setMessages((prev) => {
            const pendingOptimistic = prev.filter(
              (m) => m.isOptimistic || (typeof m.id === 'string' && m.id.startsWith('temp_'))
            );
            const combined = [...res, ...pendingOptimistic];
            const seen = new Set();
            return combined.filter((m) => {
              if (!m.id || seen.has(m.id)) return false;
              seen.add(m.id);
              return true;
            });
          });
        }
      } catch { }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeConversationId, isLoggedIn, wsConnected]);

  // Selected conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Total unread messages count
  const unreadTotal = isLoggedIn
    ? conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
    : 0;

  // Open chat window for a specific conversation
  const openChat = useCallback((conversationId) => {
    if (!conversationId && conversations.length > 0) {
      conversationId = conversations[0].id;
    }
    if (!conversationId) return;

    setActiveConversationId(conversationId);
    setIsChatOpen(true);
    setIsMinimized(false);

    // Mark as read locally
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, [conversations]);

  // Create or open chat with candidate directly
  const openChatWithCandidate = useCallback(async ({ candidateId, recruiterId }) => {
    try {
      const res = await conversationApi.createConversation({
        candidateId: candidateId || undefined,
        recruiterId: recruiterId || undefined,
      });

      if (res && res.id) {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === res.id);
          return exists ? prev.map((c) => (c.id === res.id ? res : c)) : [res, ...prev];
        });
        setActiveConversationId(res.id);
        setIsChatOpen(true);
        setIsMinimized(false);
        return res;
      }
    } catch (err) {
      console.error('Không thể tạo hoặc mở cuộc trò chuyện với ứng viên:', err);
      throw err;
    }
  }, []);

  // Close chat window
  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setIsMinimized(false);
  }, []);

  // Minimize chat to chat head
  const minimizeChat = useCallback(() => {
    setIsMinimized(true);
  }, []);

  // Restore chat from chat head
  const restoreChat = useCallback(() => {
    setIsMinimized(false);
  }, []);

  // Mark all conversations as read
  const markAllAsRead = useCallback(() => {
    setConversations((prev) => prev.map((c) => ({ ...c, unreadCount: 0 })));
  }, []);

  // Send message as recruiter
  const sendMessage = useCallback(async (content) => {
    const text = content?.trim();
    if (!text || !activeConversationId) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg = {
      id: tempId,
      conversationId: activeConversationId,
      senderType: ROLES.RECRUITER,
      content: text,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    // Cập nhật giao diện tức thì
    setMessages((prev) => [...prev, optimisticMsg]);

    // Cập nhật snippet ở danh sách hội thoại
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, lastMessage: `Bạn: ${text}`, lastMessageTime: 'Vừa xong' }
          : c
      )
    );

    // 1. Thử gửi qua WebSocket
    const wsSent = webSocketService.sendMessage(activeConversationId, text);

    // 2. Nếu WebSocket chưa kết nối hoặc thất bại, fallback sang REST API
    if (!wsSent) {
      try {
        const saved = await conversationApi.sendMessage(activeConversationId, text);
        if (saved && saved.id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? saved : m))
          );
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        console.warn('Gửi qua REST API thất bại:', err);
        throw new Error('Kết nối chat chưa sẵn sàng. Vui lòng thử lại sau giây lát.');
      }
    }
  }, [activeConversationId]);

  return (
    <RecruiterChatContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        conversations,
        loadingConversations,
        activeConversationId,
        activeConversation,
        isChatOpen,
        isMinimized,
        messages,
        loadingMessages,
        unreadTotal,
        wsConnected,
        openChat,
        openChatWithCandidate,
        closeChat,
        minimizeChat,
        restoreChat,
        markAllAsRead,
        sendMessage,
        fetchConversations,
        enableNotifications,
        notificationPermission,
      }}
    >
      {children}
    </RecruiterChatContext.Provider>
  );
}

export function useRecruiterChat() {
  const context = useContext(RecruiterChatContext);
  return context || {};
}

export default RecruiterChatContext;
