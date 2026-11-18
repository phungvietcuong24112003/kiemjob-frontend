import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../application/context/NotificationContext';
import { ROLES } from '../../../domain/constants/roles';

export default function NotificationToast({ userRole }) {
  const navigate = useNavigate();
  const { activeToast, dismissToast, markAsRead } = useNotification();

  if (!activeToast) return null;

  const handleClick = async () => {
    if (!activeToast.isRead) {
      await markAsRead(activeToast.id);
    }
    dismissToast();

    const isRecruiter = userRole === ROLES.RECRUITER || userRole === 'recruiter';
    switch (activeToast.type) {
      case 'APPLICATION':
        if (isRecruiter) {
          navigate(activeToast.refId ? `/recruiter/candidates?applicationId=${activeToast.refId}` : '/recruiter/candidates');
        } else {
          navigate(activeToast.refId ? `/applications?appId=${activeToast.refId}` : '/applications');
        }
        break;
      case 'INTERVIEW':
        if (isRecruiter) {
          navigate(activeToast.refId ? `/recruiter/candidates?applicationId=${activeToast.refId}` : '/recruiter/candidates');
        } else {
          navigate(activeToast.refId ? `/applications?tab=interview&appId=${activeToast.refId}` : '/applications?tab=interview');
        }
        break;
      case 'JOB_MODERATION':
        navigate(activeToast.refId ? `/recruiter/jobs?id=${activeToast.refId}` : '/recruiter/jobs');
        break;
      case 'PAYMENT':
        navigate('/recruiter/orders');
        break;
      default:
        break;
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in slide-in-from-bottom-5 duration-300 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#005c55] text-white flex items-center justify-center shrink-0 shadow-xs">
          <span className="material-symbols-outlined text-[20px]">notifications_active</span>
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#005c55]">
              Thông báo mới
            </span>
            <span className="text-[10px] text-slate-400">Vừa xong</span>
          </div>
          <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
            {activeToast.title}
          </h4>
          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
            {activeToast.content}
          </p>
        </div>

        <button
          type="button"
          onClick={dismissToast}
          className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded-lg cursor-pointer"
          title="Đóng"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
