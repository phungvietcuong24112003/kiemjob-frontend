/**
 * jobCategoryApi.js - Quản lý API Danh mục nghề nghiệp (jobs_categories)
 * 
 * Kết nối với Controller phía Spring Boot:
 * @RequestMapping("/api/jobs-categories") -> JobsCategoryController.java
 */

import apiClient from './client';

export const jobCategoryApi = {
  /**
   * Lấy danh sách tất cả Danh mục nghề nghiệp
   * Backend: GET /api/jobs-categories
   * @returns {Promise<Array<{ id: number, name: string, description: string }>>}
   */
  async getCategories() {
    const data = await apiClient.get('/jobs-categories');
    return Array.isArray(data) ? data : [];
  },

  /**
   * Lấy chi tiết 1 Danh mục nghề nghiệp theo ID
   * Backend: GET /api/jobs-categories/{id}
   * @param {number|string} id
   * @returns {Promise<{ id: number, name: string, description: string }>}
   */
  async getCategoryById(id) {
    if (!id) return null;
    return await apiClient.get(`/jobs-categories/${id}`);
  },

  /**
   * Thêm mới 1 Danh mục nghề nghiệp (Admin)
   * Backend: POST /api/jobs-categories
   * @param {{ name: string, description?: string }} category
   * @returns {Promise<{ id: number, name: string, description: string }>}
   */
  async createCategory(category) {
    return await apiClient.post('/jobs-categories', category);
  },

  /**
   * Cập nhật thông tin Danh mục nghề nghiệp theo ID (Admin)
   * Backend: PUT /api/jobs-categories/{id}
   * @param {number|string} id
   * @param {{ name: string, description?: string }} category
   * @returns {Promise<{ id: number, name: string, description: string }>}
   */
  async updateCategory(id, category) {
    return await apiClient.put(`/jobs-categories/${id}`, category);
  },

  /**
   * Xóa 1 Danh mục nghề nghiệp theo ID (Admin)
   * Backend: DELETE /api/jobs-categories/{id}
   */
  async deleteCategory(id) {
    return await apiClient.delete(`/jobs-categories/${id}`);
  },
};

export const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = jobCategoryApi;

export default jobCategoryApi;
