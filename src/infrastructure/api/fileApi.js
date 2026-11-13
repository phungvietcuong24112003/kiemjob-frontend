/**
 * fileApi.js - API tải file lên AWS S3 thông qua Backend
 *
 * Chức năng:
 * - uploadFile(file): Gửi file (ảnh JPEG/PNG/WebP, tối đa 5MB) lên backend endpoint
 *   POST /api/files/upload (multipart/form-data). Backend sẽ lưu file vào AWS S3 bucket
 *   và trả về { url, objectKey, bucket, message }.
 *
 * Sử dụng:
 *   import { uploadFile } from '../../infrastructure/api';
 *   const { url } = await uploadFile(fileObject);
 *   // url là đường dẫn public trên S3 để hiển thị ảnh
 */

/**
 * fileApi.js - API tải file lên AWS S3 thông qua Backend
 *
 * Chức năng:
 * - uploadFile(file): Gửi file (ảnh JPEG/PNG/WebP, tối đa 10MB) lên backend endpoint
 *   POST /api/files/upload (multipart/form-data) kèm cookie xác thực HttpOnly.
 */

const rawBase = import.meta.env?.VITE_API_URL || '/api';
const BASE_URL = rawBase.replace(/\/+$/, '');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Upload một file ảnh lên AWS S3 qua backend
 * @param {File} file - File ảnh (JPEG, PNG, WebP), tối đa 10MB
 * @returns {Promise<{url: string, objectKey: string, bucket: string, message: string}>}
 */
export async function uploadFile(file) {
  if (!file) {
    throw new Error('Vui lòng chọn file để tải lên');
  }

  // Kiểm tra loại file client-side
  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    const err = new Error('Chỉ chấp nhận file ảnh định dạng JPEG, PNG hoặc WebP');
    err.status = 415;
    throw err;
  }

  // Kiểm tra kích thước file client-side
  if (file.size && file.size > MAX_IMAGE_SIZE) {
    const err = new Error('Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 10MB)');
    err.status = 413;
    throw err;
  }

  // Tạo FormData chứa file
  const formData = new FormData();
  formData.append('file', file);

  const cleanBase = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;
  const uploadUrl = `${cleanBase}/files/upload`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = '';

    if (response.status === 401) {
      errorMessage = 'Vui lòng đăng nhập để tải file lên';
    } else if (response.status === 413) {
      errorMessage = 'Dung lượng file vượt quá giới hạn cho phép (tối đa 10MB)';
    } else if (response.status === 415) {
      errorMessage = 'Chỉ chấp nhận file ảnh định dạng JPEG, PNG hoặc WebP';
    } else {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.message) errorMessage = errorJson.message;
      } catch {
        if (errorText) errorMessage = errorText;
      }
    }

    const err = new Error(errorMessage || `Lỗi tải file lên server [${response.status}]`);
    err.status = response.status;
    throw err;
  }

  return await response.json();
}

export const fileApi = { uploadFile };
export default fileApi;
