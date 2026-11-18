import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../application/context/NotificationContext';
import { ROLES } from '../../../domain/constants/roles';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay === 1) return 'Hôm qua';
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return '';
  }
}

function getTypeIconAndColor(type) {
  switch (type) {
    case 'APPLICATION':
      return {
        icon: 'work',
        bg: 'bg-blue-50 text-blue-600 border-blue-200',
        badge: 'Hồ sơ',
      };
    case 'INTERVIEW':
      return {
        icon: 'event',
        bg: 'bg-purple-50 text-purple-600 border-purple-200',
        badge: 'Phỏng vấn',
      };
    case 'JOB_MODERATION':
      return {
        icon: 'verified',
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        badge: 'Kiểm duyệt',
      };
    case 'PAYMENT':
      return {
        icon: 'payments',
        bg: 'bg-amber-50 text-amber-600 border-amber-200',
        badge: 'Giao dịch',
      };
    case 'FEEDBACK':
      return {
        icon: 'rate_review',
        bg: 'bg-teal-50 text-teal-600 border-teal-200',
        badge: 'Góp ý',
      };
    case 'SYSTEM':
    default:
      return {
        icon: 'info',
        bg: 'bg-slate-50 text-slate-600 border-slate-200',
        badge: 'Hệ thống',
      };
  }
}

export default function NotificationDropdown({ onClose, userRole }) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotification();

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD'

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'UNREAD') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, activeTab]);

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    if (typeof onClose === 'function') {
      onClose();
    }

    // Deep linking theo type & refId
    const isRecruiter = userRole === ROLES.RECRUITER || userRole === 'recruiter';

    switch (notif.type) {
      case 'APPLICATION':
        if (isRecruiter) {
          navigate(notif.refId ? `/recruiter/candidates?applicationId=${notif.refId}` : '/recruiter/candidates');
        } else {
          navigate(notif.refId ? `/applications?appId=${notif.refId}` : '/applications');
        }
        break;
      case 'INTERVIEW':
        if (isRecruiter) {
          navigate(notif.refId ? `/recruiter/candidates?applicationId=${notif.refId}` : '/recruiter/candidates');
        } else {
          navigate(notif.refId ? `/applications?tab=interview&appId=${notif.refId}` : '/applications?tab=interview');
        }
        break;
      case 'JOB_MODERATION':
        navigate(notif.refId ? `/recruiter/jobs?id=${notif.refId}` : '/recruiter/jobs');
        break;
      case 'PAYMENT':
        navigate('/recruiter/orders');
        break;
      case 'FEEDBACK':
      case 'SYSTEM':
      default:
        // Không bắt buộc navigate, chỉ đọc thông báo
        break;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-800 text-sm">Thông báo</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-red-100 text-red-600 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount} mới
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[12px] text-[#005c55] hover:text-[#007952] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            title="Đánh dấu tất cả là đã đọc"
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            <span>Đã đọc tất cả</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-3 pt-2 pb-1 border-b border-slate-100 flex items-center gap-1 bg-white">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-[#005c55] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('UNREAD')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'UNREAD'
              ? 'bg-[#005c55] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Chưa đọc ({unreadCount})
        </button>
      </div>

      {/* Body: Danh sách thông báo */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
        {loading && notifications.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <span className="material-symbols-outlined animate-spin text-[26px]">progress_activity</span>
            <p className="text-xs mt-2">Đang tải thông báo...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
              <span className="material-symbols-outlined text-[24px]">notifications_none</span>
            </div>
            <p className="text-xs font-bold text-slate-700">
              {activeTab === 'UNREAD' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
              Các thông báo về hồ sơ, lịch phỏng vấn và trạng thái dịch vụ sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const { icon, bg, badge } = getTypeIconAndColor(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`group relative p-3 sm:p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 ${
                  !notif.isRead ? 'bg-emerald-50/20' : 'bg-white'
                }`}
              >
                {/* Icon loại thông báo */}
                <div
                  className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border shadow-xs ${bg}`}
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </div>

                {/* Nội dung thông báo */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {badge}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  <h4
                    className={`text-xs leading-snug truncate ${
                      !notif.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                    }`}
                  >
                    {notif.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                    {notif.content}
                  </p>
                </div>

                {/* Chấm tròn chưa đọc */}
                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[#005c55] shrink-0 mt-2" title="Chưa đọc" />
                )}

                {/* Nút xóa thông báo khi hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity cursor-pointer"
                  title="Xóa thông báo này"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
