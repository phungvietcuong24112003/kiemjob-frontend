/**
 * src/api/index.js - Điểm tập trung toàn bộ API kết nối Frontend với Backend
 * 
 * Cách sử dụng trong các Component / Page:
 * 
 * Cách 1: Import hàm trực tiếp (khuyên dùng vì ngắn gọn)
 *   import { login, register, sendOtp } from '../../api';
 * 
 * Cách 2: Import theo đối tượng API
 *   import { authApi, provinceApi } from '../../api';
 *   authApi.login({ email, password }).then(...);
 * 
 * Cách 3: Sử dụng trực tiếp apiClient nếu muốn gọi các endpoint khác
 *   import { apiClient } from '../../api';
 *   apiClient.get('/custom-endpoint');
 */

// 1. Export HTTP Client gốc
export { apiClient, request } from './client';
export { default as defaultClient } from './client';

// 2. Export API Xác thực (Auth, OTP Gmail, Login, Register)
export {
    sendOtp,
    verifyOtp,
    register,
    registerCandidate,
    registerRecruiter,
    login,
    sendRecruiterLoginOtp,
    loginRecruiterOtp,
    resendOtp,
    verifyEmail,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    getMe,
    logout,
    saveRecruiterProfile,
    updateRecruiterProfile,
    getCompanyAddresses,
    addCompanyAddress,
    updateCompanyAddress,
    deleteCompanyAddress,
    getCompanyLicenses,
    addCompanyLicense,
    deleteCompanyLicense,
    getCompanyImages,
    addCompanyImage,
    deleteCompanyImage,
} from './authApi';

export { default as authApi } from './authApi';

// 3. Export API Tỉnh / Thành phố
export * from './provinceApi';
export { default as provinceApi } from './provinceApi';

// 4. Export API Nhắn tin & Cuộc trò chuyện (Conversation, WebSocket, Messages, Feedback)
export * from './conversationApi';
export { default as conversationApi } from './conversationApi';
export * from './chatApi';
export { default as chatApi } from './chatApi';

// 6. Export API Hồ Sơ Cá Nhân & Ứng Viên (Profile, Links)
export * from './profileApi';
export { default as profileApi } from './profileApi';

// 7. Export API Upload File (Tải ảnh lên AWS S3)
export * from './fileApi';
export { default as fileApi } from './fileApi';

// 8. Export API CV (Tạo & Quản lý CV, Học vấn, Kinh nghiệm, Kỹ năng, Thông tin bổ sung)
export * from './cvApi';
export { default as cvApi } from './cvApi';
export * from './cvPdfApi';
export { default as cvPdfApi } from './cvPdfApi';

// 9. Export API Doanh nghiệp & Giấy phép kinh doanh
export * from './companyApi';
export { default as companyApi } from './companyApi';

// 10. Export API Quản trị hệ thống (Admin, Tin tuyển dụng, Thống kê)
export { default as adminApi } from './adminApi';

// 11. Export API Tin tuyển dụng (Job Post)
export * from './jobPostApi';
export { default as jobPostApi } from './jobPostApi';

// 12. Export API Danh mục nghề nghiệp (Job Categories)
export * from './jobCategoryApi';
export { default as jobCategoryApi } from './jobCategoryApi';

// 13. Export API Chuyên môn nghề nghiệp (Job Specializations)
export * from './jobSpecializationApi';
export { default as jobSpecializationApi } from './jobSpecializationApi';

// 14. Export API Ứng tuyển (Applications)
export * from './appicationApi';
export { default as applicationApi } from './appicationApi';

// 15. Export API Việc làm đã lưu (Saved Jobs)
export * from './savedJobApi';
export { default as savedJobApi } from './savedJobApi';

// 16. Export API Gói tính năng / Quảng bá (Feature Packages)
export * from './featurePackageApi';
export { default as featurePackageApi } from './featurePackageApi';

// 17. Export API Góp ý & Phản hồi (Feedback)
export * from './feedbackApi';
export { default as feedbackApi } from './feedbackApi';

// 18. Export API Kiểm duyệt AI (Job Moderation)
export * from './jobModerationApi';
export { default as jobModerationApi } from './jobModerationApi';

// 19. Export Tiện ích kiểm tra Cookie & Đồng bộ trạng thái khách
export * from '../utils/cookieUtils';

// 20. Export API Lịch phỏng vấn (Interviews)
export * from './interviewApi';
export { default as interviewApi } from './interviewApi';

// 21. Export API Tìm kiếm CV bằng AI (CV Search)
export * from './cvSearchApi';
export { default as cvSearchApi } from './cvSearchApi';

