/**
 * jobSpecializationApi.js - Quản lý API Chuyên môn nghề nghiệp (job_specializations)
 * 
 * Kết nối với Controller phía Spring Boot:
 * @RequestMapping("/api/job-specializations") -> JobSpecializationController.java
 * 
 * Response DTO: { id, jobCategoryId, jobCategoryName, name }
 * Request DTO:  { jobCategoryId, name }
 */

import apiClient from './client';

export const jobSpecializationApi = {
  /**
   * Lấy danh sách chuyên môn (có thể lọc theo danh mục)
   * Backend: GET /api/job-specializations?jobCategoryId={id}
   * @param {number|string|null} jobCategoryId - Nếu null/undefined thì lấy tất cả
   * @returns {Promise<Array<{ id: number, jobCategoryId: number, jobCategoryName: string, name: string }>>}
   */
  async getSpecializations(jobCategoryId = null) {
    const params = {};
    if (jobCategoryId) {
      params.jobCategoryId = jobCategoryId;
    }
    const data = await apiClient.get('/job-specializations', { params });
    return Array.isArray(data) ? data : [];
  },

  /**
   * Lấy chi tiết 1 chuyên môn theo ID
   * Backend: GET /api/job-specializations/{id}
   * @param {number|string} id
   * @returns {Promise<{ id: number, jobCategoryId: number, jobCategoryName: string, name: string }>}
   */
  async getSpecializationById(id) {
    if (!id) return null;
    return await apiClient.get(`/job-specializations/${id}`);
  },

  /**
   * Thêm mới 1 chuyên môn (Admin)
   * Backend: POST /api/job-specializations
   * @param {{ jobCategoryId: number, name: string }} specialization
   * @returns {Promise<{ id: number, jobCategoryId: number, jobCategoryName: string, name: string }>}
   */
  async createSpecialization(specialization) {
    return await apiClient.post('/job-specializations', specialization);
  },

  /**
   * Cập nhật chuyên môn theo ID (Admin)
   * Backend: PUT /api/job-specializations/{id}
   * @param {number|string} id
   * @param {{ jobCategoryId: number, name: string }} specialization
   * @returns {Promise<{ id: number, jobCategoryId: number, jobCategoryName: string, name: string }>}
   */
  async updateSpecialization(id, specialization) {
    return await apiClient.put(`/job-specializations/${id}`, specialization);
  },

  /**
   * Xóa 1 chuyên môn theo ID (Admin)
   * Backend: DELETE /api/job-specializations/{id}
   */
  async deleteSpecialization(id) {
    return await apiClient.delete(`/job-specializations/${id}`);
  },
};

export const {
  getSpecializations,
  getSpecializationById,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization,
} = jobSpecializationApi;

export default jobSpecializationApi;
