/**
 * client.js - Cấu hình HTTP Client cơ bản kết nối Frontend với Backend
 * 
 * Mục đích:
 * - Tập trung cấu hình Base URL tại một nơi duy nhất.
 * - Sử dụng hàm fetch() có sẵn của JavaScript.
 * - Tự động gắn headers JSON, truyền Cookie (credentials: 'include') và trích xuất lỗi dễ hiểu.
 */

import { API_BASE } from '../../config/site';
import { USER } from '../../config/storageKeys';

// Địa chỉ gốc của Backend API (đi qua proxy /api của Vite để tránh cross-origin)
const BASE_URL = API_BASE;

/**
 * Hàm gọi API chung (request helper)
 * @param {string} endpoint - Đường dẫn sau BASE_URL (VD: '/auth/login', '/auth/register')
 * @param {object} options  - Cấu hình fetch (method, headers, body, params, v.v.)
 */
export async function request(endpoint, options = {}) {
  // Chuẩn hóa endpoint: xử lý nếu endpoint có hoặc không có prefix '/api'
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint === '/api') {
    cleanEndpoint = '';
  } else if (cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.slice(4); // Cắt bỏ '/api' vì BASE_URL đã có '/api'
  }

  // Tự động serialize options.params thành query parameters
  let queryStr = '';
  if (options.params && typeof options.params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          val.forEach((item) => {
            if (item !== undefined && item !== null && item !== '') {
              searchParams.append(key, item);
            }
          });
        } else {
          searchParams.append(key, val);
        }
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      queryStr = (cleanEndpoint.includes('?') ? '&' : '?') + qs;
    }
  }

  const url = `${BASE_URL}${cleanEndpoint}${queryStr}`;

  // Kiểm tra xem body có phải FormData không (dùng cho upload file)
  const isFormData = options.body instanceof FormData;

  // Cấu hình headers mặc định gửi nhận JSON (dùng cookie HttpOnly cho xác thực)
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  // Cấu hình request kèm credentials để lưu và gửi nhận HttpOnly Cookie (access_token)
  const config = {
    credentials: 'include',
    ...options,
    headers,
  };

  // Nếu có body và là dạng object, tự động chuyển thành chuỗi JSON
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Nếu HTTP status code không nằm trong khoảng 200 - 299 thì coi như có lỗi
    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = null;
      let errorMessage = response.statusText;
      try {
        errorJson = JSON.parse(errorText);
        if (errorJson && errorJson.message) {
          errorMessage = errorJson.message;
        } else if (typeof errorJson === 'string') {
          errorMessage = errorJson;
        }
      } catch {
        if (errorText) errorMessage = errorText;
      }

      // Xử lý 401 Unauthorized (trừ các endpoint auth công khai)
      const isAuthEndpoint =
        cleanEndpoint.includes('/auth/login') ||
        cleanEndpoint.includes('/auth/register') ||
        cleanEndpoint.includes('/auth/verify-email') ||
        cleanEndpoint.includes('/auth/resend-otp') ||
        cleanEndpoint.includes('/auth/forgot-password') ||
        cleanEndpoint.includes('/auth/verify-reset-otp') ||
        cleanEndpoint.includes('/auth/reset-password');

      if (response.status === 401 && !isAuthEndpoint) {
        if (typeof document !== 'undefined') {
          document.cookie = 'logged_in=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
        }
        if (typeof localStorage !== 'undefined') {
          const hadUser = localStorage.getItem(USER);
          if (hadUser) {
            localStorage.removeItem(USER);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('authChange'));
            }
          }
        }
      } else if (response.status === 403) {
        // 403 Forbidden: KHÔNG đăng xuất
        errorMessage = errorMessage || 'Bạn không có quyền thực hiện thao tác này';
      }

      const err = new Error(errorMessage || `Lỗi API [${response.status}]`);
      err.status = response.status;
      err.data = errorJson;
      throw err;
    }

    // Nếu backend trả về 204 No Content (ví dụ khi DELETE thành công), không cần parse JSON
    if (response.status === 204) {
      return null;
    }

    // Trả về dữ liệu JSON đã giải mã
    const jsonResult = await response.json();
    return jsonResult;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`[API Error] Lỗi khi gọi ${config.method || 'GET'} ${url}:`, error.message);
    }
    throw error;
  }
}

// Định nghĩa các phương thức gọi nhanh: get, post, put, patch, delete
export const apiClient = {
  // GET: Lấy dữ liệu
  get: (endpoint, options = {}) => request(endpoint, { method: 'GET', ...options }),

  // POST: Thêm mới dữ liệu
  post: (endpoint, body, options = {}) => request(endpoint, { method: 'POST', body, ...options }),

  // PUT: Cập nhật toàn bộ dữ liệu
  put: (endpoint, body, options = {}) => request(endpoint, { method: 'PUT', body, ...options }),

  // PATCH: Cập nhật một phần dữ liệu
  patch: (endpoint, body = null, options = {}) => request(endpoint, { method: 'PATCH', body, ...options }),

  // DELETE: Xóa dữ liệu
  delete: (endpoint, options = {}) => request(endpoint, { method: 'DELETE', ...options }),
};

export default apiClient;
