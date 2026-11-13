import React, { useState, useMemo } from 'react';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LIST,
  getAvailableNextStatuses,
  getAiScoreBadge,
} from '../../../domain/constants/applicationStatus';
import AiScoreDetailModal from './AiScoreDetailModal';

export default function ApplicantTable({
  applications = [],
  onChangeStatus,
  onBulkChange,
  onOpenCv,
  onRescore,
  onScheduleInterview,
  showJobColumn = false,
  loading = false,
  aiScores = {},
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiScoreFilter, setAiScoreFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState('aiScore'); // 'aiScore' or 'appliedAt'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

  // Modal chi tiết điểm AI
  const [selectedAiApp, setSelectedAiApp] = useState(null);
  const [selectedScoreData, setSelectedScoreData] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Dialog xác nhận khi đổi hàng loạt (đặc biệt khi Từ chối)
  const [bulkConfirmModal, setBulkConfirmModal] = useState({
    isOpen: false,
    targetStatus: null,
  });

  // Helper lấy thông tin chấm điểm AI của một hồ sơ trong phiên
  const getAppAiScore = (app) => {
    const sessionScore = aiScores[app.id];
    if (sessionScore) {
      return {
        status: sessionScore.status, // 'idle', 'loading', 'success', 'failed', 'no_text'
        data: sessionScore.data,
        overallScore: sessionScore.data?.overallScore,
        error: sessionScore.error,
      };
    }
    // Fallback nếu app có sẵn (từ mock hoặc prop)
    if (app.aiOverallScore !== undefined || app.aiScoreStatus !== undefined) {
      const st = (app.aiScoreStatus || 'NOT_SCORED').toLowerCase();
      return {
        status: st === 'success' ? 'success' : st === 'no_text' ? 'no_text' : st === 'failed' ? 'failed' : 'idle',
        data: app,
        overallScore: app.aiOverallScore,
        error: null,
      };
    }
    return {
      status: 'idle',
      data: null,
      overallScore: null,
      error: null,
    };
  };

  // Đếm số lượng theo trạng thái
  const counts = useMemo(() => {
    const map = { all: applications.length };
    APPLICATION_STATUS_LIST.forEach((s) => {
      map[s.id] = 0;
    });
    applications.forEach((app) => {
      const st = app.status?.toLowerCase();
      if (map[st] !== undefined) {
        map[st] += 1;
      }
    });
    return map;
  }, [applications]);

  // Lọc và sắp xếp danh sách ứng viên
  const filteredApplications = useMemo(() => {
    let result = [...applications];

    // Lọc theo Tab trạng thái
    if (activeTab !== 'all') {
      result = result.filter(
        (a) => a.status?.toLowerCase() === activeTab.toLowerCase()
      );
    }

    // Lọc theo khoảng điểm AI (chỉ trên các hồ sơ đã chấm trong phiên)
    if (aiScoreFilter === 'high') {
      result = result.filter((a) => {
        const sc = getAppAiScore(a);
        return sc.status === 'success' && sc.overallScore != null && sc.overallScore >= 75;
      });
    } else if (aiScoreFilter === 'medium') {
      result = result.filter((a) => {
        const sc = getAppAiScore(a);
        return (
          sc.status === 'success' &&
          sc.overallScore != null &&
          sc.overallScore >= 50 &&
          sc.overallScore < 75
        );
      });
    } else if (aiScoreFilter === 'low') {
      result = result.filter((a) => {
        const sc = getAppAiScore(a);
        return sc.status === 'success' && sc.overallScore != null && sc.overallScore < 50;
      });
    } else if (aiScoreFilter === 'loading') {
      result = result.filter((a) => getAppAiScore(a).status === 'loading');
    } else if (aiScoreFilter === 'failed') {
      result = result.filter((a) => {
        const st = getAppAiScore(a).status;
        return st === 'failed' || st === 'no_text';
      });
    } else if (aiScoreFilter === 'not_scored') {
      result = result.filter((a) => {
        const st = getAppAiScore(a).status;
        return st === 'idle';
      });
    }

    // Lọc theo từ khóa tìm kiếm (tên, email, số điện thoại, tiêu đề bài post)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          (a.candidateName && a.candidateName.toLowerCase().includes(q)) ||
          (a.candidateEmail && a.candidateEmail.toLowerCase().includes(q)) ||
          (a.candidateHeadline && a.candidateHeadline.toLowerCase().includes(q)) ||
          (a.jobTitle && a.jobTitle.toLowerCase().includes(q))
      );
    }

    // Sắp xếp (hồ sơ chưa chấm xếp cuối khi sắp theo điểm AI)
    result.sort((a, b) => {
      if (sortField === 'aiScore') {
        const scA = getAppAiScore(a);
        const scB = getAppAiScore(b);
        const hasA = scA.status === 'success' && scA.overallScore != null;
        const hasB = scB.status === 'success' && scB.overallScore != null;

        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
        if (!hasA && !hasB) return 0;

        return sortDirection === 'desc'
          ? scB.overallScore - scA.overallScore
          : scA.overallScore - scB.overallScore;
      }
      if (sortField === 'appliedAt') {
        const timeA = new Date(a.appliedAt || 0).getTime();
        const timeB = new Date(b.appliedAt || 0).getTime();
        return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
      }
      return 0;
    });

    return result;
  }, [applications, activeTab, aiScoreFilter, searchQuery, sortField, sortDirection, aiScores]);

  // Xử lý chọn dòng
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredApplications.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Mở modal xác nhận bulk change
  const handleBulkStatusChangeRequest = (targetStatus) => {
    if (selectedIds.length === 0) return;
    if (targetStatus === 'rejected') {
      setBulkConfirmModal({
        isOpen: true,
        targetStatus,
      });
    } else {
      executeBulkStatusChange(targetStatus);
    }
  };

  const executeBulkStatusChange = async (targetStatus) => {
    if (!onBulkChange) return;
    await onBulkChange(selectedIds, targetStatus);
    setSelectedIds([]);
    setBulkConfirmModal({ isOpen: false, targetStatus: null });
  };

  const handleSortToggle = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Render ô điểm AI
  const renderAiScoreCell = (app) => {
    const sc = getAppAiScore(app);

    if (sc.status === 'loading') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
          <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
          <span>Đang chấm...</span>
        </span>
      );
    }

    if (sc.status === 'success' && sc.overallScore != null) {
      const badge = getAiScoreBadge(sc.overallScore, 'SUCCESS');
      return (
        <button
          type="button"
          onClick={() => {
            setSelectedAiApp(app);
            setSelectedScoreData(sc.data);
            setIsAiModalOpen(true);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all hover:scale-105 shadow-xs ${badge.badgeClass}`}
          title="Bấm để xem phân tích chi tiết độ phù hợp AI"
        >
          <span className="material-symbols-outlined text-[15px]">{badge.icon}</span>
          <span>{sc.overallScore}/100</span>

        </button>
      );
    }

    if (sc.status === 'no_text') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
          title={sc.data?.summary || 'CV không trích xuất được văn bản'}
        >
          <span className="material-symbols-outlined text-[14px]">scan_delete</span>
          <span>CV không đọc được</span>
        </span>
      );
    }

    if (sc.status === 'failed') {
      return (
        <button
          type="button"
          onClick={() => onRescore && onRescore(app.id)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
          title={sc.error || 'Lỗi khi gọi AI. Bấm để thử lại'}
        >
          <span className="material-symbols-outlined text-[14px]">refresh</span>
          <span>Lỗi - Thử lại</span>
        </button>
      );
    }

    // Chưa chấm (idle)
    return (
      <button
        type="button"
        onClick={() => onRescore && onRescore(app.id)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white hover:bg-teal-50 text-teal-700 border border-teal-300 transition-colors shadow-xs"
        title="Chấm điểm mức độ phù hợp của CV so với bài post"
      >
        <span className="material-symbols-outlined text-[14px] text-teal-600">auto_awesome</span>
        <span>Chấm điểm</span>
      </button>
    );
  };

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── Tabs Bộ Lọc Trạng Thái ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-[#005c55] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Tất cả hồ sơ</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
            }`}
          >
            {counts.all || 0}
          </span>
        </button>

        {APPLICATION_STATUS_LIST.map((s) => {
          const isActive = activeTab === s.id;
          const count = counts[s.id] || 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveTab(s.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#005c55] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar: Tìm kiếm, Lọc Điểm AI & Sắp xếp ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 items-center gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên ứng viên, email, kỹ năng..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Bộ lọc điểm AI */}
          <div className="flex items-center gap-1.5">
            <select
              value={aiScoreFilter}
              onChange={(e) => setAiScoreFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005c55]/20"
            >
              <option value="all">Tất cả điểm AI</option>
              <option value="high">≥ 75 (Phù hợp cao)</option>
              <option value="medium">50 - 74 (Tương đối)</option>
              <option value="low">&lt; 50 (Chưa đạt)</option>
              <option value="loading">Đang chấm AI</option>
              <option value="failed">Lỗi / CV không đọc được</option>
              <option value="not_scored">Chưa chấm</option>
            </select>
          </div>
        </div>

        {/* Nút Sắp xếp nhanh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSortToggle('aiScore')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
              sortField === 'aiScore'
                ? 'bg-[#005c55]/10 border-[#005c55] text-[#005c55]'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>Điểm AI</span>
            {sortField === 'aiScore' && (
              <span className="material-symbols-outlined text-[15px]">
                {sortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSortToggle('appliedAt')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
              sortField === 'appliedAt'
                ? 'bg-[#005c55]/10 border-[#005c55] text-[#005c55]'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>Ngày nộp</span>
            {sortField === 'appliedAt' && (
              <span className="material-symbols-outlined text-[15px]">
                {sortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Thanh Tác Vụ Hàng Loạt (Bulk Actions Bar) ── */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 flex flex-wrap items-center justify-between gap-3 animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-teal-900 font-bold">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px]">
              {selectedIds.length}
            </span>
            <span>Đã chọn {selectedIds.length} hồ sơ ứng viên</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-medium">Chuyển sang:</span>
            <button
              onClick={() => handleBulkStatusChangeRequest('shortlisted')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm transition-all"
            >
              Qua vòng CV
            </button>
            <button
              onClick={() => handleBulkStatusChangeRequest('interview')}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-all"
            >
              Phỏng vấn
            </button>
            <button
              onClick={() => handleBulkStatusChangeRequest('accepted')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all"
            >
              Trúng tuyển
            </button>
            <button
              onClick={() => handleBulkStatusChangeRequest('rejected')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition-all"
            >
              Từ chối
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 font-semibold"
            >
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* ── Bảng Dữ Liệu Ứng Viên ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredApplications.length > 0 &&
                      selectedIds.length === filteredApplications.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-[#005c55] focus:ring-[#005c55]"
                  />
                </th>
                <th className="py-3.5 px-4">Ứng viên</th>
                {showJobColumn && <th className="py-3.5 px-4">Tin tuyển dụng</th>}
                <th className="py-3.5 px-4">Điểm AI</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Ngày nộp</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={showJobColumn ? 7 : 6}
                    className="py-12 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold text-xs">Đang tải danh sách hồ sơ...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td
                    colSpan={showJobColumn ? 7 : 6}
                    className="py-12 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-slate-300">
                        folder_off
                      </span>
                      <p className="font-semibold">Không tìm thấy ứng viên nào phù hợp</p>
                      <p className="text-[11px] text-slate-400">
                        Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const isSelected = selectedIds.includes(app.id);
                  const statusObj =
                    APPLICATION_STATUSES[app.status?.toLowerCase()] ||
                    APPLICATION_STATUSES.pending;
                  const availableNext = getAvailableNextStatuses(app.status?.toLowerCase());

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-teal-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(app.id)}
                          className="rounded border-slate-300 text-[#005c55] focus:ring-[#005c55]"
                        />
                      </td>

                      {/* Ứng viên */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              app.candidateAvatar ||
                              'https://api.dicebear.com/7.x/avataaars/svg?seed=' + app.id
                            }
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <button
                              type="button"
                              onClick={() => onOpenCv && onOpenCv(app)}
                              className="font-bold text-slate-800 hover:text-[#005c55] text-left truncate flex items-center gap-1.5 group"
                            >
                              <span className="group-hover:underline">
                                {app.candidateName || 'Ứng viên #' + app.id}
                              </span>
                            </button>
                            <span className="text-[11px] text-slate-500 truncate">
                              {app.candidateEmail || 'Chưa có email'}
                              {app.candidatePhone ? ` • ${app.candidatePhone}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột Tin tuyển dụng (khi hiển thị ở trang tổng hợp) */}
                      {showJobColumn && (
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col min-w-0 max-w-xs">
                            <span className="font-semibold text-slate-800 truncate" title={app.jobTitle}>
                              {app.jobTitle || 'Tin tuyển dụng'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Cột Điểm AI */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderAiScoreCell(app)}
                      </td>

                      {/* Trạng thái & Dropdown chuyển trạng thái */}
                      <td className="py-3.5 px-4">
                        <div className="relative inline-block text-left">
                          <select
                            value={app.status?.toLowerCase() || 'pending'}
                            onChange={(e) => {
                              const newSt = e.target.value;
                              if (onChangeStatus) {
                                onChangeStatus(app.id, newSt);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-xl font-bold text-xs border focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 cursor-pointer ${statusObj.badgeClass}`}
                          >
                            <option value={app.status} disabled>
                              {statusObj.label}
                            </option>
                            {availableNext.map((nextSt) => (
                              <option
                                key={nextSt.id}
                                value={nextSt.id}
                                className="bg-white text-slate-700 font-semibold"
                              >
                                ➔ {nextSt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Ngày nộp */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(app.appliedAt)}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenCv && onOpenCv(app)}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Xem chi tiết CV"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              description
                            </span>
                          </button>

                          {onScheduleInterview && (
                            <button
                              type="button"
                              onClick={() => onScheduleInterview(app)}
                              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Mời phỏng vấn"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                event_available
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialog Xác Nhận Từ Chối Hàng Loạt ── */}
      {bulkConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold text-slate-800">
                Xác nhận từ chối {selectedIds.length} ứng viên?
              </h4>
              <p className="text-xs text-slate-500">
                Thao tác này sẽ chuyển trạng thái của {selectedIds.length} hồ sơ đã chọn sang "Từ chối" và gửi email thông báo tới các ứng viên.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkConfirmModal({ isOpen: false, targetStatus: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => executeBulkStatusChange(bulkConfirmModal.targetStatus)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Chi Tiết Điểm AI ── */}
      {isAiModalOpen && selectedAiApp && (
        <AiScoreDetailModal
          isOpen={isAiModalOpen}
          onClose={() => {
            setIsAiModalOpen(false);
            setSelectedAiApp(null);
            setSelectedScoreData(null);
          }}
          application={selectedAiApp}
          scoreData={selectedScoreData}
          onRescore={onRescore}
        />
      )}
    </div>
  );
}
