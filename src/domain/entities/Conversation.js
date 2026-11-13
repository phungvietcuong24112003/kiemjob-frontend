/**
 * Conversation Entity
 * Định nghĩa cấu trúc chuẩn của cuộc hội thoại giữa Ứng viên & Nhà tuyển dụng
 *
 * @typedef {Object} Conversation
 * @property {string|number} id
 * @property {string|number} [recruiterId]
 * @property {string} [recruiterName]
 * @property {string|number} [candidateId]
 * @property {string} [candidateName]
 * @property {string} [companyName]
 * @property {string} [companyLogo]
 * @property {string} [avatar]
 * @property {string} [lastMessage]
 * @property {string} [lastMessageTime]
 * @property {number} [unreadCount]
 * @property {boolean} [online]
 */

export function createConversation(data = {}) {
  return {
    id: data.id || null,
    recruiterId: data.recruiterId || null,
    recruiterName: data.recruiterName || '',
    candidateId: data.candidateId || null,
    candidateName: data.candidateName || '',
    companyName: data.companyName || '',
    companyLogo: data.companyLogo || '',
    avatar: data.avatar || '',
    lastMessage: data.lastMessage || '',
    lastMessageTime: data.lastMessageTime || '',
    unreadCount: Number(data.unreadCount || 0),
    online: Boolean(data.online),
  };
}
