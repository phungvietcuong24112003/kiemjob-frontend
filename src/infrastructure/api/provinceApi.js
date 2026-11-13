/**
 * provinceApi.js - Quản lý toàn bộ API liên quan đến Tỉnh / Thành phố
 * 
 * Kết nối với Controller phía Spring Boot:
 * @RequestMapping("/api/provinces") -> ProvinceController.java
 */

import apiClient from './client';

export const provinceApi = {
  /**
   * Lấy danh sách tất cả Tỉnh / Thành phố
   * Backend: GET /api/provinces
   */
  async getProvinces() {
    const data = await apiClient.get('/provinces');
    return Array.isArray(data) ? data : data?.content ?? [];
  },

  /**
   * Lấy chi tiết 1 Tỉnh / Thành phố theo ID
   * Backend: GET /api/provinces/{id}
   */
  async getProvinceById(id) {
    if (!id) return null;
    return await apiClient.get(`/provinces/${id}`);
  },

  /**
   * Backend không quản lý cấp xã/phường riêng biệt (địa chỉ chi tiết nằm trong addressDetail).
   * Trả về mảng rỗng để tương thích ngược mà không gọi HTTP gây 404.
   */
  async getCommunesByProvince() {
    return [];
  },

  /**
   * Thêm mới 1 Tỉnh / Thành phố (dành cho Admin)
   * Backend: POST /api/provinces
   * @param {object} province - { name: 'Tên tỉnh' }
   */
  async createProvince(province) {
    return await apiClient.post('/provinces', province);
  },

  /**
   * Cập nhật thông tin Tỉnh / Thành phố theo ID (dành cho Admin)
   * Backend: PUT /api/provinces/{id}
   * @param {number} id - ID của tỉnh cần sửa
   * @param {object} province - { name: 'Tên mới' }
   */
  async updateProvince(id, province) {
    return await apiClient.put(`/provinces/${id}`, province);
  },

  /**
   * Xóa 1 Tỉnh / Thành phố theo ID (dành cho Admin)
   * Backend: DELETE /api/provinces/{id}
   */
  async deleteProvince(id) {
    return await apiClient.delete(`/provinces/${id}`);
  },
};

// Export từng hàm độc lập để tiện import trực tiếp
export const {
  getProvinces,
  getProvinceById,
  getCommunesByProvince,
  createProvince,
  updateProvince,
  deleteProvince,
} = provinceApi;

export default provinceApi;
