import apiClient from './client';

export const featurePackageApi = {
  // Người dùng: Lấy danh sách các gói đang được bán
  getActivePackages() {
    return apiClient.get('/feature-packages');
  },

  // Admin: Lấy tất cả gói, kể cả gói đã ngừng bán
  getAllPackages() {
    return apiClient.get('/admin/feature-packages');
  },

  // Admin: Lấy chi tiết một gói
  getPackageById(id) {
    return apiClient.get(`/admin/feature-packages/${id}`);
  },

  // Admin: Tạo gói mới
  createPackage(data) {
    return apiClient.post('/admin/feature-packages', data);
  },

  // Admin: Cập nhật thông tin gói
  updatePackage(id, data) {
    return apiClient.put(`/admin/feature-packages/${id}`, data);
  },

  // Admin: Thay đổi trạng thái hoạt động của gói
  updateActiveStatus(id, data) {
    return apiClient.patch(`/admin/feature-packages/${id}/active`, data);
  },

  // Admin: Ngừng bán gói (xóa mềm)
  deactivatePackage(id) {
    return apiClient.delete(`/admin/feature-packages/${id}`);
  },

  // Admin: Xóa vĩnh viễn (nếu đã có đơn hàng thì backend tự fallback về ngừng bán)
  permanentDeletePackage(id) {
    return apiClient.delete(`/admin/feature-packages/${id}/permanent`);
  },

  // Admin: Xem lịch sử tất cả đơn mua gói trong toàn hệ thống
  getAllOrders() {
    return apiClient.get('/admin/featured-orders');
  },

  // Admin: Xem chi tiết một đơn mua gói
  getAdminOrderById(orderId) {
    return apiClient.get(`/admin/featured-orders/${orderId}`);
  },

  // Admin: Xem danh sách giao dịch thanh toán của một đơn hàng
  getAdminOrderPayments(orderId) {
    return apiClient.get(`/admin/featured-orders/${orderId}/payments`);
  },

  // Recruiter: Tạo đơn mua gói nổi bật (FeaturedOrder)
  createOrder(planId, jobId = null, idempotencyKey = null) {
    const key = idempotencyKey || `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payload = { planId: Number(planId) };
    if (jobId) payload.jobId = Number(jobId);
    return apiClient.post(
      '/featured-orders',
      payload,
      { headers: { 'Idempotency-Key': key } }
    );
  },

  // Recruiter: Lấy danh sách đơn mua gói của tôi
  getMyOrders() {
    return apiClient.get('/featured-orders');
  },

  // Recruiter: Lấy chi tiết 1 đơn hàng của tôi
  getMyOrder(orderId) {
    return apiClient.get(`/featured-orders/${orderId}`);
  },

  // Recruiter: Tạo giao dịch thanh toán (PaymentTransaction) cho đơn hàng
  createPayment(orderId, provider = 'vnpay', idempotencyKey = null) {
    const key = idempotencyKey || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return apiClient.post(
      `/featured-orders/${orderId}/payments`,
      { provider },
      { headers: { 'Idempotency-Key': key } }
    );
  },

  // Recruiter: Lấy danh sách các giao dịch thanh toán của một đơn hàng
  getOrderPayments(orderId) {
    return apiClient.get(`/featured-orders/${orderId}/payments`);
  },

  // Recruiter: Xem chi tiết một giao dịch thanh toán
  getPayment(paymentId) {
    return apiClient.get(`/payments/${paymentId}`);
  },

  // Recruiter: Tạo URL thanh toán VNPAY
  createVnPayPayment(orderId) {
    return apiClient.post('/vnpay/create-payment', { orderId });
  },
};

export default featurePackageApi;
