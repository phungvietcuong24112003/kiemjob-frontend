import { apiClient } from './client';

export const chatApi = {
  /**
   * Lấy danh sách các cuộc hội thoại
   */
  getConversations: async () => {
    return await apiClient.get('/conversations');
  },

  /**
   * Xem chi tiết một cuộc hội thoại
   */
  getConversation: async (id) => {
    return await apiClient.get(`/conversations/${id}`);
  },

  /**
   * Tạo cuộc hội thoại mới giữa Ứng viên và Nhà tuyển dụng
   */
  createConversation: async (candidateId, recruiterId) => {
    return await apiClient.post('/conversations', { candidateId, recruiterId });
  },

  /**
   * Lấy lịch sử tin nhắn của cuộc hội thoại
   */
  getMessages: async (conversationId) => {
    return await apiClient.get(`/conversations/${conversationId}/messages`);
  },

  /**
   * Gửi tin nhắn mới qua REST API (fallback khi websocket bận)
   */
  sendMessage: async (conversationId, content) => {
    return await apiClient.post(`/conversations/${conversationId}/messages`, { content });
  },

  /**
   * Gửi góp ý phản hồi từ người dùng
   */
  sendFeedback: async (feedbackData) => {
    return await apiClient.post('/feedback', feedbackData);
  },
};

export default chatApi;
