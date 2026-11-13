import { apiClient } from './client';

/**
 * Tìm kiếm CV ứng viên bằng AI 3 tầng
 * Backend: POST /api/recruiter/cv-search
 * @param {string} query Câu tìm kiếm tự nhiên (tối đa 300 ký tự)
 * @param {number} size Số lượng kết quả mong muốn (1 - 20, mặc định 10)
 * @returns {Promise<CvSearchResponse>}
 */
export const searchCvs = async (query, size = 10) => {
  return await apiClient.post('/recruiter/cv-search', { query, size });
};

export const cvSearchApi = {
  searchCvs,
};

export default cvSearchApi;

