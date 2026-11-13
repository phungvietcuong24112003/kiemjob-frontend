// =====================================================================
// SCHEMA MASTER DATA & CONSTANTS (Aligned with Database Schema)
// =====================================================================

// 1. Roles and Account Statuses (Table: account)
export const ACCOUNT_ROLES = {
  CANDIDATE: 'candidate',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
};

export const ACCOUNT_ROLE_LABELS = {
  candidate: 'Ứng viên',
  recruiter: 'Nhà tuyển dụng',
  admin: 'Quản trị viên',
};

export const ACCOUNT_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  LOCKED: 'locked',
  DELETED: 'deleted',
};

export const ACCOUNT_STATUS_LABELS = {
  pending: 'Chờ kích hoạt',
  active: 'Hoạt động',
  locked: 'Đã khóa',
  deleted: 'Đã xóa',
};

// 2. Auth Identities (Table: account_identities)
export const AUTH_PROVIDERS = {
  google: { id: 'google', name: 'Google', icon: 'google' },
};

// 3. Skill Levels
export const SKILL_LEVELS = {
  beginner: 'Cơ bản (Beginner)',
  intermediate: 'Trung cấp (Intermediate)',
  advanced: 'Nâng cao (Advanced)',
  expert: 'Chuyên gia (Expert)',
};

// 4. Job Constraints (Table: job_posts)
export const WORK_MODES = {
  onsite: 'Tại công ty (Onsite)',
  remote: 'Từ xa (Remote)',
  hybrid: 'Linh hoạt kết hợp (Hybrid)',
};
// Compatibility alias
export const WORKING_IN_TYPES = WORK_MODES;

export const WORKING_METHODS = {
  full_time: 'Toàn thời gian (Full-time)',
  part_time: 'Bán thời gian (Part-time)',
  shift: 'Làm theo ca (Shift)',
  contract: 'Hợp đồng dự án (Contract)',
  internship: 'Thực tập sinh (Internship)',
  freelance: 'Làm việc tự do (Freelance)',
};

export const EXPERIENCE_LEVELS = {
  intern: 'Thực tập sinh (Intern)',
  fresher: 'Mới tốt nghiệp (Fresher)',
  junior: 'Nhân viên mới (Junior)',
  mid: 'Chuyên viên (Middle)',
  senior: 'Chuyên viên cấp cao (Senior)',
  lead: 'Trưởng nhóm / Kỹ sư chính (Lead)',
  any: 'Mọi cấp bậc (Any Level)',
};

export const JOB_STATUSES = {
  draft: 'Bản nháp',
  open: 'Đang mở tuyển',
  closed: 'Đã đóng tuyển',
  expired: 'Hết hạn nộp',
};

// 5. Application Statuses are defined in ./applicationStatus.js

// 6. Promotion Orders (Table: featured_orders)
export const PROMOTION_ORDER_STATUSES = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

// 7. Payment Transactions (Table: payment_transactions)
export const PAYMENT_PROVIDERS = {
  vnpay: 'VNPAY',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
  bank_transfer: 'Chuyển khoản ngân hàng',
};

export const PAYMENT_STATUSES = {
  pending: 'Đang xử lý',
  success: 'Thành công',
  failed: 'Thất bại',
  refunded: 'Hoàn tiền',
};

// Helpers: Format Currency & Salary
export const formatVND = (amount) => {
  if (amount === null || amount === undefined) return 'Thỏa thuận';
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)} Tỷ VNĐ`;
  }
  if (amount >= 1000000) {
    return `${Math.round(amount / 1000000)} Triệu VNĐ`;
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const formatSalaryRange = (min, max, currency = 'VNĐ') => {
  if (!min && !max) return 'Thỏa thuận';
  if (min && !max) return `Từ ${formatVND(min)}`;
  if (!min && max) return `Lên đến ${formatVND(max)}`;
  const minM = Math.round(min / 1000000);
  const maxM = Math.round(max / 1000000);
  return `${minM} - ${maxM} Triệu ${currency}`;
};
