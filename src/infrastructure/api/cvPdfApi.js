/**
 * cvPdfApi.js - Quản lý các lệnh gọi API liên quan đến file PDF của CV
 *
 * Backend endpoints:
 * - POST   /api/cvs/{cvId}/pdf          -> Upload file PDF (MultipartFile)
 * - GET    /api/cvs/{cvId}/pdf          -> Lấy thông tin file PDF hiện hành
 * - GET    /api/cvs/{cvId}/pdf/download -> Lấy URL tải xuống presigned từ S3
 * - GET    /api/cvs/{cvId}/pdf/versions -> Lấy danh sách các phiên bản PDF
 * - DELETE /api/cvs/{cvId}/pdf/{pdfId}  -> Xóa phiên bản PDF
 */

import { apiClient } from './client';

/**
 * Tải file PDF lên cho một CV
 * @param {number|string} cvId
 * @param {File} file
 * @returns {Promise<{ file: Object, downloadUrl: string }>}
 */

export const uploadCvPdf = (cvId, file) => {
  if (!(file instanceof File)) {
    throw new Error('Dữ liệu upload không phải là File');
  }

  console.log('[CV PDF] CV ID:', cvId);
  console.log('[CV PDF] Tên file:', file.name);
  console.log('[CV PDF] MIME type:', file.type);
  console.log('[CV PDF] Kích thước:', file.size, 'bytes');

  if (file.size === 0) {
    throw new Error('File PDF đang rỗng');
  }

  const formData = new FormData();
  formData.append('file', file, file.name);

  return apiClient.post(`/cvs/${cvId}/pdf`, formData);
};

/**
 * Lấy thông tin metadata của file PDF hiện hành của CV
 * @param {number|string} cvId
 * @returns {Promise<Object>}
 */
export const getCurrentCvPdf = (cvId) =>
  apiClient.get(`/cvs/${cvId}/pdf`);

/**
 * Lấy presigned URL tải xuống file PDF từ S3
 * @param {number|string} cvId
 * @returns {Promise<{ downloadUrl: string }>}
 */
export const getCvPdfDownloadUrl = (cvId) =>
  apiClient.get(`/cvs/${cvId}/pdf/download`);

/**
 * Lấy danh sách tất cả các phiên bản PDF của CV
 * @param {number|string} cvId
 * @returns {Promise<Array<Object>>}
 */
export const getCvPdfVersions = (cvId) =>
  apiClient.get(`/cvs/${cvId}/pdf/versions`);

/**
 * Xóa một phiên bản PDF
 * @param {number|string} cvId
 * @param {number|string} pdfId
 */
export const deleteCvPdfVersion = (cvId, pdfId) =>
  apiClient.delete(`/cvs/${cvId}/pdf/${pdfId}`);

export const cvPdfApi = {
  upload: uploadCvPdf,
  getCurrent: getCurrentCvPdf,
  getDownloadUrl: getCvPdfDownloadUrl,
  getVersions: getCvPdfVersions,
  deleteVersion: deleteCvPdfVersion,
};

export default cvPdfApi;
