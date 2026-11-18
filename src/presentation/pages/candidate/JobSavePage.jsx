import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { hasAuthCookie } from '../../../infrastructure/utils/cookieUtils';
import { savedJobApi } from '../../../infrastructure/api/savedJobApi';

export default function JobSavePage() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const showToast = useCallback((message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(''), 3500);
  }, []);

  const loadSavedJobs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await savedJobApi.getSavedJobs();
      const rawList = Array.isArray(response)
        ? response
        : response?.data ?? response?.content ?? response?.items ?? [];

      const jobs = rawList.map((item) => {
        const job = item.jobPost ?? item.job ?? item;
        return {
          id: item.id,
          jobId: item.jobId ?? job.id,
          title: item.jobTitle ?? job.title ?? 'Chưa có tiêu đề',
          company:
            item.companyName ??
            job.companyName ??
            job.company?.name ??
            job.company?.companyName ??
            'Nhà tuyển dụng KiemJob',
          companyLogo:
            item.companyLogo ??
            job.companyLogo ??
            job.company?.logo ??
            job.company?.logoUrl,
        };
      });

      setSavedJobs(jobs);
    } catch (err) {
      console.error('Lỗi khi tải danh sách việc đã lưu:', err);
      setError(
        err?.message || 'Không thể tải danh sách việc làm đã lưu. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasAuthCookie()) return;
    loadSavedJobs();
  }, [loadSavedJobs]);

  const handleRemoveSaved = async (jobId) => {
    try {
      await savedJobApi.removeSavedJob(jobId);
      setSavedJobs((prev) => prev.filter((job) => String(job.jobId) !== String(jobId)));
      showToast('Đã bỏ lưu tin tuyển dụng thành công.');
    } catch (err) {
      showToast(err?.message || 'Không thể bỏ lưu việc làm. Vui lòng thử lại.');
    }
  };

  const filteredJobs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return savedJobs;

    return savedJobs.filter((job) => {
      const title = String(job.title ?? '').toLowerCase();
      const company = String(job.company ?? '').toLowerCase();
      return title.includes(keyword) || company.includes(keyword);
    });
  }, [savedJobs, searchTerm]);

  // Dynamic KPI counts
  const totalCount = savedJobs.length;
  const uniqueCompaniesCount = useMemo(() => {
    const set = new Set(savedJobs.map((j) => j.company).filter(Boolean));
    return set.size;
  }, [savedJobs]);

  if (!hasAuthCookie()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="w-full bg-[#faf8ff] min-h-screen pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#131b2e] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 transition-all animate-fadeIn">
          <span className="material-symbols-outlined text-[#97f5cc] text-[20px]">bookmark</span>
          <span className="text-sm font-semibold">{toastMsg}</span>
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
              <li className="text-[#005c55] font-bold">Việc làm đã lưu</li>
            </ol>
          </nav>

          {/* Main Header Area with Actions */}
          <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#131b2e] tracking-tight">
                Việc Làm Đã Lưu
              </h1>
              <p className="text-[#3e4947] text-sm sm:text-base leading-relaxed">
                Quản lý danh sách các cơ hội nghề nghiệp bạn đã lưu và sẵn sàng ứng tuyển bất cứ lúc nào.
              </p>
            </div>

            {/* Quick Top Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/applications"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#f2f3ff] text-[#005c55] border border-[#eaedff] text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>Xem Việc đã ứng tuyển</span>
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
          {/* Main Layout: Saved Jobs List + Intelligence Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Saved Jobs List */}
            <div className="lg:col-span-8 space-y-4">
              {/* Loading State */}
              {loading && (
                <div className="bg-white rounded-2xl p-12 text-center border border-[#eaedff] shadow-sm space-y-3">
                  <div className="w-10 h-10 border-4 border-[#005c55] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-[#3e4947]">Đang tải danh sách việc làm đã lưu...</p>
                </div>
              )}

              {/* Error State */}
              {!loading && error && (
                <div className="bg-white rounded-2xl p-8 text-center border border-red-200 shadow-sm space-y-3">
                  <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
                  <h3 className="text-base font-bold text-[#131b2e]">Không thể tải dữ liệu</h3>
                  <p className="text-sm text-[#3e4947] max-w-md mx-auto">{error}</p>
                  <button
                    type="button"
                    onClick={loadSavedJobs}
                    className="mt-2 px-4 py-2 bg-[#005c55] text-white text-xs font-semibold rounded-xl hover:bg-[#0f766e] transition-colors"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && filteredJobs.length === 0 && (
                <div className="bg-white rounded-2xl p-12 text-center border border-[#eaedff] shadow-sm">
                  <span className="material-symbols-outlined text-5xl text-[#bdc9c6] mb-3">
                    bookmark_border
                  </span>
                  <h3 className="text-lg font-bold text-[#131b2e]">
                    {savedJobs.length === 0 ? 'Bạn chưa lưu việc làm nào' : 'Không tìm thấy việc làm phù hợp'}
                  </h3>
                  <p className="text-sm text-[#3e4947] mt-1 max-w-md mx-auto">
                    {savedJobs.length === 0
                      ? 'Khám phá ngay các vị trí việc làm phù hợp và bấm Lưu tin để tiện theo dõi và nộp đơn sau!'
                      : 'Không có tin tuyển dụng nào khớp với từ khóa tìm kiếm của bạn.'}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    {savedJobs.length === 0 ? (
                      <Link
                        to="/jobs"
                        className="px-5 py-2.5 bg-[#005c55] hover:bg-[#0f766e] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        Khám phá việc làm ngay
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="px-4 py-2 bg-[#005c55] text-white text-xs font-semibold rounded-xl hover:bg-[#0f766e] transition-colors"
                      >
                        Xóa từ khóa tìm kiếm
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Saved Jobs Items List */}
              {!loading &&
                !error &&
                filteredJobs.map((job) => (
                  <article
                    key={job.id ?? job.jobId}
                    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-[#eaedff] group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Company Logo & Core Job Information */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Company Logo */}
                        {job.companyLogo ? (
                          <img
                            src={job.companyLogo}
                            alt={job.company || 'Công ty'}
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
                            job.companyLogo ? 'hidden' : 'flex'
                          }`}
                        >
                          {(job.company || 'J').charAt(0).toUpperCase()}
                        </div>

                        {/* Thông tin hiển thị: Tên bài post, Tên công ty, Trạng thái lưu */}
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* 1. Tên bài post */}
                            <Link
                              to={`/jobs/${job.jobId}`}
                              className="text-base sm:text-lg font-bold text-[#131b2e] hover:text-[#005c55] transition-colors line-clamp-1"
                              title={job.title}
                            >
                              {job.title}
                            </Link>

                            {/* 2. Trạng thái lưu */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-teal-50 text-teal-800 border-teal-200">
                              <span
                                className="material-symbols-outlined text-[13px] fill"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                bookmark
                              </span>
                              <span>Đã lưu</span>
                            </span>
                          </div>

                          {/* 3. Tên công ty */}
                          <div className="flex items-center gap-2 text-xs text-[#3e4947] flex-wrap">
                            <span className="font-semibold text-[#131b2e] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-[#6e7977]">
                                corporate_fare
                              </span>
                              {job.company}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar: Nút ứng tuyển & Nút bỏ lưu */}
                    <div className="mt-4 pt-3 border-t border-[#eaedff] flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        {/* Nút ứng tuyển */}
                        <Link
                          to={`/jobs/${job.jobId}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#005c55] hover:bg-[#0f766e] text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          <span>Ứng tuyển ngay</span>
                        </Link>

                        {/* Xem chi tiết tin */}
                        <Link
                          to={`/jobs/${job.jobId}`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] font-semibold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          <span>Xem tin tuyển dụng</span>
                        </Link>
                      </div>

                      {/* Nút bỏ lưu */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(job.jobId)}
                        className="text-[#6e7977] hover:text-[#ba1a1a] transition-colors flex items-center gap-1 font-semibold py-1 px-2 rounded-lg hover:bg-rose-50"
                        title="Bỏ lưu việc làm này"
                      >
                        <span className="material-symbols-outlined text-[16px]">bookmark_remove</span>
                        <span>Bỏ lưu</span>
                      </button>
                    </div>
                  </article>
                ))}
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
                <h3 className="text-base font-bold">Mẹo ứng tuyển hiệu quả</h3>
                <p className="text-xs text-white/90 leading-relaxed">
                  Đừng đợi đến hạn chót mới ứng tuyển! Các công ty thường xem và lọc hồ sơ ngay từ những ngày đầu đăng tin. Hãy nộp CV sớm để tăng khả năng tiếp cận nhà tuyển dụng.
                </p>
                <Link
                  to="/career-guide"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9cf2e8] hover:underline pt-1"
                >
                  <span>Xem cẩm nang nghề nghiệp</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>

              {/* Hướng dẫn các bước */}
              <div className="bg-white p-5 rounded-3xl border border-[#eaedff] shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-[#131b2e] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#005c55] text-[18px]">checklist</span>
                  Các bước tiếp theo
                </h3>
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-[#eaedff] text-[#005c55] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-[#131b2e]">Xem lại mô tả công việc</p>
                      <p className="text-[#6e7977] text-[11px]">Đọc kỹ yêu cầu công việc và kỹ năng cần thiết.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-[#eaedff] text-[#005c55] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-[#131b2e]">Cập nhật CV phù hợp</p>
                      <p className="text-[#6e7977] text-[11px]">Chỉnh sửa CV làm nổi bật kinh nghiệm liên quan.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-[#6ffbbe]/30 text-[#005e3f] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-[#131b2e]">Bấm "Ứng tuyển ngay"</p>
                      <p className="text-[#6e7977] text-[11px]">Gửi CV và theo dõi tiến trình trong Việc đã ứng tuyển.</p>
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
