import { apiClient } from './client';

export const conversationApi = {
  /**
   * Lấy danh sách cuộc trò chuyện của người dùng hiện tại.
   * GET /api/conversations
   */
  getConversations() {
    return apiClient.get('/conversations');
  },

  /**
   * Lấy thông tin chi tiết một cuộc trò chuyện.
   * GET /api/conversations/{id}
   */
  getConversation(conversationId) {
    if (!conversationId) {
      throw new Error('conversationId không hợp lệ');
    }

    return apiClient.get(`/conversations/${conversationId}`);
  },

  /**
   * Tạo cuộc trò chuyện mới.
   * POST /api/conversations
   */
  createConversation(request) {
    return apiClient.post('/conversations', request);
  },

  /**
   * Xóa cuộc trò chuyện.
   * DELETE /api/conversations/{id}
   */
  deleteConversation(conversationId) {
    if (!conversationId) {
      throw new Error('conversationId không hợp lệ');
    }

    return apiClient.delete(`/conversations/${conversationId}`);
  },

  /**
   * Lấy danh sách tin nhắn của một cuộc trò chuyện.
   * GET /api/conversations/{id}/messages
   */
  getMessages(conversationId) {
    if (!conversationId) {
      throw new Error('conversationId không hợp lệ');
    }

    return apiClient.get(`/conversations/${conversationId}/messages`);
  },

  /**
   * Gửi tin nhắn bằng REST API.
   * POST /api/conversations/{id}/messages
   */
  sendMessage(conversationId, content) {
    if (!conversationId) {
      throw new Error('conversationId không hợp lệ');
    }

    if (!content || !content.trim()) {
      throw new Error('Nội dung tin nhắn không được để trống');
    }

    return apiClient.post(
      `/conversations/${conversationId}/messages`,
      {
        content: content.trim(),
      }
    );
  },

  /**
   * Xóa một tin nhắn.
   * DELETE /api/messages/{id}
   */
  deleteMessage(messageId) {
    if (!messageId) {
      throw new Error('messageId không hợp lệ');
    }

    return apiClient.delete(`/messages/${messageId}`);
  },
};

export default conversationApi;