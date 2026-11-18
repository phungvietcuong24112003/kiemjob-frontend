/**
 * authApi.js - Quản lý các lệnh gọi API xác thực (Authentication) kết nối Frontend với Backend.
 * 
 * Tác dụng:
 * 1. sendOtp(email): Yêu cầu hệ thống tạo và gửi mã xác thực 6 số vào Gmail của người dùng.
 * 2. verifyOtp(email, otp): Kiểm tra mã xác thực có hợp lệ hay không trước khi đăng ký.
 * 3. register(data): Gửi thông tin đăng ký tài khoản (kèm mã OTP Gmail) lên máy chủ.
 * 4. login(data): Đăng nhập bằng Email và Mật khẩu, nhận JWT token và thông tin tài khoản.
 */

import { apiClient } from './client';
import { USER } from '../../config/storageKeys';
import { webSocketService } from '../websocket/WebSocketService';

export const authApi = {
  /**
   * Gửi mã OTP xác nhận tới địa chỉ Gmail
   * @param {string} email - Địa chỉ Gmail người dùng nhập vào ô đăng ký
   * @returns {Promise<{ message: string, email: string, success: boolean }>}
   */
  sendOtp: async (email) => {
    return await apiClient.post('/auth/send-otp', { email });
  },

  /**
   * Kiểm tra mã xác nhận OTP Gmail
   * @param {string} email - Gmail đã nhận mã
   * @param {string} otp   - Mã 6 chữ số người dùng nhập
   * @returns {Promise<{ message: string, valid: boolean, success: boolean }>}
   */
  verifyOtp: async (email, otp) => {
    return await apiClient.post('/auth/verify-otp', { email, otp });
  },

  /**
   * Đăng ký tài khoản mới (Ứng viên hoặc Nhà tuyển dụng)
   * @param {object} data - { email, password, phone, role, otp, fullName }
   * @returns {Promise<object>} - Thông tin tài khoản AccountResponse từ Backend
   */
  register: async (data) => {
    return await apiClient.post('/auth/register', data);
  },

  /**
   * Đăng ký tài khoản Ứng viên (chỉ email + password)
   * Backend endpoint: POST /api/auth/register/candidate
   * @param {object} data - { email, password }
   * @returns {Promise<{ message: string }>}
   */
  registerCandidate: async (data) => {
    return await apiClient.post('/auth/register/candidate', data);
  },

  /**
   * Đăng ký tài khoản Nhà tuyển dụng (email + password)
   * Chức năng: Gửi thông tin email và mật khẩu của nhà tuyển dụng lên backend để tạo tài khoản
   * và tự động phát hành mã xác thực OTP gửi về Gmail.
   * Backend endpoint: POST /api/auth/register/recruiter
   * @param {object} data - { email, password }
   * @returns {Promise<{ message: string }>}
   */
  registerRecruiter: async (data) => {
    return await apiClient.post('/auth/register/recruiter', data);
  },

  /**
   * Đăng nhập tài khoản
   * @param {object} credentials - { email, password }
   * @returns {Promise<object>} - Thông tin LoginResponse gồm token và account
   */
  login: async (credentials) => {
    return await apiClient.post('/auth/login', credentials);
  },

  /**
   * Đăng nhập / Đăng ký nhanh bằng Google OAuth
   * @param {object} payload - { code, accessToken, idToken, redirectUri, role }
   * @returns {Promise<object>} - Thông tin AccountResponse
   */
  loginWithGoogle: async (payload) => {
    return await apiClient.post('/auth/google', payload);
  },

  /**
   * Gửi mã xác nhận đăng nhập qua Gmail cho Nhà tuyển dụng
   * @param {string} email - Địa chỉ email doanh nghiệp / tuyển dụng
   * @returns {Promise<{ message: string, email: string, success: boolean }>}
   */
  sendRecruiterLoginOtp: async (email) => {
    return await apiClient.post('/auth/recruiter/send-otp', { email });
  },

  /**
   * Đăng nhập Nhà tuyển dụng bằng mã xác nhận Gmail (OTP)
   * @param {object} data - { email, otp }
   * @returns {Promise<object>} - Thông tin LoginResponse gồm account, token, recruiterId, companyName...
   */
  loginRecruiterOtp: async (data) => {
    return await apiClient.post('/auth/recruiter/login-otp', data);
  },

  /**
   * Gửi lại mã OTP qua email
   * @param {string} email
   * @returns {Promise<{ message: string }>}
   */
  resendOtp: async (email) => {
    return await apiClient.post('/auth/resend-otp', { email });
  },

  /**
   * Xác minh email bằng mã OTP (nhận cookie JWT)
   * @param {string} email
   * @param {string} otp
   * @returns {Promise<object>} AccountResponse
   */
  verifyEmail: async (email, otp) => {
    return await apiClient.post('/auth/verify-email', { email, otp });
  },

  /**
   * Quên mật khẩu: Yêu cầu gửi OTP đặt lại mật khẩu qua Gmail
   * @param {string} email
   */
  forgotPassword: async (email) => {
    return await apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Xác thực mã OTP đặt lại mật khẩu
   * @param {string} email
   * @param {string} otp
   */
  verifyResetOtp: async (email, otp) => {
    return await apiClient.post('/auth/verify-reset-otp', { email, otp });
  },

  /**
   * Đặt lại mật khẩu mới
   * @param {object} data - { email, otp, newPassword }
   */
  resetPassword: async (data) => {
    return await apiClient.post('/auth/reset-password', data);
  },

  /**
   * Lấy thông tin tài khoản hiện tại từ session/cookie
   */
  getMe: async () => {
    return await apiClient.get('/auth/me');
  },

  /**
   * Đăng xuất khỏi hệ thống: gọi API backend để clear HttpOnly cookie access_token,
   * đồng thời xóa toàn bộ cookie trên trình duyệt và localStorage.
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Backend logout request failed, continuing client cleanup:', e);
    }
    // Xóa tất cả cookie mà JavaScript có thể truy cập
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};`;
        }
      }
    }
    // Xóa dữ liệu phiên trong localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(USER);
    }
    // Ngắt kết nối WebSocket và xóa subscriptions cũ
    try {
      webSocketService.disconnect();
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('authChange'));
    }
  },

  /**
   * Cập nhật hồ sơ nhà tuyển dụng (POST hoặc PUT)
   */
  saveRecruiterProfile: async (data) => {
    return await apiClient.post('/profile/recruiter', data);
  },

  updateRecruiterProfile: async (data) => {
    return await apiClient.put('/profile/recruiter', data);
  },

  /**
 * Lấy danh sách địa chỉ công ty
 * Backend: GET /api/companies/{companyId}/addresses
 * @param {number|string} companyId - ID công ty
 */
  getCompanyAddresses: async (companyId) => {
    return await apiClient.get(`/companies/${companyId}/addresses`);
  },

  /**
   * Lấy thông tin công ty, bao gồm URL logo/avatar
   * Backend: GET /api/companies/{companyId}
   * @param {number|string} companyId - ID công ty
   */
  getCompanyById: async (companyId) => {
    return await apiClient.get(`/companies/${companyId}`);
  },

  /**
   * Thêm địa chỉ công ty vào bảng company_address
   */
  addCompanyAddress: async (companyId, addressData) => {
    return await apiClient.post(`/companies/${companyId}/addresses`, addressData);
  },

  /**
   * Cập nhật địa chỉ công ty
   */
  updateCompanyAddress: async (companyId, addressId, addressData) => {
    return await apiClient.put(`/companies/${companyId}/addresses/${addressId}`, addressData);
  },

  /**
   * Xóa địa chỉ công ty
   */
  deleteCompanyAddress: async (companyId, addressId) => {
    return await apiClient.delete(`/companies/${companyId}/addresses/${addressId}`);
  },

  /**
   * Lấy danh sách giấy phép kinh doanh
   */
  getCompanyLicenses: async (companyId) => {
    return await apiClient.get(`/companies/${companyId}/licenses`);
  },

  /**
   * Thêm giấy phép kinh doanh vào bảng company_license
   */
  /**
   * Thêm giấy phép kinh doanh vào bảng company_license
   */
  addCompanyLicense: async (companyId, licenseData) => {
    const payload = typeof licenseData === 'string'
      ? { fileUrl: licenseData }
      : { fileUrl: licenseData?.fileUrl || licenseData?.licenseUrl || '' };
    return await apiClient.post(`/companies/${companyId}/licenses`, payload);
  },

  /**
   * Xóa giấy phép kinh doanh
   */
  deleteCompanyLicense: async (companyId, licenseId) => {
    return await apiClient.delete(`/companies/${companyId}/licenses/${licenseId}`);
  },

  /**
   * Lấy danh sách hình ảnh hoạt động công ty
   */
  getCompanyImages: async (companyId) => {
    return await apiClient.get(`/companies/${companyId}/images`);
  },

  /**
   * Thêm hình ảnh hoạt động công ty
   */
  addCompanyImage: async (companyId, imageData) => {
    const payload = typeof imageData === 'string' ? { url: imageData } : { url: imageData?.url || '' };
    return await apiClient.post(`/companies/${companyId}/images`, payload);
  },

  /**
   * Xóa hình ảnh hoạt động công ty
   */
  deleteCompanyImage: async (companyId, imageId) => {
    return await apiClient.delete(`/companies/${companyId}/images/${imageId}`);
  },
};

// Export các hàm riêng lẻ để import thuận tiện
export const {
  sendOtp,
  verifyOtp,
  register,
  registerCandidate,
  login,
  loginWithGoogle,
  sendRecruiterLoginOtp,
  loginRecruiterOtp,
  registerRecruiter,
  resendOtp,
  verifyEmail,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getMe,
  logout,
  getRecruiterProfile,
  saveRecruiterProfile,
  updateRecruiterProfile,
  getCompanyAddresses,
  getCompanyById,
  addCompanyAddress,
  updateCompanyAddress,
  deleteCompanyAddress,
  getCompanyLicenses,
  addCompanyLicense,
  deleteCompanyLicense,
  getCompanyImages,
  addCompanyImage,
  deleteCompanyImage,
} = authApi;

export default authApi;


