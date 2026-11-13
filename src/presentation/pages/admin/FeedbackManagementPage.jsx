import React, { useState, useEffect } from 'react';
import { feedbackApi } from '../../../infrastructure/api';

export default function FeedbackManagementPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'candidate', 'recruiter'
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all', '5', '4', '3', '2', '1'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        feedbackApi.getAllFeedbacks(),
        feedbackApi.getFeedbackStats(),
      ]);
      setFeedbacks(Array.isArray(listRes) ? listRes : []);
      setStats(statsRes || null);
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
      showToast('Không thể tải danh sách góp ý từ máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await feedbackApi.deleteFeedback(id);
      setFeedbacks((prev) => prev.filter((item) => item.id !== id));
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(null);
      }
      setDeleteConfirmId(null);
      showToast('Đã xóa phản hồi góp ý thành công');
      // Refresh stats
      feedbackApi.getFeedbackStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error('Error deleting feedback:', err);
      showToast('Có lỗi xảy ra khi xóa góp ý', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getRoleBadge = (role) => {
    const r = role?.toLowerCase();
    if (r === 'recruiter') {
      return {
        label: 'Nhà tuyển dụng',
        bg: 'bg-teal-50 text-[#005c55] border-teal-200',
        icon: 'corporate_fare',
      };
    }
    if (r === 'admin') {
      return {
        label: 'Admin',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: 'admin_panel_settings',
      };
    }
    return {
      label: 'Ứng viên',
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: 'person',
    };
  };

  const renderStars = (count) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className={`material-symbols-outlined text-[16px] ${
              s <= count ? 'text-amber-400' : 'text-slate-200'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
        ))}
      </div>
    );
  };

  // Filtered feedbacks
  const filtered = feedbacks.filter((fb) => {
    // Role filter
    if (roleFilter !== 'all') {
      if (fb.accountRole?.toLowerCase() !== roleFilter.toLowerCase()) return false;
    }
    // Rating filter
    if (ratingFilter !== 'all') {
      if (String(fb.rating) !== String(ratingFilter)) return false;
    }
    // Search term
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (fb.subject && fb.subject.toLowerCase().includes(q)) ||
      (fb.content && fb.content.toLowerCase().includes(q)) ||
      (fb.senderName && fb.senderName.toLowerCase().includes(q)) ||
      (fb.accountEmail && fb.accountEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-white transition-all transform animate-in fade-in slide-in-from-bottom-2 ${
            toastMsg.type === 'error' ? 'bg-red-600' : 'bg-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toastMsg.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-[13px] font-semibold">{toastMsg.text}</span>
        </div>
      )}

      {/* Header Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[28px] text-[#005c55]">rate_review</span>
            <span>Góp Ý & Đánh Giá Người Dùng</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp và lắng nghe ý kiến phản hồi từ Ứng viên và Nhà tuyển dụng để nâng cấp chất lượng KiemJob
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 self-start cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[17px] ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>Làm mới</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng góp ý</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#005c55] flex items-center justify-center">
                <span className="material-symbols-outlined text-[19px]">forum</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.totalFeedbacks}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Ý kiến đã nhận</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm hài lòng</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[19px]">star</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-500 mt-2 flex items-center gap-1">
              <span>{stats.averageRating || 0}</span>
              <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Đánh giá trung bình</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Từ Ứng viên</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[19px]">person</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.candidateFeedbacks}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Phản hồi ứng viên</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Từ Nhà tuyển dụng</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[19px]">corporate_fare</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.recruiterFeedbacks}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Phản hồi doanh nghiệp</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo chủ đề, nội dung, tên người gửi hoặc email..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] text-slate-800"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('candidate')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                roleFilter === 'candidate'
                  ? 'bg-white text-[#005c55] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ứng viên
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('recruiter')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                roleFilter === 'recruiter'
                  ? 'bg-white text-[#005c55] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nhà tuyển dụng
            </button>
          </div>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#005c55] cursor-pointer"
          >
            <option value="all">Tất cả số sao</option>
            <option value="5">5 sao (Rất hài lòng)</option>
            <option value="4">4 sao (Hài lòng)</option>
            <option value="3">3 sao (Bình thường)</option>
            <option value="2">2 sao (Cần cải thiện)</option>
            <option value="1">1 sao (Không hài lòng)</option>
          </select>
        </div>
      </div>

      {/* Feedbacks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[32px] animate-spin text-[#005c55]">
              progress_activity
            </span>
            <span className="text-xs">Đang tải danh sách góp ý...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[36px] text-slate-300">chat_bubble_outline</span>
            <p className="text-sm font-semibold text-slate-600">Chưa có ý kiến đóng góp nào</p>
            <p className="text-xs text-slate-400">Không tìm thấy góp ý nào phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Người gửi</th>
                  <th className="py-3 px-4">Chủ đề</th>
                  <th className="py-3 px-4">Đánh giá</th>
                  <th className="py-3 px-4">Nội dung góp ý</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((fb) => {
                  const roleBadge = getRoleBadge(fb.accountRole);
                  return (
                    <tr
                      key={fb.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedFeedback(fb)}
                    >
                      {/* Người gửi */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 line-clamp-1">{fb.senderName}</span>
                          <span className="text-[11px] text-slate-500">{fb.accountEmail}</span>
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${roleBadge.bg}`}
                            >
                              <span className="material-symbols-outlined text-[12px]">{roleBadge.icon}</span>
                              <span>{roleBadge.label}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Chủ đề */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] whitespace-nowrap">
                          {fb.subject}
                        </span>
                      </td>

                      {/* Đánh giá sao */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStars(fb.rating)}
                        <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                          {fb.rating}/5 sao
                        </span>
                      </td>

                      {/* Nội dung */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <p className="line-clamp-2 text-slate-700 leading-relaxed font-normal">
                          {fb.content}
                        </p>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {formatDateTime(fb.createdAt)}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedFeedback(fb)}
                            className="p-1.5 text-slate-500 hover:text-[#005c55] hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(fb.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa góp ý"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Xem chi tiết góp ý */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-teal-400">rate_review</span>
                <h3 className="font-bold text-sm sm:text-base">Chi tiết ý kiến đóng góp #{selectedFeedback.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Sender Info Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Thông tin người gửi</span>
                  <div className="font-bold text-sm text-slate-900">{selectedFeedback.senderName}</div>
                  <div className="text-slate-600">{selectedFeedback.accountEmail}</div>
                </div>
                <div>
                  {(() => {
                    const badge = getRoleBadge(selectedFeedback.accountRole);
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.bg}`}>
                        <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Subject & Rating */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Chủ đề</span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">{selectedFeedback.subject}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Mức độ hài lòng</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {renderStars(selectedFeedback.rating)}
                    <span className="font-bold text-slate-800">({selectedFeedback.rating}/5)</span>
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">schedule</span>
                <span>Thời gian gửi: <strong>{formatDateTime(selectedFeedback.createdAt)}</strong></span>
              </div>

              {/* Content Full */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Nội dung góp ý</span>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap font-normal text-xs">
                  {selectedFeedback.content}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(selectedFeedback.id)}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Xóa góp ý</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Xác nhận Xóa */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[26px]">warning</span>
            </div>
            <h4 className="font-bold text-sm text-slate-900 mb-1">Xác nhận xóa phản hồi?</h4>
            <p className="text-xs text-slate-500 mb-4">
              Hành động này sẽ xóa vĩnh viễn góp ý khỏi hệ thống và không thể khôi phục lại.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                {actionLoading ? 'Đang xóa...' : 'Đồng ý xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

