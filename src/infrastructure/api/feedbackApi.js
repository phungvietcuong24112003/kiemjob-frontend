import { apiClient } from './client';

/**
 * Feedback API - Dành cho Người dùng (Ứng viên, Nhà tuyển dụng) và Admin
 */
export const feedbackApi = {
  /**
   * Gửi góp ý / phản hồi về hệ thống
   * @param {Object} data { subject, rating, content, category, email }
   */
  sendFeedback: async (data) => {
    const res = await apiClient.post('/feedback', data);
    return res?.data !== undefined ? res.data : res;
  },

  /**
   * Lấy danh sách góp ý của chính tài khoản hiện tại
   */
  getMyFeedbacks: async () => {
    const res = await apiClient.get('/feedback/mine');
    return res?.data !== undefined ? res.data : res;
  },

  /**
   * [Admin] Lấy toàn bộ danh sách góp ý
   */
  getAllFeedbacks: async () => {
    const res = await apiClient.get('/admin/feedbacks');
    return res?.data !== undefined ? res.data : res;
  },

  /**
   * [Admin] Lấy thống kê góp ý
   */
  getFeedbackStats: async () => {
    const res = await apiClient.get('/admin/feedbacks/stats');
    return res?.data !== undefined ? res.data : res;
  },

  /**
   * [Admin] Xóa góp ý
   */
  deleteFeedback: async (id) => {
    const res = await apiClient.delete(`/admin/feedbacks/${id}`);
    return res?.data !== undefined ? res.data : res;
  },
};

export default feedbackApi;

