import { Client } from '@stomp/stompjs';

/**
 * WebSocketService - Quản lý kết nối STOMP qua WebSocket cho tính năng Chat Realtime
 * Xác thực tự động thông qua HttpOnly Cookie 'access_token' khi bắt tay (handshake).
 * Không truyền token, email, role qua query string.
 */
class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.connectingPromise = null;
    this.stompSubscriptions = new Map(); // topic -> STOMP subscription
    this.topicListeners = new Map(); // topic -> Set of callbacks
    this.lifecycleListeners = new Set();
  }

  getWsUrl() {
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';
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
        } catch { }
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

      const wsUrl = this.getWsUrl();

      const client = new Client({
        brokerURL: wsUrl,
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: () => { },

        onConnect: (frame) => {
          if (this.client !== client) return;
          this.connected = true;
          this.connectingPromise = null;
          this.notifyLifecycle('connected', frame);
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

  subscribeToConversation(conversationId, onMessageReceived) {
    if (!conversationId || typeof onMessageReceived !== 'function') {
      return () => { };
    }

    const topic = `/topic/conversations/${conversationId}`;

    if (!this.topicListeners.has(topic)) {
      this.topicListeners.set(topic, new Set());
    }

    this.topicListeners.get(topic).add(onMessageReceived);

    if (this.client?.connected) {
      this.ensureStompSubscription(topic);
    } else {
      this.connect().catch(() => { });
    }

    return () => {
      const listeners = this.topicListeners.get(topic);
      if (!listeners) return;

      listeners.delete(onMessageReceived);

      if (listeners.size === 0) {
        this.topicListeners.delete(topic);
        const subscription = this.stompSubscriptions.get(topic);
        if (subscription) {
          try {
            subscription.unsubscribe();
          } catch { }
          this.stompSubscriptions.delete(topic);
        }
      }
    };
  }

  ensureStompSubscription(topic) {
    if (this.stompSubscriptions.has(topic) || !this.client?.connected) {
      return;
    }

    try {
      const subscription = this.client.subscribe(topic, (message) => {
        try {
          const payload = JSON.parse(message.body);
          const listeners = this.topicListeners.get(topic);
          if (listeners) {
            listeners.forEach((callback) => {
              try {
                callback(payload);
              } catch (err) {
                console.error('Lỗi listener WebSocket:', err);
              }
            });
          }
        } catch (err) {
          console.error('Không thể phân tích tin nhắn WebSocket:', err);
        }
      });

      this.stompSubscriptions.set(topic, subscription);
    } catch (err) {
      console.error('Không thể subscribe topic:', topic, err);
    }
  }

  resubscribeAllTopics() {
    this.stompSubscriptions.clear();
    for (const topic of this.topicListeners.keys()) {
      this.ensureStompSubscription(topic);
    }
  }

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
      console.error('Lỗi gửi tin nhắn qua WebSocket:', error);
      return false;
    }
  }

  disconnect() {
    if (!this.client) return;

    this.stompSubscriptions.forEach((sub) => {
      try {
        sub.unsubscribe();
      } catch { }
    });

    this.stompSubscriptions.clear();
    this.topicListeners.clear();

    try {
      this.client.deactivate();
    } catch { }

    this.client = null;
    this.connected = false;
    this.connectingPromise = null;
  }

  addListener(callback) {
    this.lifecycleListeners.add(callback);
    return () => this.lifecycleListeners.delete(callback);
  }

  notifyLifecycle(event, data) {
    this.lifecycleListeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch { }
    });
  }

  isConnected() {
    return Boolean(this.connected && this.client?.connected);
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
