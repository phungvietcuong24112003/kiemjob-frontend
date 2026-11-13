/**
 * applicationStatus.js - Quản lý trạng thái đơn ứng tuyển & Điểm số AI chuẩn hóa
 */

export const APPLICATION_STATUS_KEYS = {
  PENDING: 'pending',
  VIEWED: 'viewed',
  SHORTLISTED: 'shortlisted',
  INTERVIEW: 'interview',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

export const APPLICATION_STATUSES = {
  pending: {
    id: 'pending',
    label: 'Mới nộp',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
    icon: 'hourglass_empty',
  },
  viewed: {
    id: 'viewed',
    label: 'Đã xem',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
    icon: 'visibility',
  },
  shortlisted: {
    id: 'shortlisted',
    label: 'Qua vòng CV',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
    icon: 'fact_check',
  },
  interview: {
    id: 'interview',
    label: 'Phỏng vấn',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    dotClass: 'bg-teal-500',
    icon: 'video_camera_front',
  },
  accepted: {
    id: 'accepted',
    label: 'Trúng tuyển',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    icon: 'verified',
  },
  rejected: {
    id: 'rejected',
    label: 'Từ chối',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
    icon: 'cancel',
  },
};

export const APPLICATION_STATUS_LIST = [
  APPLICATION_STATUSES.pending,
  APPLICATION_STATUSES.viewed,
  APPLICATION_STATUSES.shortlisted,
  APPLICATION_STATUSES.interview,
  APPLICATION_STATUSES.accepted,
  APPLICATION_STATUSES.rejected,
];

export const ALLOWED_TRANSITIONS = {
  pending: ['viewed', 'shortlisted', 'rejected'],
  viewed: ['shortlisted', 'interview', 'rejected'],
  shortlisted: ['interview', 'rejected'],
  interview: ['accepted', 'rejected'],
  accepted: ['rejected'],
  rejected: ['shortlisted'],
};

export const isValidTransition = (from, to) => {
  if (!from || !to) return false;
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
};

export const getAvailableNextStatuses = (currentStatus) => {
  const allowedKeys = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowedKeys.map((key) => APPLICATION_STATUSES[key]).filter(Boolean);
};

export const AI_SCORE_STATUSES = {
  NOT_SCORED: {
    id: 'NOT_SCORED',
    label: 'Chưa chấm',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: 'hourglass_bottom',
  },
  PENDING: {
    id: 'PENDING',
    label: 'Đang chấm...',
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse',
    icon: 'sync',
  },
  SUCCESS: {
    id: 'SUCCESS',
    label: 'Đã chấm',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'auto_awesome',
  },
  FAILED: {
    id: 'FAILED',
    label: 'Lỗi - thử lại',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: 'error',
  },
  NO_TEXT: {
    id: 'NO_TEXT',
    label: 'CV không đọc được',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: 'document_scanner',
  },
};

export const getAiScoreBadge = (score, status = 'SUCCESS') => {
  if (status === 'PENDING') {
    return {
      label: 'Đang chấm...',
      badgeClass: 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse',
      icon: 'sync',
    };
  }
  if (status === 'FAILED') {
    return {
      label: 'Lỗi - Thử lại',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: 'error',
    };
  }
  if (status === 'NO_TEXT') {
    return {
      label: 'CV scan / Không có chữ',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: 'document_scanner',
    };
  }
  if (status === 'NOT_SCORED' || score == null) {
    return {
      label: 'Chưa chấm',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      icon: 'schedule',
    };
  }

  const num = Number(score);
  if (num >= 75) {
    return {
      label: `${num}/100`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
      tag: 'Phù hợp cao',
      icon: 'verified',
    };
  }
  if (num >= 50) {
    return {
      label: `${num}/100`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 font-bold',
      tag: 'Tương đối',
      icon: 'check_circle',
    };
  }
  return {
    label: `${num}/100`,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
    tag: 'Chưa đạt',
    icon: 'warning',
  };
};

