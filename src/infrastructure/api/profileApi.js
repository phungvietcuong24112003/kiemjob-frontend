import { apiClient } from './client';

export const profileApi = {
  /**
   * Lấy thông tin hồ sơ ứng viên hiện tại
   * Backend endpoint: GET /api/profile/candidate
   */
  getCandidateProfile: async () => {
    return await apiClient.get('/profile/candidate');
  },

  /**
   * Cập nhật thông tin hồ sơ ứng viên
   * Backend endpoint: PUT /api/profile/candidate
   * @param {object} profileData - { fullname, avatarUrl, headline, gender, phone, dateOfBirth, provinceId, addressDetail }
   */
  updateCandidateProfile: async (profileData) => {
    return await apiClient.put('/profile/candidate', profileData);
  },

  /**
   * Tạo mới hồ sơ ứng viên
   * Backend endpoint: POST /api/profile/candidate
   */
  createCandidateProfile: async (profileData) => {
    return await apiClient.post('/profile/candidate', profileData);
  },

  /**
   * Lấy thông tin tài khoản & vai trò của user hiện tại
   * Backend endpoint: GET /api/profile/me
   */
  getMyProfile: async () => {
    return await apiClient.get('/profile/me');
  },


  /**
   * Lấy hồ sơ nhà tuyển dụng và công ty hiện tại
   * Backend endpoint: GET /api/profile/recruiter
   */
  getRecruiterProfile: async () => {
    return await apiClient.get('/profile/recruiter');
  },


  /**
   * Lấy hồ sơ ứng viên theo ID (dành cho Recruiter xem thông tin ứng viên ứng tuyển)
   * Backend endpoint: GET /api/profile/candidate/{id}
   */
  getCandidateProfileById: async (id) => {
    return await apiClient.get(`/profile/candidate/${id}`);
  },

  /**
   * Lấy danh sách liên kết mạng xã hội / portfolio của ứng viên theo ID
   * Backend endpoint: GET /api/candidates/{candidateId}/links
   */
  getCandidateLinksById: async (candidateId) => {
    return await apiClient.get(`/candidates/${candidateId}/links`);
  },

  /**
   * Lấy danh sách liên kết mạng xã hội / portfolio của ứng viên
   * Backend endpoint: GET /api/candidates/me/links
   */
  getCandidateLinks: async () => {
    return await apiClient.get('/candidates/me/links');
  },

  /**
   * Thêm liên kết mạng xã hội / portfolio mới
   * Backend endpoint: POST /api/candidates/me/links
   */
  addCandidateLink: async (linkData) => {
    return await apiClient.post('/candidates/me/links', linkData);
  },

  /**
   * Cập nhật liên kết
   * Backend endpoint: PUT /api/candidates/me/links/{id}
   */
  updateCandidateLink: async (id, linkData) => {
    return await apiClient.put(`/candidates/me/links/${id}`, linkData);
  },

  /**
   * Xóa liên kết
   * Backend endpoint: DELETE /api/candidates/me/links/{id}
   */
  deleteCandidateLink: async (id) => {
    return await apiClient.delete(`/candidates/me/links/${id}`);
  },
};

export const {
  getCandidateProfile,
  getCandidateProfileById,
  updateCandidateProfile,
  createCandidateProfile,
  getMyProfile,
  getRecruiterProfile,
  getCandidateLinks,
  getCandidateLinksById,
  addCandidateLink,
  updateCandidateLink,
  deleteCandidateLink,
} = profileApi;

export default profileApi;
