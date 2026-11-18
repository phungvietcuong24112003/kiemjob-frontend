import { apiClient } from './client';

export const jobPostingOrderApi = {
  /**
   * Lấy hạn mức đăng tin miễn phí hiện tại của công ty
   * GET /job-posts/quota
   */
  getCompanyQuota: async () => {
    return await apiClient.get('/job-posts/quota');
  },

  /**
   * Lấy đơn hàng đăng tin mới nhất của JobPost
   * GET /job-posting-orders/by-job/{jobId}
   */
  getLatestOrderByJobId: async (jobId) => {
    return await apiClient.get(`/job-posting-orders/by-job/${jobId}`);
  },

  /**
   * Tạo URL thanh toán VNPay cho đơn hàng
   * POST /job-posting-orders/{id}/create-payment
   */
  createPaymentUrl: async (orderId) => {
    return await apiClient.post(`/job-posting-orders/${orderId}/create-payment`);
  },

  /**
   * Gia hạn tin tuyển dụng trả phí
   * POST /job-posts/{jobId}/renew
   */
  renewJobPost: async (jobId, durationDays) => {
    return await apiClient.post(`/job-posts/${jobId}/renew`, { durationDays });
  },

  /**
   * Admin duyệt hoặc từ chối tin tuyển dụng
   * POST /admin/job-posts/{id}/moderate
   */
  moderateJobPost: async (jobId, decision, reason) => {
    return await apiClient.post(`/admin/job-posts/${jobId}/moderate`, { decision, reason });
  },

  /**
   * Admin lấy danh sách các đơn hàng cần đối soát
   * GET /admin/job-posting-orders/reconciliation
   */
  getReconciliationOrders: async (page = 0, size = 20) => {
    return await apiClient.get('/admin/job-posting-orders/reconciliation', {
      params: { page, size },
    });
  },

  /**
   * Admin kích hoạt thủ công cho đơn đối soát
   * POST /admin/job-posting-orders/{id}/manual-activate
   */
  manualActivateOrder: async (orderId, reason, durationDays) => {
    return await apiClient.post(`/admin/job-posting-orders/${orderId}/manual-activate`, {
      reason,
      durationDays,
    });
  },
};
