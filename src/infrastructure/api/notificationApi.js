import { request } from './client';

export const notificationApi = {
  getMyNotifications({ page = 0, size = 10 } = {}) {
    return request('/notifications', {
      method: 'GET',
      params: { page, size, sort: 'createdAt,desc' },
    });
  },

  getUnreadCount() {
    return request('/notifications/unread-count', {
      method: 'GET',
    });
  },

  markAsRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead() {
    return request('/notifications/read-all', {
      method: 'PUT',
    });
  },

  deleteNotification(id) {
    return request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },
};
