import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { featurePackageApi } from '../../../infrastructure/api/featurePackageApi';
import {
  getRecruiterProfile,
  getJobPosts,
  updateJobPostStatus,
  deleteJobPost as deleteJobPostApi,
} from '../../../infrastructure/api';

export default function JobManagementPage() {
  const navigate = useNavigate();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [statusTab, setStatusTab] = useState('all');
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [selectedJobForBoost, setSelectedJobForBoost] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const [jobs, setJobs] = useState([]);
  const [companyName, setCompanyName] = useState('Doanh nghiệp');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Feature Packages State (GET /api/feature-packages)
  const [featurePackages, setFeaturePackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packageError, setPackageError] = useState(null);

  const loadFeaturePackages = useCallback(async () => {
    setLoadingPackages(true);
    setPackageError(null);
    try {
      const res = await featurePackageApi.getActivePackages();
      const list = Array.isArray(res) ? res : res?.content || [];
      setFeaturePackages(list);
    } catch (err) {
      console.warn('Lỗi tải danh sách gói dịch vụ:', err);
      setPackageError(err?.message || 'Không thể tải danh sách gói quảng bá');
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    if (showBoostModal && featurePackages.length === 0) {
      loadFeaturePackages();
    }
  }, [showBoostModal, featurePackages.length, loadFeaturePackages]);

  const loadJobs = async () => {
    setLoading(true);
    setLoadError('');

    try {
      const recruiterResponse = await getRecruiterProfile();
      const recruiter = recruiterResponse?.data ?? recruiterResponse;
      const companyId = recruiter?.companyId;
      if (recruiter?.companyName || recruiter?.company_name) {
        setCompanyName(recruiter.companyName || recruiter.company_name);
      }

      if (!companyId) {
        throw new Error('Không tìm thấy thông tin công ty của nhà tuyển dụng.');
      }

      const response = await getJobPosts({ companyId, size: 100 });

      const jobPosts = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.data?.content)
            ? response.data.content
            : Array.isArray(response?.data)
              ? response.data
              : Array.isArray(response?.data?.data)
                ? response.data.data
                : [];

      const jobsProcessed = jobPosts.map((job) => {
        const salaryMin = job.salaryMin;
        const salaryMax = job.salaryMax;

        let salaryDisplay = 'Thỏa thuận';
        if (salaryMin != null && salaryMax != null) {
          salaryDisplay = `${Number(salaryMin).toLocaleString('vi-VN')} - ${Number(salaryMax).toLocaleString('vi-VN')} VNĐ`;
        } else if (salaryMin != null) {
          salaryDisplay = `Từ ${Number(salaryMin).toLocaleString('vi-VN')} VNĐ`;
        } else if (salaryMax != null) {
          salaryDisplay = `Đến ${Number(salaryMax).toLocaleString('vi-VN')} VNĐ`;
        }

        const rawStatus = String(job.status ?? '').toLowerCase();

        let status = rawStatus;
        if (['open', 'active', 'approved'].includes(rawStatus)) {
          status = 'active';
        } else if (['closed', 'paused'].includes(rawStatus)) {
          status = 'closed';
        } else if (['pending', 'pending_approval', 'draft'].includes(rawStatus)) {
          status = 'pending';
        } else if (['expired'].includes(rawStatus)) {
          status = 'expired';
        }

        const deadline = job.applicationDeadline
          ? new Date(`${job.applicationDeadline}T00:00:00`).toLocaleDateString('vi-VN')
          : 'Không xác định';

        const categoryName = String(job.categoryName ?? '').toLowerCase();
        let category = 'other';
        if (categoryName.includes('công nghệ') || categoryName.includes('it') || categoryName.includes('software')) {
          category = 'it';
        } else if (categoryName.includes('thiết kế') || categoryName.includes('design')) {
          category = 'design';
        } else if (categoryName.includes('tài chính') || categoryName.includes('finance')) {
          category = 'finance';
        }

        return {
          ...job,
          id: job.id,
          code: `KJ-${job.id}`,
          title: job.title ?? 'Chưa có tiêu đề',
          category,
          categoryName: job.categoryName,
          status,
          status_label:
            status === 'active'
              ? 'Đang hiển thị'
              : status === 'pending'
              ? 'Chờ duyệt'
              : status === 'expired'
              ? 'Đã hết hạn'
              : 'Đã tạm dừng',
          salary_display: salaryDisplay,
          location:
            job.location ||
            (Array.isArray(job.addresses) && job.addresses.length > 0
              ? [...new Set(job.addresses.map((a) => a.provinceName).filter(Boolean))].join(', ') ||
                job.addresses[0]?.addressDetail
              : null) ||
            'Toàn quốc',
          addresses: job.addresses || [],
          working_method: job.workingMode ?? 'Toàn thời gian',
          vacancies: job.vacancies || 1,
          deadline,
          applicants: job.applicantsCount ?? job.applicants ?? 0,
          views: job.views ?? 0,
          skills: Array.isArray(job.skills) ? job.skills : [],
        };
      });

      setJobs(jobsProcessed);
    } catch (err) {
      console.error('Lỗi tải danh sách tin tuyển dụng:', err);
      setLoadError(err.message || 'Không thể tải danh sách tin tuyển dụng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const tabCounts = {
    all: jobs.length,
    active: jobs.filter((j) => j.status === 'active').length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    closed: jobs.filter((j) => j.status === 'closed' || j.status === 'expired').length,
  };

  const filteredJobs = jobs.filter((job) => {
    const matchSearch =
      searchTerm === '' ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCat = selectedCategory === 'all' || job.category === selectedCategory;

    let matchTab = true;
    if (statusTab === 'active') matchTab = job.status === 'active';
    else if (statusTab === 'pending') matchTab = job.status === 'pending';
    else if (statusTab === 'closed') matchTab = job.status === 'closed' || job.status === 'expired';

    return matchSearch && matchCat && matchTab;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (selectedSort === 'candidates') return b.applicants - a.applicants;
    if (selectedSort === 'views') return b.views - a.views;
    return b.id - a.id;
  });

  const handleOpenBoost = (job) => {
    setSelectedJobForBoost(job);
    setShowBoostModal(true);
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin tuyển dụng này không? Thao tác không thể hoàn tác.')) {
      return;
    }

    try {
      await deleteJobPostApi(jobId);
      await loadJobs();
      showToast('Đã xóa tin tuyển dụng thành công!');
    } catch (error) {
      console.error('Lỗi xóa tin tuyển dụng:', error);
      showToast(error.response?.data?.message || 'Không thể xóa tin tuyển dụng.');
    }
  };

  const handleToggleJobStatus = async (jobId) => {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) return;

    if (job.status === 'pending') {
      showToast('Tin tuyển dụng đang chờ Quản trị viên duyệt, chưa thể mở công khai.');
      return;
    }

    const isCurrentlyActive = job.status === 'active';
    const nextStatus = isCurrentlyActive ? 'closed' : 'open';

    try {
      await updateJobPostStatus(jobId, nextStatus);
      await loadJobs();
      showToast(isCurrentlyActive ? 'Đã tạm dừng tin tuyển dụng!' : 'Đã mở lại tin tuyển dụng!');
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);
      showToast(error.response?.data?.message || 'Không thể cập nhật trạng thái tin tuyển dụng.');
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700 text-xs font-semibold">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Link to="/recruiter" className="hover:text-[#005c55] flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">home</span>
              <span>Bảng điều khiển</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Quản lý tin tuyển dụng</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Danh sách bài đăng tuyển dụng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Doanh nghiệp: <strong>{companyName}</strong> ({jobs.length} tin đã tạo)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenBoost(null)}
            className="h-9 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">rocket_launch</span>
            <span>Nâng Cấp Gói Tin</span>
          </button>

          <Link
            to="/recruiter/post-job"
            className="h-9 px-3.5 rounded-lg bg-[#005c55] text-white hover:bg-[#007952] text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Đăng tin mới</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-3.5 rounded-xl bg-white shadow-xs border border-slate-200 space-y-3">
        {/* Search & Select Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tiêu đề tin tuyển dụng, mã tin..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 text-slate-900 text-xs placeholder:text-slate-400 border border-slate-200 outline-none focus:bg-white focus:border-[#005c55] transition-colors"
            />
          </div>

          <div className="relative min-w-[200px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 pl-3 pr-8 rounded-lg bg-slate-50 text-slate-800 text-xs font-medium border border-slate-200 outline-none focus:border-[#005c55] cursor-pointer appearance-none"
            >
              <option value="all">Tất cả ngành nghề</option>
              <option value="it">Công nghệ thông tin</option>
              <option value="design">Thiết kế đồ họa</option>
              <option value="finance">Tài chính - Ngân hàng</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
              expand_more
            </span>
          </div>

          <div className="relative min-w-[170px]">
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="w-full h-9 pl-3 pr-8 rounded-lg bg-slate-50 text-slate-800 text-xs font-medium border border-slate-200 outline-none focus:border-[#005c55] cursor-pointer appearance-none"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="candidates">Nhiều ứng viên nhất</option>
              <option value="views">Lượt xem cao nhất</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
              sort
            </span>
          </div>
        </div>

        {/* Status Tabs Ribbon */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                statusTab === 'all'
                  ? 'bg-[#005c55] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Tất cả</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusTab === 'all' ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                {tabCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('active')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                statusTab === 'active'
                  ? 'bg-[#005c55] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Đang hiển thị</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusTab === 'active' ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                {tabCounts.active}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                statusTab === 'pending'
                  ? 'bg-[#005c55] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Chờ duyệt</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusTab === 'pending' ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                {tabCounts.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('closed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                statusTab === 'closed'
                  ? 'bg-[#005c55] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Đã tạm dừng</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusTab === 'closed' ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                {tabCounts.closed}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            Hiển thị <strong>{sortedJobs.length}</strong> / {jobs.length} tin
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="p-10 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            <div className="w-6 h-6 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Đang tải danh sách bài đăng...
          </div>
        ) : loadError ? (
          <div className="p-6 text-center bg-white rounded-xl border border-red-200 text-xs">
            <p className="text-red-600 mb-2">{loadError}</p>
            <button
              type="button"
              onClick={loadJobs}
              className="px-3 py-1.5 rounded-lg bg-[#005c55] text-white font-semibold cursor-pointer"
            >
              Tải lại
            </button>
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[22px]">work_outline</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {jobs.length === 0 ? 'Chưa có tin tuyển dụng nào được tạo' : 'Không có bài đăng nào khớp với bộ lọc'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5">
                {jobs.length === 0
                  ? 'Bắt đầu đăng tin tuyển dụng đầu tiên để tiếp cận ứng viên tiềm năng trên hệ thống KiemJob.'
                  : 'Hãy thử đổi từ khóa tìm kiếm hoặc lọc theo trạng thái khác.'}
              </p>
            </div>
            {jobs.length === 0 && (
              <Link
                to="/recruiter/post-job"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[#005c55] text-white text-xs font-semibold hover:bg-[#007952] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Tạo bài đăng mới</span>
              </Link>
            )}
          </div>
        ) : (
          sortedJobs.map((job) => (
            <div
              key={job.id}
              className="p-4 rounded-xl bg-white shadow-xs border border-slate-200 hover:border-slate-300 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Column: Job Info */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#005c55] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">work</span>
                </div>

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {job.code}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        job.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : job.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          job.status === 'active'
                            ? 'bg-emerald-500'
                            : job.status === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      {job.status_label}
                    </span>

                    {job.categoryName && (
                      <span className="text-[11px] text-slate-500">
                        {job.categoryName}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <Link
                    to={`/recruiter/jobs/${job.id}`}
                    className="text-sm font-bold text-slate-900 hover:text-[#005c55] transition-colors line-clamp-1"
                  >
                    {job.title}
                  </Link>

                  {/* Meta strip */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-0.5">
                    <span className="font-semibold text-[#005c55]">
                      {job.salary_display}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span>{job.location}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">event</span>
                      <span>Hạn nộp: {job.deadline}</span>
                    </span>
                    <span>•</span>
                    <span>Tuyển {job.vacancies} chỉ tiêu</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Metrics & Actions */}
              <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                {/* Metrics */}
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 shrink-0">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Hồ sơ</span>
                    <span className="text-sm font-bold text-[#005c55] leading-none">
                      {job.applicants}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Lượt xem</span>
                    <span className="text-sm font-bold text-slate-700 leading-none">
                      {job.views}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    to={`/recruiter/jobs/${job.id}`}
                    className="h-8 px-3 rounded-lg bg-[#005c55] hover:bg-[#007952] text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                  >
                    <span>Chi tiết</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleToggleJobStatus(job.id)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      job.status === 'closed'
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title={job.status === 'closed' ? 'Mở lại tuyển dụng' : 'Tạm dừng tuyển'}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {job.status === 'closed' ? 'play_arrow' : 'pause'}
                    </span>
                    <span className="hidden sm:inline">
                      {job.status === 'closed' ? 'Mở lại' : 'Tạm dừng'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteJob(job.id)}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
                    title="Xóa tin tuyển dụng"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Promotion Modal */}
      {showBoostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-xl">rocket_launch</span>
                <h3 className="text-base font-bold text-slate-900">Nâng Cấp Gói Quảng Bá Tin</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBoostModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Chọn gói quảng bá tin tuyển dụng tối ưu để ghim tin lên đầu trang và tiếp cận thêm nhiều ứng viên tiềm năng:
            </p>

            {loadingPackages && (
              <div className="py-10 text-center">
                <div className="inline-block w-6 h-6 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-xs text-slate-500">Đang tải danh sách gói...</p>
              </div>
            )}

            {!loadingPackages && packageError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="text-xs text-red-600">{packageError}</p>
                <button
                  type="button"
                  onClick={loadFeaturePackages}
                  className="mt-2 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded"
                >
                  Thử lại
                </button>
              </div>
            )}

            {!loadingPackages && !packageError && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {featurePackages.length === 0 ? (
                  <p className="col-span-3 text-center text-xs text-slate-400 py-6">
                    Hiện chưa có gói quảng bá nào đang hoạt động
                  </p>
                ) : (
                  featurePackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-[#005c55] transition-colors flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-[#005c55]">
                          {pkg.durationDays || pkg.duration_days || 7} ngày
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{pkg.name}</h4>
                        <p className="text-[11px] text-slate-500 leading-snug">{pkg.description}</p>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-200">
                        <div className="text-xs font-bold text-[#005c55]">
                          {new Intl.NumberFormat('vi-VN').format(pkg.price || 0)} đ
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            showToast(`Đã kích hoạt gói: ${pkg.name}`);
                            setShowBoostModal(false);
                          }}
                          className="w-full mt-1.5 py-1 bg-[#005c55] hover:bg-[#007952] text-white rounded text-xs font-semibold cursor-pointer"
                        >
                          Kích hoạt
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
