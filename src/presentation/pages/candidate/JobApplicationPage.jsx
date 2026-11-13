import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { hasAuthCookie } from '../../../infrastructure/utils/cookieUtils';
import { applicationApi } from '../../../infrastructure/api/appicationApi';
import { getInterviewsByApplication } from '../../../infrastructure/api/interviewApi';
import { useChat } from '../../../application/context/ChatContext';

const STATUS_CONFIG = {
  pending: {
    label: 'Chờ phản hồi',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: 'hourglass_empty',
  },
  viewed: {
    label: 'Đã xem hồ sơ',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: 'visibility',
  },
  shortlisted: {
    label: 'Vào sơ tuyển',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: 'fact_check',
  },
  interview: {
    label: 'Mời phỏng vấn',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    icon: 'video_camera_front',
  },
  accepted: {
    label: 'Đã trúng tuyển',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: 'verified',
  },
  rejected: {
    label: 'Không phù hợp',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: 'cancel',
  },
};

const STATUS_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ phản hồi' },
  { id: 'viewed', label: 'Đã xem' },
  { id: 'shortlisted', label: 'Sơ tuyển' },
  { id: 'interview', label: 'Phỏng vấn' },
  { id: 'accepted', label: 'Trúng tuyển' },
  { id: 'rejected', label: 'Không phù hợp' },
];

const formatDate = (dateString) => {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const day = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${time} - ${day}`;
  } catch {
    return dateString;
  }
};

const formatSalary = (min, max) => {
  const numMin = Number(min);
  const numMax = Number(max);
  if (Number.isFinite(numMin) && Number.isFinite(numMax) && numMin > 0 && numMax > 0) {
    return `${(numMin / 1000000).toLocaleString('vi-VN')} - ${(numMax / 1000000).toLocaleString('vi-VN')} triệu VNĐ`;
  }
  if (Number.isFinite(numMin) && numMin > 0) {
    return `Từ ${(numMin / 1000000).toLocaleString('vi-VN')} triệu VNĐ`;
  }
  if (Number.isFinite(numMax) && numMax > 0) {
    return `Đến ${(numMax / 1000000).toLocaleString('vi-VN')} triệu VNĐ`;
  }
  return null;
};

export default function JobApplicationPage() {
  if (!hasAuthCookie()) {
    return <Navigate to="/login" replace />;
  }

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [applications, setApplications] = useState([]);
  const [interviewsMap, setInterviewsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [expandedLetterId, setExpandedLetterId] = useState(null);
  const [openingChatId, setOpeningChatId] = useState(null);

  const { openChatWithRecruiter } = useChat();

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleOpenChat = async (app) => {
    try {
      setOpeningChatId(app.id);
      await openChatWithRecruiter({
        candidateId: app.candidateId,
        recruiterId: app.recruiterId,
        companyId: app.companyId,
      });
      showToast(`Đã mở cuộc trò chuyện với ${app.companyName || 'nhà tuyển dụng'}`);
    } catch (err) {
      showToast('Không thể kết nối trò chuyện. Vui lòng thử lại sau.');
    } finally {
      setOpeningChatId(null);
    }
  };

  const unwrapData = (response) => {
    const body = response?.data ?? response;
    return Array.isArray(body) ? body : body?.content ?? body?.items ?? [];
  };

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // GET /api/applications (không tham số → backend tự lấy theo account đang login)
      const res = await applicationApi.getMyApplications();
      const data = unwrapData(res);
      setApplications(data);

      // Tải lịch phỏng vấn cho các đơn có trạng thái interview
      const interviewApps = data.filter((a) => a.status === 'interview');
      if (interviewApps.length > 0) {
        const map = {};
        await Promise.all(
          interviewApps.map(async (app) => {
            try {
              const interviewRes = await getInterviewsByApplication(app.id);
              const list = Array.isArray(interviewRes) ? interviewRes : interviewRes?.data || [];
              if (list.length > 0) {
                const sorted = [...list].sort(
                  (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
                );
                map[app.id] = sorted[0];
              }
            } catch (e) {
              console.warn(`Không thể tải lịch phỏng vấn cho đơn #${app.id}:`, e);
            }
          })
        );
        setInterviewsMap(map);
      } else {
        setInterviewsMap({});
      }
    } catch (err) {
      console.error('Không thể tải danh sách ứng tuyển:', err);
      setError(err?.message || 'Không thể tải danh sách việc đã ứng tuyển. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleWithdraw = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn rút hồ sơ ứng tuyển vị trí "${title || 'này'}"?`)) {
      return;
    }

    try {
      await applicationApi.withdrawApplication(id);
      setApplications(prev => prev.filter(app => app.id !== id));
      showToast('Đã rút hồ sơ ứng tuyển thành công.');
    } catch (err) {
      showToast(err?.message || 'Không thể rút đơn ứng tuyển. Vui lòng thử lại.');
    }
  };

  const filteredApps = useMemo(() => {
    const now = Date.now();
    return applications.filter((app) => {
      // Filter by Status Tab
      const matchTab = activeTab === 'all' ? true : app.status === activeTab;

      // Filter by Search Term
      const title = (app.jobTitle || '').toLowerCase();
      const company = (app.companyName || '').toLowerCase();
      const cv = (app.cvTitle || '').toLowerCase();
      const term = searchTerm.trim().toLowerCase();
      const matchSearch = !term || title.includes(term) || company.includes(term) || cv.includes(term);

      // Filter by Time Range
      let matchTime = true;
      if (timeRange === '30days' && app.appliedAt) {
        const appTime = new Date(app.appliedAt).getTime();
        matchTime = now - appTime <= 30 * 24 * 60 * 60 * 1000;
      } else if (timeRange === 'year' && app.appliedAt) {
        const appYear = new Date(app.appliedAt).getFullYear();
        const currentYear = new Date().getFullYear();
        matchTime = appYear === currentYear;
      }

      return matchTab && matchSearch && matchTime;
    });
  }, [applications, activeTab, searchTerm, timeRange]);

  // Dynamic KPI counts
  const totalCount = applications.length;
  const viewedCount = useMemo(
    () => applications.filter(a => a.status && a.status !== 'pending').length,
    [applications]
  );
  const interviewCount = useMemo(
    () => applications.filter(a => a.status === 'interview').length,
    [applications]
  );
  const acceptedCount = useMemo(
    () => applications.filter(a => a.status === 'accepted').length,
    [applications]
  );
  const viewRate = totalCount > 0 ? `${Math.round((viewedCount / totalCount) * 100)}%` : '0%';

  return (
    <div className="w-full bg-[#faf8ff] min-h-screen pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#131b2e] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 transition-all animate-fadeIn">
          <span className="material-symbols-outlined text-[#97f5cc] text-[20px]">info</span>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Area */}
      <div className="relative overflow-hidden pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-[#3e4947] text-sm">
              <li>
                <Link to="/" className="hover:text-[#005c55] transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">home</span>
                  <span>Trang chủ</span>
                </Link>
              </li>
              <li className="text-[#bdc9c6]">
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </li>
              <li>
                <Link to="/jobs" className="hover:text-[#005c55] transition-colors">
                  Việc làm
                </Link>
              </li>
              <li className="text-[#bdc9c6]">
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </li>
              <li className="text-[#005c55] font-bold">Việc đã ứng tuyển</li>
            </ol>
          </nav>

          {/* Main Header Area with Actions */}
          <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#131b2e] tracking-tight">
                Việc Đã Ứng Tuyển
              </h1>
              <p className="text-[#3e4947] text-sm sm:text-base leading-relaxed">
                Theo dõi tiến trình hồ sơ của bạn với các nhà tuyển dụng theo thời gian thực.
              </p>
            </div>

            {/* Quick Top Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/saved-jobs"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#f2f3ff] text-[#005c55] border border-[#eaedff] text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">bookmark</span>
                <span>Xem Việc đã lưu</span>
              </Link>
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#005c55] hover:bg-[#0f766e] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                <span>Tìm việc làm mới</span>
              </Link>
            </div>
          </section>

          {/* Main Layout: Applications List + Intelligence Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Applications List */}
            <div className="lg:col-span-8 space-y-4">
              {/* Loading State */}
              {isLoading && (
                <div className="bg-white rounded-2xl p-12 text-center border border-[#eaedff] shadow-sm space-y-3">
                  <div className="w-10 h-10 border-4 border-[#005c55] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-[#3e4947]">Đang tải danh sách đơn ứng tuyển...</p>
                </div>
              )}

              {/* Error State */}
              {!isLoading && error && (
                <div className="bg-white rounded-2xl p-8 text-center border border-red-200 shadow-sm space-y-3">
                  <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
                  <h3 className="text-base font-bold text-[#131b2e]">Không thể tải dữ liệu</h3>
                  <p className="text-sm text-[#3e4947] max-w-md mx-auto">{error}</p>
                  <button
                    type="button"
                    onClick={loadApplications}
                    className="mt-2 px-4 py-2 bg-[#005c55] text-white text-xs font-semibold rounded-xl hover:bg-[#0f766e] transition-colors"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && filteredApps.length === 0 && (
                <div className="bg-white rounded-2xl p-12 text-center border border-[#eaedff] shadow-sm">
                  <span className="material-symbols-outlined text-5xl text-[#bdc9c6] mb-3">
                    folder_open
                  </span>
                  <h3 className="text-lg font-bold text-[#131b2e]">
                    {applications.length === 0 ? 'Bạn chưa nộp hồ sơ ứng tuyển nào' : 'Không tìm thấy đơn ứng tuyển'}
                  </h3>
                  <p className="text-sm text-[#3e4947] mt-1 max-w-md mx-auto">
                    {applications.length === 0
                      ? 'Khám phá hàng ngàn cơ hội việc làm hấp dẫn và nộp CV ngay hôm nay để đón nhận những cơ hội mới!'
                      : 'Không có hồ sơ nào khớp với bộ lọc hiện tại. Thử chọn lại trạng thái hoặc từ khóa tìm kiếm.'}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    {applications.length === 0 ? (
                      <Link
                        to="/jobs"
                        className="px-5 py-2.5 bg-[#005c55] hover:bg-[#0f766e] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        Khám phá việc làm ngay
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('all'); setSearchTerm(''); setTimeRange('all'); }}
                        className="px-4 py-2 bg-[#005c55] text-white text-xs font-semibold rounded-xl hover:bg-[#0f766e] transition-colors"
                      >
                        Đặt lại bộ lọc
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Applications Items List */}
              {!isLoading && !error && filteredApps.map((app) => {
                const statusInfo = STATUS_CONFIG[app.status] || {
                  label: app.status || 'Chờ phản hồi',
                  badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
                  icon: 'info',
                };
                const salaryText = formatSalary(app.salaryMin, app.salaryMax);

                return (
                  <article
                    key={app.id}
                    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-[#eaedff] group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Company Logo & Core Job Information */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Company Logo */}
                        {app.companyLogo ? (
                          <img
                            src={app.companyLogo}
                            alt={app.companyName || 'Công ty'}
                            className="w-14 h-14 rounded-xl object-contain bg-[#f2f3ff] p-1.5 border border-[#eaedff] shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextSibling) {
                                e.currentTarget.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-14 h-14 rounded-xl bg-[#e2e7ff] text-[#005c55] font-bold text-xl items-center justify-center shrink-0 border border-[#eaedff] ${
                            app.companyLogo ? 'hidden' : 'flex'
                          }`}
                        >
                          {(app.companyName || 'J').charAt(0).toUpperCase()}
                        </div>

                        {/* Thông tin chính: Tên bài post, Tên công ty, Trạng thái, Ngày nộp, CV nộp */}
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* 1. Tên bài post */}
                            <Link
                              to={`/jobs/${app.jobPostId}`}
                              className="text-base sm:text-lg font-bold text-[#131b2e] hover:text-[#005c55] transition-colors line-clamp-1"
                              title={app.jobTitle}
                            >
                              {app.jobTitle || `Tin tuyển dụng #${app.jobPostId}`}
                            </Link>

                            {/* 2. Trạng thái */}
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.badgeClass}`}
                            >
                              <span className="material-symbols-outlined text-[13px]">{statusInfo.icon}</span>
                              <span>{statusInfo.label}</span>
                            </span>
                          </div>

                          {/* 3. Tên công ty & mức lương */}
                          <div className="flex items-center gap-2 text-xs text-[#3e4947] flex-wrap">
                            <span className="font-semibold text-[#131b2e] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-[#6e7977]">corporate_fare</span>
                              {app.companyName || 'Nhà tuyển dụng KiemJob'}
                            </span>
                            {salaryText && (
                              <>
                                <span>•</span>
                                <span className="font-bold text-[#005c55] flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[14px]">payments</span>
                                  {salaryText}
                                </span>
                              </>
                            )}
                            {app.workingMode && (
                              <>
                                <span>•</span>
                                <span className="text-[#6e7977]">
                                  {app.workingMode === 'remote' ? 'Từ xa (Remote)' : app.workingMode === 'hybrid' ? 'Hybrid' : 'Tại văn phòng'}
                                </span>
                              </>
                            )}
                          </div>

                          {/* 4. Ứng tuyển ngày bao nhiêu & Nộp CV nào */}
                          <div className="pt-1 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-[#6e7977]">
                            {/* Ứng tuyển ngày bao nhiêu */}
                            <div className="flex items-center gap-1 text-[#3e4947]">
                              <span className="material-symbols-outlined text-[16px] text-[#005c55]">calendar_month</span>
                              <span>
                                Ứng tuyển ngày: <strong className="text-[#131b2e]">{formatDateTime(app.appliedAt)}</strong>
                              </span>
                            </div>

                            {/* Nộp CV nào */}
                            <div className="flex items-center gap-1 text-[#3e4947]">
                              <span className="material-symbols-outlined text-[16px] text-[#005c55]">description</span>
                              <span>
                                CV đã nộp: <strong className="text-[#005c55]">{app.cvTitle || 'CV của bạn'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lịch phỏng vấn nếu đơn ở trạng thái interview */}
                    {app.status === 'interview' && (
                      <div className="mt-3.5 p-3 sm:p-3.5 rounded-xl bg-teal-50/80 border border-teal-200/80 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[#005c55] font-bold">
                          <span className="material-symbols-outlined text-[17px]">event_available</span>
                          <span>Lịch hẹn phỏng vấn:</span>
                        </div>
                        {interviewsMap[app.id] ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#131b2e] pl-6 pt-0.5">
                            <div>
                              <span className="text-[#6e7977]">Thời gian: </span>
                              <strong className="text-[#005c55] font-bold">
                                {formatDateTime(interviewsMap[app.id].scheduledAt)}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[#6e7977]">Nơi gặp / Địa điểm: </span>
                              <strong className="text-[#131b2e] font-semibold">
                                {interviewsMap[app.id].note || 'Theo thông báo từ nhà tuyển dụng'}
                              </strong>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[#6e7977] pl-6 italic">
                            Đang tải chi tiết lịch hẹn phỏng vấn...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Bar: Nút bấm nhắn tin (sau này sẽ làm) & Rút hồ sơ */}
                    <div className="mt-4 pt-3 border-t border-[#eaedff] flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        {/* Nút bấm nhắn tin với nhà tuyển dụng */}
                        <button
                          type="button"
                          disabled={openingChatId === app.id}
                          onClick={() => handleOpenChat(app)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                          title={`Nhắn tin trao đổi với ${app.companyName || 'nhà tuyển dụng'}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                          <span>{openingChatId === app.id ? 'Đang mở...' : 'Nhắn tin'}</span>
                        </button>

                        {/* Xem chi tiết tin tuyển dụng */}
                        <Link
                          to={`/jobs/${app.jobPostId}`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] font-semibold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          <span>Xem tin tuyển dụng</span>
                        </Link>

                        {/* Xem thư giới thiệu nếu có */}
                        {app.coverLatter && (
                          <button
                            type="button"
                            onClick={() => setExpandedLetterId(expandedLetterId === app.id ? null : app.id)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[#005c55] hover:bg-[#eaedff] font-semibold transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">mail</span>
                            <span>{expandedLetterId === app.id ? 'Ẩn thư xin việc' : 'Xem thư xin việc'}</span>
                          </button>
                        )}
                      </div>

                      {/* Nút rút hồ sơ */}
                      {app.status !== 'accepted' && (
                        <button
                          type="button"
                          onClick={() => handleWithdraw(app.id, app.jobTitle)}
                          className="text-[#6e7977] hover:text-[#ba1a1a] transition-colors flex items-center gap-1 font-semibold py-1 px-2 rounded-lg hover:bg-rose-50"
                          title="Rút hồ sơ ứng tuyển này"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span>Rút hồ sơ</span>
                        </button>
                      )}
                    </div>

                    {/* Thư giới thiệu đính kèm nếu được mở */}
                    {expandedLetterId === app.id && app.coverLatter && (
                      <div className="mt-3 p-3.5 rounded-xl bg-[#f2f3ff] text-xs text-[#3e4947] space-y-1.5 animate-fadeIn border border-[#eaedff]">
                        <p className="font-bold text-[#131b2e] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-[#005c55]">format_quote</span>
                          Thư xin việc của bạn:
                        </p>
                        <p className="whitespace-pre-line leading-relaxed">{app.coverLatter}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Right Sidebar Widgets */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Cẩm nang nghề nghiệp Card */}
              <div className="bg-gradient-to-br from-[#005c55] to-[#0f766e] text-white p-5 rounded-3xl shadow-md space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#9cf2e8]">
                    Góc tư vấn nghề nghiệp
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-[#6ffbbe]">tips_and_updates</span>
                </div>
                <h3 className="text-base font-bold">Bí quyết phỏng vấn và phản hồi nhanh</h3>
                <p className="text-xs text-white/90 leading-relaxed">
                  Nhà tuyển dụng thường ưu tiên những ứng viên phản hồi email hoặc cuộc gọi trong vòng 24 giờ. Hãy luôn bật thông báo và kiểm tra hộp thư đến thường xuyên!
                </p>
                <Link
                  to="/career-guide"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9cf2e8] hover:underline pt-1"
                >
                  <span>Xem hướng dẫn chuẩn bị phỏng vấn</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>

              {/* Quy trình xét duyệt hồ sơ */}
              <div className="bg-white p-5 rounded-3xl border border-[#eaedff] shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-[#131b2e] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#005c55] text-[18px]">checklist</span>
                  Quy trình xét duyệt hồ sơ
                </h3>
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-[#eaedff] text-[#005c55] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-[#131b2e]">Đã nộp hồ sơ</p>
                      <p className="text-[#6e7977] text-[11px]">Hồ sơ đã được gửi đến hộp thư tuyển dụng của công ty.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-[#eaedff] text-[#005c55] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-[#131b2e]">Đã xem hồ sơ</p>
                      <p className="text-[#6e7977] text-[11px]">HR hoặc người phụ trách tuyển dụng đã mở xem chi tiết CV của bạn.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-[#eaedff] text-[#005c55] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-[#131b2e]">Vào sơ tuyển &amp; Phỏng vấn</p>
                      <p className="text-[#6e7977] text-[11px]">Hồ sơ của bạn phù hợp và được xếp lịch phỏng vấn trao đổi chuyên sâu.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-[#6ffbbe]/30 text-[#005e3f] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      4
                    </div>
                    <div>
                      <p className="font-semibold text-[#131b2e]">Trúng tuyển &amp; Nhận việc</p>
                      <p className="text-[#6e7977] text-[11px]">Công ty gửi đề nghị làm việc chính thức và bắt đầu thử việc.</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
