/**
 * Message Entity
 * Định nghĩa cấu trúc chuẩn của tin nhắn trong hệ thống KiemJob
 *
 * @typedef {Object} Message
 * @property {string|number} id
 * @property {string|number} conversationId
 * @property {string|number} senderId
 * @property {'candidate'|'recruiter'|'admin'} senderRole
 * @property {string|number} [recipientId]
 * @property {string} content
 * @property {'text'|'image'|'file'} [messageType]
 * @property {boolean} [isRead]
 * @property {string} [createdAt]
 */

export function createMessage(data = {}) {
  return {
    id: data.id || null,
    conversationId: data.conversationId || null,
    senderId: data.senderId || null,
    senderRole: data.senderRole || ROLES.CANDIDATE,
    recipientId: data.recipientId || null,
    content: data.content || '',
    messageType: data.messageType || 'text',
    isRead: Boolean(data.isRead),
    createdAt: data.createdAt || new Date().toISOString(),
  };
}
