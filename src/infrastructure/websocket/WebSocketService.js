
import { Client } from '@stomp/stompjs';
import { WS_URL } from '../../config/site';

/**
 * WebSocketService
 *
 * Quản lý kết nối STOMP cho chat realtime và thông báo cá nhân.
 * Xác thực thông qua HttpOnly Cookie access_token.
 * Không truyền token qua query string.
 */
class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.connectingPromise = null;

    // destination -> STOMP subscription
    this.stompSubscriptions = new Map();

    // destination -> Set callbacks
    this.topicListeners = new Map();

    this.lifecycleListeners = new Set();
  }

  getWsUrl() {
    if (WS_URL) {
      return WS_URL;
    }

    const protocol =
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:'
        ? 'wss:'
        : 'ws:';

    const host =
      typeof window !== 'undefined'
        ? window.location.host
        : 'localhost:5173';

    return `${protocol}//${host}/ws`;
  }

  connect() {
    if (this.connected && this.client?.connected) {
      return Promise.resolve(this.client);
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = new Promise((resolve) => {
      let resolved = false;

      const finish = (activeClient) => {
        if (resolved) return;

        resolved = true;
        clearTimeout(timeoutId);
        resolve(activeClient);
      };

      if (this.client) {
        try {
          this.client.deactivate();
        } catch {}
      }

      this.connected = false;
      this.stompSubscriptions.clear();

      const timeoutId = setTimeout(() => {
        this.connectingPromise = null;

        if (this.client === client) {
          this.connected = false;
        }

        finish(null);
      }, 7000);

      const client = new Client({
        brokerURL: this.getWsUrl(),
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: () => {},

        onConnect: (frame) => {
          if (this.client !== client) return;

          this.connected = true;
          this.connectingPromise = null;

          this.notifyLifecycle('connected', frame);

          // Đăng ký lại tất cả kênh sau khi kết nối/reconnect
          this.resubscribeAllTopics();

          finish(client);
        },

        onStompError: (frame) => {
          if (this.client !== client) return;

          this.connected = false;
          this.connectingPromise = null;

          this.notifyLifecycle('error', frame);
          finish(null);
        },

        onWebSocketClose: (event) => {
          if (this.client !== client) return;

          this.connected = false;
          this.connectingPromise = null;
          this.stompSubscriptions.clear();

          this.notifyLifecycle('disconnected', event);
          finish(null);
        },

        onWebSocketError: (event) => {
          if (this.client !== client) return;

          this.notifyLifecycle('error', event);
        },
      });

      this.client = client;
      client.activate();
    });

    return this.connectingPromise;
  }

  /**
   * Đăng ký nhận tin nhắn của một cuộc hội thoại.
   */
  subscribeToConversation(conversationId, onMessageReceived) {
    if (
      !conversationId ||
      typeof onMessageReceived !== 'function'
    ) {
      return () => {};
    }

    const topic = `/topic/conversations/${conversationId}`;

    return this.subscribeToTopic(topic, onMessageReceived);
  }

  /**
   * Đăng ký nhận thông báo riêng của tài khoản hiện tại.
   *
   * Backend gửi đến:
   * /user/queue/messages
   *
   * Không phụ thuộc cuộc hội thoại đang mở.
   */
  subscribeToUserMessages(onMessageReceived) {
    if (typeof onMessageReceived !== 'function') {
      return () => {};
    }

    return this.subscribeToTopic(
      '/user/queue/messages',
      onMessageReceived
    );
  }

  /**
   * Đăng ký nhận thông báo chuông hệ thống cá nhân (Notifications).
   * Backend gửi đến: /user/queue/notifications
   */
  subscribeToNotifications(onNotificationReceived) {
    if (typeof onNotificationReceived !== 'function') {
      return () => {};
    }

    return this.subscribeToTopic(
      '/user/queue/notifications',
      onNotificationReceived
    );
  }

  /**
   * Hàm dùng chung để đăng ký một destination.
   */
  subscribeToTopic(topic, callback) {
    if (!this.topicListeners.has(topic)) {
      this.topicListeners.set(topic, new Set());
    }

    this.topicListeners.get(topic).add(callback);

    if (this.client?.connected) {
      this.ensureStompSubscription(topic);
    } else {
      this.connect().catch(() => {});
    }

    // Trả về hàm hủy đăng ký
    return () => {
      const listeners = this.topicListeners.get(topic);

      if (!listeners) return;

      listeners.delete(callback);

      if (listeners.size === 0) {
        this.topicListeners.delete(topic);

        const subscription =
          this.stompSubscriptions.get(topic);

        if (subscription) {
          try {
            subscription.unsubscribe();
          } catch {}

          this.stompSubscriptions.delete(topic);
        }
      }
    };
  }

  /**
   * Tạo STOMP subscription cho destination.
   */
  ensureStompSubscription(topic) {
    if (
      this.stompSubscriptions.has(topic) ||
      !this.client?.connected
    ) {
      return;
    }

    try {
      console.log('[WebSocketService] Đang subscribe tới:', topic);
      const subscription = this.client.subscribe(
        topic,
        (message) => {
          try {
            const payload = JSON.parse(message.body);
            console.log('[WebSocketService] Nhận frame từ topic:', topic, payload);
            const listeners = this.topicListeners.get(topic);

            if (listeners) {
              listeners.forEach((callback) => {
                try {
                  callback(payload);
                } catch (err) {
                  console.error(
                    'Lỗi listener WebSocket:',
                    err
                  );
                }
              });
            }
          } catch (err) {
            console.error(
              'Không thể phân tích dữ liệu WebSocket:',
              err
            );
          }
        }
      );

      this.stompSubscriptions.set(topic, subscription);
    } catch (err) {
      console.error(
        'Không thể subscribe destination:',
        topic,
        err
      );
    }
  }

  /**
   * Đăng ký lại tất cả destination sau khi reconnect.
   */
  resubscribeAllTopics() {
    this.stompSubscriptions.clear();

    for (const topic of this.topicListeners.keys()) {
      this.ensureStompSubscription(topic);
    }
  }

  /**
   * Gửi tin nhắn đến Backend.
   */
  sendMessage(conversationId, content) {
    if (!this.client?.connected) {
      return false;
    }

    const text = content?.trim();

    if (!conversationId || !text) {
      return false;
    }

    try {
      this.client.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({
          conversationId: Number(conversationId),
          content: text,
        }),
      });

      return true;
    } catch (error) {
      console.error(
        'Lỗi gửi tin nhắn qua WebSocket:',
        error
      );

      return false;
    }
  }

  /**
   * Ngắt kết nối WebSocket.
   */
  disconnect() {
    if (!this.client) return;

    this.stompSubscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch {}
    });

    this.stompSubscriptions.clear();
    this.topicListeners.clear();

    try {
      this.client.deactivate();
    } catch {}

    this.client = null;
    this.connected = false;
    this.connectingPromise = null;
  }

  addListener(callback) {
    this.lifecycleListeners.add(callback);

    return () => {
      this.lifecycleListeners.delete(callback);
    };
  }

  notifyLifecycle(event, data) {
    this.lifecycleListeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch {}
    });
  }

  isConnected() {
    return Boolean(
      this.connected && this.client?.connected
    );
  }
}

export const webSocketService = new WebSocketService();

export default webSocketService;
