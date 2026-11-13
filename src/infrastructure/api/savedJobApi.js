import { apiClient } from './client';

export const savedJobApi = {
  /**
   * Lấy danh sách việc làm đã lưu của tài khoản hiện tại
   * Backend: GET /api/saved-jobs
   */
  getSavedJobs: async () => {
    const data = await apiClient.get('/saved-jobs');
    return data?.data !== undefined ? data.data : data;
  },

  /**
   * Lưu việc làm
   * Backend: POST /api/saved-jobs
   * @param {number|string|object} param - ID của tin tuyển dụng hoặc { jobId: ... }
   */
  saveJob: async (param) => {
    const id = typeof param === 'object' && param !== null ? (param.jobId ?? param.id) : param;
    return await apiClient.post('/saved-jobs', { jobId: Number(id) });
  },

  /**
   * Kiểm tra tin tuyển dụng đã được lưu chưa
   * Backend: GET /api/saved-jobs/check/{jobId}
   * @param {number|string|object} param
   */
  isSaved: async (param) => {
    const id = typeof param === 'object' && param !== null ? (param.jobId ?? param.id) : param;
    const data = await apiClient.get(`/saved-jobs/check/${id}`);
    return data?.data !== undefined ? data.data : data;
  },

  /**
   * Bỏ lưu việc làm
   * Backend: DELETE /api/saved-jobs/{jobId}
   * @param {number|string|object} param
   */
  removeSavedJob: async (param) => {
    const id = typeof param === 'object' && param !== null ? (param.jobId ?? param.id) : param;
    return await apiClient.delete(`/saved-jobs/${id}`);
  },
};

export const { getSavedJobs, saveJob, isSaved, removeSavedJob } = savedJobApi;
export default savedJobApi;
