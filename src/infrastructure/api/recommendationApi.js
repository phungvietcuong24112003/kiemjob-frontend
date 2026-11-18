import { apiClient } from './client';

export const recommendationApi = {
  /**
   * Ghi nhận tương tác của ứng viên với tin tuyển dụng (VIEW, SEARCH_CLICK, SAVE, APPLY)
   * @param {{ jobId: number, actionType: 'VIEW' | 'SEARCH_CLICK' | 'SAVE' | 'APPLY' }} param
   */
  recordInteraction: async ({ jobId, actionType }) => {
    try {
      return await apiClient.post('/interactions', {
        jobId: Number(jobId),
        actionType,
      });
    } catch {
      // Bỏ qua lỗi ngầm nếu tương tác không thành công (tránh crash UI)
      return null;
    }
  },

  /**
   * Lấy danh sách việc làm gợi ý cá nhân hóa cho ứng viên
   * @param {{ page?: number, size?: number }} params
   */
  getRecommendedJobs: async ({ page = 0, size = 10 } = {}) => {
    const data = await apiClient.get('/recommendations/jobs', {
      params: { page, size },
    });
    return data?.data !== undefined ? data.data : data;
  },

  /**
   * Lấy danh sách gợi ý tìm kiếm (Lịch sử, Đề xuất cho bạn, Xu hướng)
   */
  getSearchSuggestions: async () => {
    const data = await apiClient.get('/search-suggestions');
    return data?.data !== undefined ? data.data : data;
  },

  /**
   * Lưu một từ khóa vừa tìm kiếm vào lịch sử của ứng viên
   * @param {string} keyword
   */
  saveSearchKeyword: async (keyword) => {
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) return null;
    try {
      return await apiClient.post('/search-suggestions/history', {
        keyword: keyword.trim(),
      });
    } catch {
      return null;
    }
  },

  /**
   * Xóa một từ khóa khỏi lịch sử tìm kiếm
   * @param {number} id
   */
  deleteSearchHistoryItem: async (id) => {
    try {
      return await apiClient.delete(`/search-suggestions/history/${id}`);
    } catch {
      return null;
    }
  },

  /**
   * Xóa toàn bộ lịch sử tìm kiếm của ứng viên
   */
  clearSearchHistory: async () => {
    try {
      return await apiClient.delete('/search-suggestions/history');
    } catch {
      return null;
    }
  },

  /**
   * Lấy gợi ý tự động hoàn thành từ khóa khi đang nhập (Autocomplete)
   * @param {string} query
   */
  getAutocompleteSuggestions: async (query) => {
    if (!query || typeof query !== 'string' || query.trim().length < 2) return [];
    try {
      const data = await apiClient.get('/search-suggestions/autocomplete', {
        params: { q: query.trim() },
      });
      return data?.data !== undefined ? data.data : (Array.isArray(data) ? data : []);
    } catch {
      return [];
    }
  },
};

export const {
  recordInteraction,
  getRecommendedJobs,
  getSearchSuggestions,
  saveSearchKeyword,
  deleteSearchHistoryItem,
  clearSearchHistory,
  getAutocompleteSuggestions,
} = recommendationApi;

export default recommendationApi;
