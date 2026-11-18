/**
 * User Entity
 * Định nghĩa cấu trúc chuẩn của thực thể User trong domain KiemJob
 *
 * @typedef {Object} User
 * @property {string|number} id
 * @property {string} email
 * @property {'candidate'|'recruiter'|'admin'} role
 * @property {string} [fullName]
 * @property {string} [avatarUrl]
 * @property {string} [phoneNumber]
 * @property {string} [status]
 * @property {boolean} [emailVerified]
 * @property {string} [createdAt]
 */

export function createUser(data = {}) {
  return {
    id: data.id || null,
    email: data.email || '',
    role: data.role || ROLES.CANDIDATE,
    fullName: data.fullName || data.name || '',
    avatarUrl: data.avatarUrl || data.avatar || '',
    phoneNumber: data.phoneNumber || data.phone || '',
    status: data.status || 'active',
    emailVerified: Boolean(data.emailVerified ?? data.is_active ?? true),
    createdAt: data.createdAt || new Date().toISOString(),
  };
}
