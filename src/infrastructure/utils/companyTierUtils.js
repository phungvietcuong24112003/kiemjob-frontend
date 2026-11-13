/**
 * Tiện ích hỗ trợ xếp hạng thành viên doanh nghiệp (Membership Tier) & Tổng chi tiêu (Total Spending)
 * Định mức nạp:
 * - Dưới 500.000 đ: Bronze
 * - Từ 500.000 đ đến dưới 2.000.000 đ: Silver
 * - Từ 2.000.000 đ đến dưới 5.000.000 đ: Gold
 * - Từ 5.000.000 đ trở lên: Platinum
 */

export const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 500000,
  GOLD: 2000000,
  PLATINUM: 5000000,
};

export const TIER_CONFIG = {
  bronze: {
    key: 'bronze',
    name: 'Bronze',
    label: 'Hội viên Bronze',
    color: 'amber',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300',
    icon: 'shield',
    description: 'Thành viên cơ bản',
  },
  silver: {
    key: 'silver',
    name: 'Silver',
    label: 'Đối tác Silver',
    color: 'slate',
    badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300 ring-1 ring-slate-400/30',
    icon: 'military_tech',
    description: 'Nạp từ 500.000 đ',
  },
  gold: {
    key: 'gold',
    name: 'Gold VIP',
    label: 'Đối tác Gold VIP',
    color: 'yellow',
    badgeClass: 'bg-yellow-50 text-yellow-800 border border-yellow-400 ring-1 ring-yellow-400/50 shadow-xs',
    icon: 'award_star',
    description: 'Nạp từ 2.000.000 đ',
  },
  platinum: {
    key: 'platinum',
    name: 'Platinum VIP',
    label: 'Đối tác Platinum VIP',
    color: 'purple',
    badgeClass: 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-900 border border-purple-300 ring-1 ring-purple-400/40 shadow-xs',
    icon: 'diamond',
    description: 'Nạp từ 5.000.000 đ',
  },
};

export const getTierConfig = (tier = 'bronze') => {
  const normalized = (tier || '').toLowerCase().trim();
  return TIER_CONFIG[normalized] || TIER_CONFIG.bronze;
};

export const formatCurrency = (amount = 0) => {
  return Number(amount || 0).toLocaleString('vi-VN') + ' đ';
};

export const getTierProgress = (totalSpending = 0) => {
  const spent = Number(totalSpending || 0);
  if (spent < TIER_THRESHOLDS.SILVER) {
    const diff = TIER_THRESHOLDS.SILVER - spent;
    const percent = Math.min(100, Math.max(0, Math.round((spent / TIER_THRESHOLDS.SILVER) * 100)));
    return {
      currentTier: 'bronze',
      nextTier: 'silver',
      nextTierName: 'Silver',
      neededAmount: diff,
      percent,
      isMaxTier: false,
    };
  } else if (spent < TIER_THRESHOLDS.GOLD) {
    const currentRange = TIER_THRESHOLDS.GOLD - TIER_THRESHOLDS.SILVER;
    const currentSpent = spent - TIER_THRESHOLDS.SILVER;
    const diff = TIER_THRESHOLDS.GOLD - spent;
    const percent = Math.min(100, Math.max(0, Math.round((currentSpent / currentRange) * 100)));
    return {
      currentTier: 'silver',
      nextTier: 'gold',
      nextTierName: 'Gold',
      neededAmount: diff,
      percent,
      isMaxTier: false,
    };
  } else if (spent < TIER_THRESHOLDS.PLATINUM) {
    const currentRange = TIER_THRESHOLDS.PLATINUM - TIER_THRESHOLDS.GOLD;
    const currentSpent = spent - TIER_THRESHOLDS.GOLD;
    const diff = TIER_THRESHOLDS.PLATINUM - spent;
    const percent = Math.min(100, Math.max(0, Math.round((currentSpent / currentRange) * 100)));
    return {
      currentTier: 'gold',
      nextTier: 'platinum',
      nextTierName: 'Platinum VIP',
      neededAmount: diff,
      percent,
      isMaxTier: false,
    };
  } else {
    return {
      currentTier: 'platinum',
      nextTier: null,
      nextTierName: null,
      neededAmount: 0,
      percent: 100,
      isMaxTier: true,
    };
  }
};

