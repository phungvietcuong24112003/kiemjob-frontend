/**
 * cvApi.js - Quản lý các lệnh gọi API liên quan đến CV (Curriculum Vitae)
 * 
 * Kết nối với các backend endpoints:
 * - CV chính:         /api/candidates/{candidateId}/cvs
 * - Học vấn:          /api/candidates/{candidateId}/cvs/{cvId}/educations
 * - Kinh nghiệm:     /api/candidates/{candidateId}/cvs/{cvId}/work-experiences
 * - Kỹ năng CV:       /api/candidates/{candidateId}/cvs/{cvId}/skill-groups
 * - Thông tin thêm:   /api/candidates/{candidateId}/cvs/{cvId}/mores
 * - Chứng chỉ:       /api/candidates/{candidateId}/cvs/{cvId}/certificates
 * - Giải thưởng:     /api/candidates/{candidateId}/cvs/{cvId}/awards
 * - Sở thích:        /api/candidates/{candidateId}/cvs/{cvId}/hobbies
 * - Dự án:           /api/candidates/{candidateId}/cvs/{cvId}/projects
 * - Phân tích CV:    /api/candidates/{candidateId}/cvs/{cvId}/analyses
 * - Skills master:    /api/skills
 */

import { apiClient } from './client';

// Cache candidateId của user hiện tại
let cachedCurrentCandidateId = null;

/**
 * Lấy candidateId của tài khoản hiện tại từ localStorage hoặc backend API (/profile/candidate, /profile/me)
 */
export const getCurrentCandidateId = async () => {
  if (cachedCurrentCandidateId) return cachedCurrentCandidateId;

  // 1. Thử lấy từ localStorage 'kiemjob_user'
  try {
    const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem('kiemjob_user') : null;
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
    const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem('kiemjob_user') : null;
    if (userStr) {
      currentUserRole = JSON.parse(userStr)?.role;
    }
  } catch {}

  // Nếu là ứng viên (hoặc không truyền candidateId): bắt buộc lấy candidateId của chính user
  if (!candidateId || currentUserRole === 'candidate') {
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


// ==================== CV Education (bảng cv_educations) ====================

export const getCvEducations = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/educations`);
};

export const createCvEducation = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/educations`, data);
};

export const updateCvEducation = async (candidateId, cvId, educationId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/educations/${educationId}`, data);
};

export const deleteCvEducation = async (candidateId, cvId, educationId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/educations/${educationId}`);
};


// ==================== CV Work Experience (bảng cv_work_experiences) ====================

export const getCvWorkExperiences = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/work-experiences`);
};

export const createCvWorkExperience = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/work-experiences`, data);
};

export const updateCvWorkExperience = async (candidateId, cvId, experienceId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/work-experiences/${experienceId}`, data);
};

export const deleteCvWorkExperience = async (candidateId, cvId, experienceId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/work-experiences/${experienceId}`);
};


// ==================== CV Skill Groups (bảng cv_skill_groups) ====================

export const getCvSkillGroups = async (candidateId, cvId) => {
  if (cvId === undefined) {
    const cid = await resolveCandidateId();
    return apiClient.get(`/candidates/${cid}/cvs/${candidateId}/skill-groups`);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/skill-groups`);
};

export const getCvSkillGroupById = async (candidateId, cvId, skillGroupId) => {
  if (skillGroupId === undefined) {
    const cid = await resolveCandidateId();
    return apiClient.get(`/candidates/${cid}/cvs/${candidateId}/skill-groups/${cvId}`);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/skill-groups/${skillGroupId}`);
};

export const createCvSkillGroup = async (candidateId, cvId, data) => {
  if (data === undefined) {
    const cid = await resolveCandidateId();
    return apiClient.post(`/candidates/${cid}/cvs/${candidateId}/skill-groups`, cvId);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/skill-groups`, data);
};

export const updateCvSkillGroup = async (candidateId, cvId, skillGroupId, data) => {
  if (data === undefined) {
    const cid = await resolveCandidateId();
    return apiClient.put(`/candidates/${cid}/cvs/${candidateId}/skill-groups/${cvId}`, skillGroupId);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/skill-groups/${skillGroupId}`, data);
};

export const deleteCvSkillGroup = async (candidateId, cvId, skillGroupId) => {
  if (skillGroupId === undefined) {
    const cid = await resolveCandidateId();
    return apiClient.delete(`/candidates/${cid}/cvs/${candidateId}/skill-groups/${cvId}`);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/skill-groups/${skillGroupId}`);
};

export const getCvSkills = getCvSkillGroups;
export const createCvSkill = createCvSkillGroup;
export const updateCvSkill = updateCvSkillGroup;
export const deleteCvSkill = deleteCvSkillGroup;


// ==================== CV More (bảng cv_mores) ====================

export const getCvMores = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/mores`);
};

export const createCvMore = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/mores`, data);
};

export const updateCvMore = async (candidateId, cvId, moreId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/mores/${moreId}`, data);
};

export const deleteCvMore = async (candidateId, cvId, moreId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/mores/${moreId}`);
};


// ==================== CV Certificate (bảng cv_certificate) ====================

export const getCvCertificates = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/certificates`);
};

export const getCvCertificateById = async (candidateId, cvId, certificateId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/certificates/${certificateId}`);
};

export const createCvCertificate = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/certificates`, data);
};

export const updateCvCertificate = async (candidateId, cvId, certificateId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/certificates/${certificateId}`, data);
};

export const deleteCvCertificate = async (candidateId, cvId, certificateId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/certificates/${certificateId}`);
};


// ==================== CV Awards (bảng cv_awards) ====================

export const getCvAwards = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/awards`);
};

export const getCvAwardById = async (candidateId, cvId, awardId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/awards/${awardId}`);
};

export const createCvAward = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/awards`, data);
};

export const updateCvAward = async (candidateId, cvId, awardId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/awards/${awardId}`, data);
};

export const deleteCvAward = async (candidateId, cvId, awardId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/awards/${awardId}`);
};


// ==================== CV Hobbies (bảng cv_hobbies) ====================

export const getCvHobbies = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/hobbies`);
};

export const getCvHobbyById = async (candidateId, cvId, hobbyId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/hobbies/${hobbyId}`);
};

export const createCvHobby = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/hobbies`, data);
};

export const updateCvHobby = async (candidateId, cvId, hobbyId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/hobbies/${hobbyId}`, data);
};

export const deleteCvHobby = async (candidateId, cvId, hobbyId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/hobbies/${hobbyId}`);
};


// ==================== CV Projects (bảng cv_projects) ====================

export const getCvProjects = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/projects`);
};

export const getCvProjectById = async (candidateId, cvId, projectId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/projects/${projectId}`);
};

export const createCvProject = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/projects`, data);
};

export const updateCvProject = async (candidateId, cvId, projectId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/projects/${projectId}`, data);
};

export const deleteCvProject = async (candidateId, cvId, projectId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/projects/${projectId}`);
};


// ==================== Skills Master (bảng skills) ====================

export const getAllSkills = () => apiClient.get('/skills');
export const getSkillsByCategory = (categoryId) => apiClient.get(`/skills/category/${categoryId}`);


// ==================== CV Analysis (bảng cv_analyses) ====================

export const getLatestCvAnalysis = async (cvId, candidateId = null) => {
  if (candidateId) {
    return apiClient.get(`/candidates/${candidateId}/cvs/${cvId}/analyses/latest`);
  }
  return apiClient.get(`/cvs/${cvId}/analyses/latest`);
};

export const getCvAnalyses = async (candidateId, cvId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/analyses`);
};

export const getCvAnalysisById = async (candidateId, cvId, analysisId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/analyses/${analysisId}`);
};

export const createCvAnalysis = async (candidateId, cvId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/analyses`, data);
};

export const updateCvAnalysis = async (candidateId, cvId, analysisId, data) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/analyses/${analysisId}`, data);
};

export const deleteCvAnalysis = async (candidateId, cvId, analysisId) => {
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/analyses/${analysisId}`);
};

/**
 * Chấm điểm và phân tích CV bằng AI (Groq API)
 * @param {number|string} [candidateId] ID của ứng viên (tùy chọn nếu đang đăng nhập tài khoản ứng viên)
 * @param {number|string} cvId ID của CV cần chấm điểm
 * @param {Object} [data] Dữ liệu bổ sung (jobPostId, targetJobTitle, targetJobLevel...)
 */
export const scoreCv = async (candidateId, cvId, data) => {
  if (data === undefined && typeof cvId === 'object') {
    const actualCvId = candidateId;
    const actualData = cvId;
    const cid = await resolveCandidateId();
    return apiClient.post(`/candidates/${cid}/cvs/${actualCvId}/analyses/score`, actualData);
  }
  if (cvId === undefined) {
    const actualCvId = candidateId;
    const cid = await resolveCandidateId();
    return apiClient.post(`/candidates/${cid}/cvs/${actualCvId}/analyses/score`);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.post(`/candidates/${cid}/cvs/${cvId}/analyses/score`, data);
};


// ==================== CV Section Orders ====================

export const getCvSectionOrders = async (candidateId, cvId) => {
  if (cvId === undefined) {
    const cid = await resolveCandidateId();
    return apiClient.get(`/candidates/${cid}/cvs/${candidateId}/section-orders`);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/section-orders`);
};

export const saveCvSectionOrders = (cvId, payload) =>
  apiClient.put(`/cvs/${cvId}/section-orders`, {
    sectionOrders: payload,
  });

export const initializeCvSectionOrders = (cvId) =>
  apiClient.post(`/cvs/${cvId}/section-orders/initialize`);


// ==================== CV Career Objective ====================

export const getCvCareerObjective = async (candidateId, cvId) => {
  if (cvId === undefined) {
    const cid = await resolveCandidateId();
    return apiClient.get(`/candidates/${cid}/cvs/${candidateId}/career-objective`);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.get(`/candidates/${cid}/cvs/${cvId}/career-objective`);
};

export const saveCvCareerObjective = async (candidateId, cvId, data) => {
  if (data === undefined) {
    const cid = await resolveCandidateId();
    return apiClient.put(`/candidates/${cid}/cvs/${candidateId}/career-objective`, cvId);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.put(`/candidates/${cid}/cvs/${cvId}/career-objective`, data);
};

export const deleteCvCareerObjective = async (candidateId, cvId) => {
  if (cvId === undefined) {
    const cid = await resolveCandidateId();
    return apiClient.delete(`/candidates/${cid}/cvs/${candidateId}/career-objective`);
  }
  const cid = await resolveCandidateId(candidateId);
  return apiClient.delete(`/candidates/${cid}/cvs/${cvId}/career-objective`);
};


// ==================== Export mặc định ====================

export const cvApi = {
  getCurrentCandidateId,
  resolveCandidateId,
  // Career Objective
  getCvCareerObjective,
  saveCvCareerObjective,
  deleteCvCareerObjective,
  // Section Orders
  getCvSectionOrders,
  saveCvSectionOrders,
  initializeCvSectionOrders,
  // CV
  getCvs,
  getCvById,
  createCv,
  updateCv,
  deleteCv,
  // Education
  getCvEducations,
  createCvEducation,
  updateCvEducation,
  deleteCvEducation,
  // Work Experience
  getCvWorkExperiences,
  createCvWorkExperience,
  updateCvWorkExperience,
  deleteCvWorkExperience,
  // Skill Groups
  getCvSkillGroups,
  getCvSkillGroupById,
  createCvSkillGroup,
  updateCvSkillGroup,
  deleteCvSkillGroup,
  // Skills aliases
  getCvSkills,
  createCvSkill,
  updateCvSkill,
  deleteCvSkill,
  // More
  getCvMores,
  createCvMore,
  updateCvMore,
  deleteCvMore,
  // Certificates
  getCvCertificates,
  getCvCertificateById,
  createCvCertificate,
  updateCvCertificate,
  deleteCvCertificate,
  // Awards
  getCvAwards,
  getCvAwardById,
  createCvAward,
  updateCvAward,
  deleteCvAward,
  // Hobbies
  getCvHobbies,
  getCvHobbyById,
  createCvHobby,
  updateCvHobby,
  deleteCvHobby,
  // Projects
  getCvProjects,
  getCvProjectById,
  createCvProject,
  updateCvProject,
  deleteCvProject,
  // Analysis
  getLatestCvAnalysis,
  getCvAnalyses,
  getCvAnalysisById,
  createCvAnalysis,
  updateCvAnalysis,
  deleteCvAnalysis,
  scoreCv,
  // Master Skills
  getAllSkills,
  getSkillsByCategory,
};

export default cvApi;
