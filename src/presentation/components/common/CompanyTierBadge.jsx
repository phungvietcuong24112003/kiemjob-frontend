import React from 'react';
import { getTierConfig } from '../../../infrastructure/utils/companyTierUtils';

/**
 * Component hiển thị huy hiệu hạng thành viên công ty (Bronze, Silver, Gold, Platinum)
 * @param {string} tier - 'bronze' | 'silver' | 'gold' | 'platinum'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} showIcon - hiển thị icon kèm theo
 */
export default function CompanyTierBadge({ tier = 'bronze', size = 'sm', showIcon = true, className = '' }) {
  const config = getTierConfig(tier);

  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size] || 'px-2 py-0.5 text-[11px] gap-1';

  const iconSizes = {
    xs: 'text-[12px]',
    sm: 'text-[14px]',
    md: 'text-[16px]',
    lg: 'text-[18px]',
  }[size] || 'text-[14px]';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full ${config.badgeClass} ${sizeStyles} ${className}`}
      title={`${config.label} - ${config.description}`}
    >
      {showIcon && (
        <span className={`material-symbols-outlined ${iconSizes}`}>
          {config.icon}
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
}

