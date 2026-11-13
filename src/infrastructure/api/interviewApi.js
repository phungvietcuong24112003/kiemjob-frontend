/**
 * interviewApi.js - Quản lý API liên quan đến Lịch phỏng vấn
 *
 * Kết nối với Controller phía Spring Boot:
 * @RequestMapping("/api/interviews") -> InterviewController.java
 */

import apiClient from './client';

export const interviewApi = {
  /**
   * Tạo lịch phỏng vấn
   * Backend: POST /api/interviews
   * Body: { applicationId, title, scheduledAt, note }
   */
  async createInterview(data) {
    return await apiClient.post('/interviews', data);
  },

  /**
   * Lấy danh sách lịch phỏng vấn theo hồ sơ ứng tuyển
   * Backend: GET /api/interviews/application/{applicationId}
   */
  async getInterviewsByApplication(applicationId) {
    if (!applicationId) return [];
    return await apiClient.get(`/interviews/application/${applicationId}`);
  },
};

export const {
  createInterview,
  getInterviewsByApplication,
} = interviewApi;

export default interviewApi;

