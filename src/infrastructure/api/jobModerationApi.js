import { apiClient } from './client';

/**
 * API Kiểm duyệt tin tuyển dụng bằng AI
 */

// Chạy kiểm duyệt AI cho bài tuyển dụng
export const checkJobModeration = async (jobId) => {
  const data = await apiClient.post(`/job-posts/${jobId}/moderation/check`);
  return data?.data !== undefined ? data.data : data;
};

// Lấy kết quả kiểm duyệt gần nhất
export const getLatestModeration = async (jobId) => {
  const data = await apiClient.get(`/job-posts/${jobId}/moderation/latest`);
  return data?.data !== undefined ? data.data : data;
};

// Lấy toàn bộ lịch sử kiểm duyệt
export const getModerationHistory = async (jobId) => {
  const data = await apiClient.get(`/job-posts/${jobId}/moderation/history`);
  return data?.data !== undefined ? data.data : data;
};

export const jobModerationApi = {
  checkJobModeration,
  getLatestModeration,
  getModerationHistory,
};

export default jobModerationApi;

