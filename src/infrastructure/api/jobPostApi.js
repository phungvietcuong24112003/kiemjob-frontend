import { apiClient } from './client';

export const jobPostApi = {
  /**
   * Lấy danh sách tin tuyển dụng có phân trang và bộ lọc nâng cao.
   * Backend: GET /api/job-posts
   * Params: keyword, status, companyId, categoryId, provinceId,
   *         salaryMin, salaryMax, workingMode, skillIds, specializationId,
   *         page (0-based), size, sort ('newest' | 'salary_desc' | 'featured')
   * Trả về Page: { content, totalElements, totalPages, number, size }
   */
  getJobPosts: async (params = {}) => {
    return await apiClient.get('/job-posts', { params });
  },

  /**
   * Lấy danh sách tin tuyển dụng nổi bật.
   * Backend: GET /api/job-posts/featured
   * Params: categoryId (optional)
   */
  getFeaturedJobs: async (categoryId) => {
    return await apiClient.get('/job-posts/featured', {
      params: categoryId ? { categoryId } : {},
    });
  },

  /**
   * Lấy chi tiết một tin tuyển dụng.
   * Backend: GET /api/job-posts/{id}
   */
  getJobPostById: async (id) => {
    return await apiClient.get(`/job-posts/${id}`);
  },

  /**
   * Tạo tin tuyển dụng.
   * Backend: POST /api/job-posts
   * Recruiter không gửi companyId/postedById (backend tự lấy từ token). Chỉ Admin mới gửi.
   */
  createJobPost: async (jobPostData) => {
    const payload = { ...jobPostData };
    try {
      const stored = localStorage.getItem('kiemjob_user');
      const user = stored ? JSON.parse(stored) : null;
      if (user?.role !== 'admin') {
        delete payload.companyId;
        delete payload.postedById;
      }
    } catch {}
    return await apiClient.post('/job-posts', payload);
  },

  /**
   * Cập nhật tin tuyển dụng.
   * Backend: PUT /api/job-posts/{id}
   */
  updateJobPost: async (id, jobPostData) => {
    return await apiClient.put(`/job-posts/${id}`, jobPostData);
  },

  /**
   * Đổi trạng thái tin tuyển dụng.
   * Backend: PATCH /api/job-posts/{id}/status?status=open
   */
  updateJobPostStatus: async (id, status) => {
    return await apiClient.patch(`/job-posts/${id}/status`, null, {
      params: { status },
    });
  },

  /**
   * Xóa tin tuyển dụng.
   * Backend: DELETE /api/job-posts/{id}
   */
  deleteJobPost: async (id) => {
    return await apiClient.delete(`/job-posts/${id}`);
  },

  /**
   * Lấy danh sách chuyên môn của tin tuyển dụng.
   * Backend: GET /api/job-posts/{id}/specializations
   */
  getJobPostSpecializations: async (id) => {
    return await apiClient.get(`/job-posts/${id}/specializations`);
  },

  /**
   * Cập nhật danh sách chuyên môn của tin tuyển dụng.
   * Backend: PUT /api/job-posts/{id}/specializations
   */
  updateJobPostSpecializations: async (id, specializationIds) => {
    return await apiClient.put(`/job-posts/${id}/specializations`, {
      specializationIds,
    });
  },

  /**
   * Lấy danh sách danh mục ngành nghề.
   * Backend: GET /api/jobs-categories
   */
  getJobCategories: async () => {
    return await apiClient.get('/jobs-categories');
  },

  /**
   * Lấy một danh mục ngành nghề.
   * Backend: GET /api/jobs-categories/{id}
   */
  getJobCategoryById: async (id) => {
    return await apiClient.get(`/jobs-categories/${id}`);
  },

  /**
   * Tạo danh mục ngành nghề.
   * Backend: POST /api/jobs-categories
   */
  createJobCategory: async (categoryData) => {
    return await apiClient.post('/jobs-categories', categoryData);
  },

  /**
   * Cập nhật danh mục ngành nghề.
   * Backend: PUT /api/jobs-categories/{id}
   */
  updateJobCategory: async (id, categoryData) => {
    return await apiClient.put(`/jobs-categories/${id}`, categoryData);
  },

  /**
   * Xóa danh mục ngành nghề.
   * Backend: DELETE /api/jobs-categories/{id}
   */
  deleteJobCategory: async (id) => {
    return await apiClient.delete(`/jobs-categories/${id}`);
  },

  /**
   * Lấy danh sách mục chi tiết của tin tuyển dụng.
   * Backend: GET /api/job-posts/{jobId}/details
   */
  getJobDetails: async (jobId) => {
    return await apiClient.get(`/job-posts/${jobId}/details`);
  },

  /**
   * Lấy một mục chi tiết của tin tuyển dụng.
   * Backend: GET /api/job-posts/{jobId}/details/{detailId}
   */
  getJobDetailById: async (jobId, detailId) => {
    return await apiClient.get(
      `/job-posts/${jobId}/details/${detailId}`
    );
  },

  /**
   * Thêm mục chi tiết tin tuyển dụng.
   * Backend: POST /api/job-posts/{jobId}/details
   */
  createJobDetail: async (jobId, detailData) => {
    return await apiClient.post(
      `/job-posts/${jobId}/details`,
      detailData
    );
  },

  /**
   * Cập nhật mục chi tiết tin tuyển dụng.
   * Backend: PUT /api/job-posts/{jobId}/details/{detailId}
   */
  updateJobDetail: async (jobId, detailId, detailData) => {
    return await apiClient.put(
      `/job-posts/${jobId}/details/${detailId}`,
      detailData
    );
  },

  /**
   * Xóa mục chi tiết tin tuyển dụng.
   * Backend: DELETE /api/job-posts/{jobId}/details/{detailId}
   */
  deleteJobDetail: async (jobId, detailId) => {
    return await apiClient.delete(
      `/job-posts/${jobId}/details/${detailId}`
    );
  },

  /**
   * Lấy danh sách kỹ năng của tin tuyển dụng.
   * Backend: GET /api/job-posts/{jobId}/skills
   */
  getJobSkills: async (jobId) => {
    return await apiClient.get(`/job-posts/${jobId}/skills`);
  },

  /**
   * Lấy một kỹ năng của tin tuyển dụng.
   * Backend: GET /api/job-posts/{jobId}/skills/{skillId}
   */
  getJobSkillById: async (jobId, skillId) => {
    return await apiClient.get(
      `/job-posts/${jobId}/skills/${skillId}`
    );
  },

  /**
   * Thêm kỹ năng yêu cầu cho tin tuyển dụng.
   * Backend: POST /api/job-posts/{jobId}/skills
   */
  createJobSkill: async (jobId, skillData) => {
    return await apiClient.post(
      `/job-posts/${jobId}/skills`,
      skillData
    );
  },

  /**
   * Cập nhật kỹ năng yêu cầu của tin tuyển dụng.
   * Backend: PUT /api/job-posts/{jobId}/skills/{skillId}
   */
  updateJobSkill: async (jobId, skillId, skillData) => {
    return await apiClient.put(
      `/job-posts/${jobId}/skills/${skillId}`,
      skillData
    );
  },

  /**
   * Xóa kỹ năng yêu cầu của tin tuyển dụng.
   * Backend: DELETE /api/job-posts/{jobId}/skills/{skillId}
   */
  deleteJobSkill: async (jobId, skillId) => {
    return await apiClient.delete(
      `/job-posts/${jobId}/skills/${skillId}`
    );
  },

  /**
   * Lấy danh sách ứng viên nộp hồ sơ cho tin tuyển dụng.
   * Backend: GET /api/job-posts/{jobId}/applications
   */
  getJobApplications: async (jobId, params) => {
    return await apiClient.get(`/job-posts/${jobId}/applications`, { params });
  },

  /**
   * Lấy danh sách địa chỉ làm việc của tin tuyển dụng.
   * Backend: GET /api/job-addresses/job-post/{jobId} hoặc GET /api/job-posts/{jobId}/addresses
   */
  getJobAddresses: async (jobId) => {
    return await apiClient.get(`/job-addresses/job-post/${jobId}`);
  },

  /**
   * Thêm một địa chỉ làm việc cho tin tuyển dụng.
   * Backend: POST /api/job-addresses
   */
  createJobAddress: async (addressData) => {
    return await apiClient.post('/job-addresses', addressData);
  },

  /**
   * Cập nhật địa chỉ làm việc.
   * Backend: PUT /api/job-addresses/{id}
   */
  updateJobAddress: async (id, addressData) => {
    return await apiClient.put(`/job-addresses/${id}`, addressData);
  },

  /**
   * Xóa địa chỉ làm việc.
   * Backend: DELETE /api/job-addresses/{id}
   */
  deleteJobAddress: async (id) => {
    return await apiClient.delete(`/job-addresses/${id}`);
  },

  /**
   * Đồng bộ toàn bộ danh sách địa chỉ làm việc cho tin tuyển dụng.
   * Backend: PUT /api/job-addresses/job-post/{jobId}
   */
  syncJobAddresses: async (jobId, addresses) => {
    return await apiClient.put(`/job-addresses/job-post/${jobId}`, addresses);
  },
};

export const {
  getJobPosts,
  getFeaturedJobs,
  getJobPostById,
  createJobPost,
  updateJobPost,
  updateJobPostStatus,
  deleteJobPost,
  getJobPostSpecializations,
  updateJobPostSpecializations,
  getJobCategories,
  getJobCategoryById,
  createJobCategory,
  updateJobCategory,
  deleteJobCategory,
  getJobDetails,
  getJobDetailById,
  createJobDetail,
  updateJobDetail,
  deleteJobDetail,
  getJobSkills,
  getJobSkillById,
  createJobSkill,
  updateJobSkill,
  deleteJobSkill,
  getJobApplications,
  getJobAddresses,
  createJobAddress,
  updateJobAddress,
  deleteJobAddress,
  syncJobAddresses,
} = jobPostApi;

export default jobPostApi;