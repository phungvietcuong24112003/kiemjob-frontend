/**
 * cvApi.js - Quản lý các lệnh gọi API liên quan đến CV (Curriculum Vitae)
 *
 * Kết nối với các backend endpoints:
 * - CV chính:         /api/candidates/{candidateId}/cvs
 * - Trạng thái:       /api/candidates/{candidateId}/cvs/{cvId}/public
 * - Phân tích CV:    /api/candidates/{candidateId}/cvs/{cvId}/analyses
 */

import { apiClient } from './client';
import { USER } from '../../config/storageKeys';
import { ROLES } from '../../domain/constants/roles';

// Cache candidateId của user hiện tại
let cachedCurrentCandidateId = null;

/**
 * Lấy candidateId của tài khoản hiện tại từ localStorage hoặc backend API
 */
export const getCurrentCandidateId = async () => {
  if (cachedCurrentCandidateId) return cachedCurrentCandidateId;

  // 1. Thử lấy từ localStorage 'kiemjob_user'
  try {
    const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem(USER) : null;
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u?.candidateId) {
        cachedCurrentCandidateId = u.candidateId;
        return cachedCurrentCandidateId;
      }
    }
  } catch {}

  // 2. Gọi backend lấy hồ sơ ứng viên hiện tại (GET /api/profile/candidate)
  try {
    const profile = await apiClient.get('/profile/candidate');
    if (profile?.id) {
      cachedCurrentCandidateId = profile.id;
      return cachedCurrentCandidateId;
    }
  } catch {}

  // 3. Fallback sang /profile/me hoặc /auth/me
  try {
    const me = await apiClient.get('/profile/me');
    if (me?.candidateId || me?.id) {
      cachedCurrentCandidateId = me.candidateId || me.id;
      return cachedCurrentCandidateId;
    }
  } catch {}

  try {
    const authMe = await apiClient.get('/auth/me');
    if (authMe?.candidateId) {
      cachedCurrentCandidateId = authMe.candidateId;
      return cachedCurrentCandidateId;
    }
  } catch {}

  return null;
};

// Đặt lại cache khi phiên đăng nhập thay đổi
if (typeof window !== 'undefined') {
  window.addEventListener('authChange', () => {
    cachedCurrentCandidateId = null;
  });
}

/**
 * Đảm bảo candidateId luôn là candidateId của chính user nếu người dùng là ứng viên.
 * Tránh lỗi 403 Forbidden do IDOR trên backend.
 */
export const resolveCandidateId = async (candidateId) => {
  let currentUserRole = null;
  try {
    const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem(USER) : null;
    if (userStr) {
      currentUserRole = JSON.parse(userStr)?.role;
    }
  } catch {}

  if (!candidateId || currentUserRole === ROLES.CANDIDATE) {
    const selfId = await getCurrentCandidateId();
    if (selfId) {
      return selfId;
    }
  }

  if (candidateId) {
    return candidateId;
  }

  throw new Error('Chưa xác định được ID hồ sơ ứng viên hiện tại');
};

// ==================== CV (bảng cvs) ====================

/**
 * Lấy tất cả CV của ứng viên
 */
export const getCvs = async (candidateId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs`);
};

/**
 * Lấy chi tiết 1 CV
 */
export const getCvById = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}`);
};

/**
 * Tạo CV mới
 */
export const createCv = async (candidateId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs`, data);
};

/**
 * Cập nhật CV
 */
export const updateCv = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}`, data);
};

/**
 * Xóa CV
 */
export const deleteCv = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}`);
};

/**
 * Bật / tắt trạng thái công khai của CV (cho phép nhà tuyển dụng tìm kiếm)
 */
export const setCvPublicStatus = async (candidateId, cvId, isPublic = true) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.patch(`/candidates/${cid}/cvs/${cvId}/public?isPublic=${isPublic}`);
};

// ==================== Phân tích CV (AI Analysis) ====================

export const getCvAnalyses = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/analyses`);
};

export const getLatestCvAnalysis = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/analyses/latest`);
};

export const scoreCv = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/analyses/score`, data);
};

// ==================== Export mặc định ====================

export const cvApi = {
  getCurrentCandidateId,
  resolveCandidateId,
  getCvs,
  getCvById,
  createCv,
  updateCv,
  deleteCv,
  setCvPublicStatus,
  getCvAnalyses,
  getLatestCvAnalysis,
  scoreCv,
};

export default cvApi;
