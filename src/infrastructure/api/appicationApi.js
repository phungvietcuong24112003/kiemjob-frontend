/**
 * applicationApi.js - Quản lý toàn bộ API liên quan đến Ứng tuyển & AI Scoring
 *
 * Kết nối Controller Spring Boot:
 * @RequestMapping("/api") -> ApplicationController.java
 */

import apiClient from './client';

export const applicationApi = {
    /**
     * Ứng tuyển vào một tin tuyển dụng
     * Backend: POST /api/job-posts/{jobPostId}/applications
     */
    async apply(jobPostId, application) {
        if (!jobPostId) {
            throw new Error('ID tin tuyển dụng không hợp lệ');
        }
        return await apiClient.post(`/job-posts/${jobPostId}/applications`, application);
    },

    /**
     * Lấy tất cả đơn ứng tuyển của tài khoản đang đăng nhập (Candidate).
     * Backend: GET /api/applications
     */
    async getMyApplications() {
        return await apiClient.get('/applications');
    },

    /**
     * Lấy danh sách đơn ứng tuyển theo CV
     */
    async getApplicationsByCv(cvId) {
        if (!cvId) return [];
        return await apiClient.get('/applications', {
            params: { cvId },
        });
    },

    /**
     * Lấy danh sách đơn ứng tuyển theo candidateId
     */
    async getApplicationsByCandidate(candidateId) {
        if (!candidateId) return [];
        return await apiClient.get('/applications', {
            params: { candidateId },
        });
    },

    /**
     * Lấy danh sách ứng viên ứng tuyển vào một tin tuyển dụng
     * Backend: GET /api/job-posts/{jobPostId}/applications
     */
    async getApplicationsByJobPost(jobPostId, params = {}) {
        if (!jobPostId) return [];
        return await apiClient.get(`/job-posts/${jobPostId}/applications`, {
            params,
        });
    },

    /**
     * Lấy danh sách đơn ứng tuyển tổng hợp cho nhà tuyển dụng (xuyên suốt các bài đăng)
     * Backend: GET /api/recruiter/applications
     */
    async getRecruiterApplications(params = {}) {
        return await apiClient.get('/recruiter/applications', {
            params,
        });
    },

    /**
     * Lấy chi tiết một đơn ứng tuyển
     * Backend: GET /api/applications/{id}
     */
    async getApplicationById(id) {
        if (!id) return null;
        return await apiClient.get(`/applications/${id}`);
    },

    /**
     * Cập nhật trạng thái đơn ứng tuyển đơn lẻ
     * Backend: PATCH /api/applications/{id}/status
     */
    async updateApplicationStatus(id, statusRequest) {
        if (!id) {
            throw new Error('ID đơn ứng tuyển không hợp lệ');
        }
        const payload = typeof statusRequest === 'string' ? { status: statusRequest } : statusRequest;
        return await apiClient.patch(`/applications/${id}/status`, payload);
    },

    /**
     * Cập nhật trạng thái ứng viên hàng loạt
     * Backend: PATCH /api/applications/status/bulk
     */
    async bulkUpdateApplicationStatus(ids, status) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error('Danh sách ID không hợp lệ');
        }
        return await apiClient.patch('/applications/status/bulk', {
            ids,
            status,
        });
    },

    /**
     * Chấm điểm CV so với yêu cầu bài post bằng AI (on-demand)
     * Backend: POST /api/applications/{id}/ai-score
     */
    async scoreApplication(id) {
        if (!id) throw new Error('ID đơn ứng tuyển không hợp lệ');
        return await apiClient.post(`/applications/${id}/ai-score`);
    },

    /**
     * Chấm điểm lại CV bằng AI (alias)
     */
    async rescoreApplication(id) {
        return this.scoreApplication(id);
    },

    /**
     * Rút đơn ứng tuyển
     * Backend: DELETE /api/applications/{id}
     */
    async withdrawApplication(id) {
        if (!id) throw new Error('ID đơn ứng tuyển không hợp lệ');
        return await apiClient.delete(`/applications/${id}`);
    },
};

export const {
    apply,
    getMyApplications,
    getApplicationsByCv,
    getApplicationsByCandidate,
    getApplicationsByJobPost,
    getRecruiterApplications,
    getApplicationById,
    updateApplicationStatus,
    bulkUpdateApplicationStatus,
    scoreApplication,
    rescoreApplication,
    withdrawApplication,
} = applicationApi;

export default applicationApi;
