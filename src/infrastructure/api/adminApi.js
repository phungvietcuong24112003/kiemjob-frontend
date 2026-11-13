import { apiClient } from './client';

/**
 * API Quản trị hệ thống (Thống kê, Quản lý tài khoản, Quản lý tin tuyển dụng)
 */

// Lấy số liệu thống kê tổng quan hệ thống
export const getAdminStats = async () => {
  const data = await apiClient.get('/admin/stats');
  return data?.data !== undefined ? data.data : data;
};

// Lấy danh sách tài khoản người dùng
export const getAdminAccounts = async () => {
  const data = await apiClient.get('/admin/accounts');
  return data?.data !== undefined ? data.data : data;
};

// Khóa hoặc kích hoạt xác thực tài khoản
export const toggleAccountVerify = async (id) => {
  const data = await apiClient.patch(`/admin/accounts/${id}/toggle-verify`);
  return data?.data !== undefined ? data.data : data;
};

// ==================== QUẢN LÝ TIN TUYỂN DỤNG ====================

// Lấy danh sách tin tuyển dụng (hỗ trợ lọc status: 'draft', 'open', 'closed', 'expired')
export const getJobPosts = async (params = {}) => {
  const data = await apiClient.get('/job-posts', { params });
  return data?.data !== undefined ? data.data : data;
};

// Lấy chi tiết tin tuyển dụng
export const getJobPostById = async (id) => {
  const data = await apiClient.get(`/job-posts/${id}`);
  return data?.data !== undefined ? data.data : data;
};

// Duyệt hoặc thay đổi trạng thái tin tuyển dụng ('open', 'draft', 'closed')
export const updateJobPostStatus = async (id, status) => {
  const data = await apiClient.patch(`/job-posts/${id}/status`, null, {
    params: { status }
  });
  return data?.data !== undefined ? data.data : data;
};

// Xóa tin tuyển dụng
export const deleteJobPost = async (id) => {
  const data = await apiClient.delete(`/job-posts/${id}`);
  return data?.data !== undefined ? data.data : data;
};

// ==================== QUẢN LÝ GÓP Ý & PHẢN HỒI (FEEDBACK) ====================

// Lấy danh sách góp ý của người dùng
export const getAdminFeedbacks = async () => {
  const data = await apiClient.get('/admin/feedbacks');
  return data?.data !== undefined ? data.data : data;
};

// Lấy thống kê góp ý & đánh giá sao
export const getAdminFeedbackStats = async () => {
  const data = await apiClient.get('/admin/feedbacks/stats');
  return data?.data !== undefined ? data.data : data;
};

// Xóa góp ý người dùng
export const deleteAdminFeedback = async (id) => {
  const data = await apiClient.delete(`/admin/feedbacks/${id}`);
  return data?.data !== undefined ? data.data : data;
};

// ==================== KIỂM DUYỆT TIN TUYỂN DỤNG BẰNG AI ====================

// Quét / Kiểm duyệt tin bằng AI
export const checkJobModeration = async (jobId) => {
  const data = await apiClient.post(`/job-posts/${jobId}/moderation/check`);
  return data?.data !== undefined ? data.data : data;
};

// Lấy kết quả kiểm duyệt AI mới nhất
export const getLatestModeration = async (jobId) => {
  const data = await apiClient.get(`/job-posts/${jobId}/moderation/latest`);
  return data?.data !== undefined ? data.data : data;
};

// Lấy lịch sử kiểm duyệt AI
export const getModerationHistory = async (jobId) => {
  const data = await apiClient.get(`/job-posts/${jobId}/moderation/history`);
  return data?.data !== undefined ? data.data : data;
};

export const adminApi = {
  getAdminStats,
  getAdminAccounts,
  toggleAccountVerify,
  getJobPosts,
  getJobPostById,
  updateJobPostStatus,
  deleteJobPost,
  getAdminFeedbacks,
  getAdminFeedbackStats,
  deleteAdminFeedback,
  checkJobModeration,
  getLatestModeration,
  getModerationHistory,
};

export default adminApi;
