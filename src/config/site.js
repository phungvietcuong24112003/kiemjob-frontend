/**
 * site.js - Cấu hình tập trung thông tin hệ thống và URL kết nối
 */

export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://kiemjob.vn';
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@kiemjob.com';
export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
export const WS_URL = import.meta.env.VITE_WS_URL || '';

export default {
  SITE_URL,
  SUPPORT_EMAIL,
  API_BASE,
  WS_URL,
};
