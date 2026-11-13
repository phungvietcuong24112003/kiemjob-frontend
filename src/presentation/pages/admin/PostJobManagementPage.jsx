import React, { useState, useEffect } from 'react';
import { adminApi, jobPostApi } from '../../../infrastructure/api';

const LABEL_VIETNAMESE = {
  JOB_SCAM: 'Dấu hiệu lừa đảo tuyển dụng',
  UPFRONT_FEE_REQUEST: 'Yêu cầu nộp phí / cọc tiền',
  GAMBLING_BETTING: 'Cờ bạc / Cá cược / Game bài',
  PYRAMID_MULTI_LEVEL: 'Mô hình đa cấp / Kim tự tháp',
  HIGH_SALARY_LOW_SKILL: 'Việc nhẹ lương cao bất thường',
  IDENTITY_DOCUMENT_RETENTION: 'Giữ giấy tờ tùy thân',
  ANONYMOUS_RECRUITER: 'Doanh nghiệp ẩn danh / mập mờ',
};

const getRiskLabels = (mod) => {
  if (!mod?.result?.results) return [];
  const results = mod.result.results;
  return Object.entries(results)
    .filter(([_, val]) => val?.prediction === 1)
    .map(([key, val]) => ({
      code: key,
      name: LABEL_VIETNAMESE[key] || key,
      probability: val?.probability,
      threshold: val?.threshold,
    }));
};

const formatWorkingMode = (mode) => {
  if (!mode) return 'Chưa cập nhật';
  const m = mode.toLowerCase();
  if (m === 'onsite') return 'Tại văn phòng (Onsite)';
  if (m === 'remote') return 'Làm việc từ xa (Remote)';
  if (m === 'hybrid') return 'Linh hoạt (Hybrid)';
  return mode;
};

export default function PostJobManagementPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'draft', 'open', 'closed'
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Modal State
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState([]);
  const [jobSkills, setJobSkills] = useState([]);
  const [jobSpecializations, setJobSpecializations] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [moderatingJobId, setModeratingJobId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = { size: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const data = await adminApi.getJobPosts(params);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
          ? data.content
          : [];
      setJobs(list);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      showToast('Không thể tải danh sách tin tuyển dụng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  const handleOpenJobDetail = async (job) => {
    setSelectedJob(job);
    setLoadingDetails(true);
    setJobDetails([]);
    setJobSkills([]);
    setJobSpecializations([]);

    try {
      const [detailsRes, skillsRes, specsRes, fullJobRes] = await Promise.allSettled([
        jobPostApi.getJobDetails(job.id),
        jobPostApi.getJobSkills(job.id),
        jobPostApi.getJobPostSpecializations(job.id),
        adminApi.getJobPostById(job.id),
      ]);

      if (detailsRes.status === 'fulfilled') {
        const d = detailsRes.value?.data ?? detailsRes.value;
        setJobDetails(Array.isArray(d) ? d : []);
      }
      if (skillsRes.status === 'fulfilled') {
        const s = skillsRes.value?.data ?? skillsRes.value;
        setJobSkills(Array.isArray(s) ? s : []);
      }
      if (specsRes.status === 'fulfilled') {
        const sp = specsRes.value?.data ?? specsRes.value;
        setJobSpecializations(Array.isArray(sp) ? sp : []);
      }
      if (fullJobRes.status === 'fulfilled') {
        const fj = fullJobRes.value?.data ?? fullJobRes.value;
        if (fj && fj.id) {
          setSelectedJob((prev) => ({
            ...prev,
            ...fj,
            latestModeration: fj.latestModeration || prev?.latestModeration,
          }));
        }
      }
    } catch (err) {
      console.warn('Lỗi tải dữ liệu chi tiết bài viết:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseJobDetail = () => {
    setSelectedJob(null);
    setJobDetails([]);
    setJobSkills([]);
    setJobSpecializations([]);
  };

  const handleUpdateStatus = async (id, title, newStatus) => {
    setActionLoadingId(id);
    try {
      await adminApi.updateJobPostStatus(id, newStatus);
      showToast(
        newStatus === 'open'
          ? `Đã phê duyệt và công khai tin "${title}"!`
          : newStatus === 'closed'
          ? `Đã đóng/từ chối tin tuyển dụng "${title}"`
          : `Đã chuyển tin "${title}" về trạng thái chờ duyệt`
      );
      // Refresh list
      await fetchJobs();
      if (selectedJob && selectedJob.id === id) {
        setSelectedJob((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                latestModeration: prev.latestModeration
                  ? {
                      ...prev.latestModeration,
                      moderationStatus: newStatus === 'open' ? 'approved' : 'rejected',
                    }
                  : prev.latestModeration,
              }
            : null
        );
      }
    } catch (err) {
      console.error('Error updating job status:', err);
      showToast(err?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRunAiCheck = async (jobId) => {
    setModeratingJobId(jobId);
    try {
      const res = await adminApi.checkJobModeration(jobId);
      const mod = res?.data ?? res;
      showToast(
        mod.moderationStatus === 'passed'
          ? 'Kiểm duyệt AI hoàn tất: Nội dung An Toàn!'
          : mod.moderationStatus === 'pending_review'
          ? 'Kiểm duyệt AI hoàn tất: Phát hiện rủi ro cần rà soát!'
          : 'Đã hoàn tất kiểm duyệt AI.'
      );
      await fetchJobs();
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob((prev) => (prev ? { ...prev, latestModeration: mod } : null));
      }
    } catch (err) {
      console.error('Lỗi chạy AI Moderation:', err);
      showToast(err?.response?.data?.message || 'Không thể chạy kiểm duyệt AI', 'error');
    } finally {
      setModeratingJobId(null);
    }
  };

  const handleDeleteJob = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tin tuyển dụng "${title}"?`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      await adminApi.deleteJobPost(id);
      showToast(`Đã xóa tin tuyển dụng "${title}"`);
      if (selectedJob && selectedJob.id === id) {
        handleCloseJobDetail();
      }
      fetchJobs();
    } catch (err) {
      console.error('Error deleting job:', err);
      showToast('Có lỗi xảy ra khi xóa tin tuyển dụng', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thỏa thuận';
    const fmt = (num) => {
      if (!num) return '';
      const val = Number(num);
      if (val >= 1000000) {
        return (val / 1000000).toLocaleString('vi-VN') + ' tr';
      }
      return val.toLocaleString('vi-VN') + ' đ';
    };
    if (min && max) return `${fmt(min)} - ${fmt(max)} VNĐ`;
    if (min) return `Từ ${fmt(min)} VNĐ`;
    return `Đến ${fmt(max)} VNĐ`;
  };

  const renderAiModerationBadge = (mod) => {
    if (!mod) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f2f3ff] text-[#6e7977] inline-flex items-center gap-1 border border-[#eaedff]">
          <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
          Chưa quét AI
        </span>
      );
    }

    const status = mod.moderationStatus;
    if (status === 'passed') {
      return (
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#97f5cc]/60 text-[#00513a] inline-flex items-center gap-1 border border-[#7bd8b1]/50"
          title="AI không phát hiện dấu hiệu rủi ro"
        >
          <span className="material-symbols-outlined text-[13px]">verified</span>
          An toàn (AI)
        </span>
      );
    }

    if (status === 'pending_review') {
      const risks = getRiskLabels(mod);
      return (
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a] inline-flex items-center gap-1 border border-[#ffb4ab]"
          title={risks.map((r) => r.name).join(', ') || 'AI phát hiện rủi ro'}
        >
          <span className="material-symbols-outlined text-[13px]">warning</span>
          Cảnh báo ({risks.length > 0 ? `${risks.length} rủi ro` : 'Rủi ro'})
        </span>
      );
    }

    if (status === 'approved') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 inline-flex items-center gap-1 border border-blue-200">
          <span className="material-symbols-outlined text-[13px]">task_alt</span>
          Đã phê duyệt
        </span>
      );
    }

    if (status === 'rejected') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 inline-flex items-center gap-1 border border-red-200">
          <span className="material-symbols-outlined text-[13px]">block</span>
          Đã từ chối
        </span>
      );
    }

    if (status === 'error') {
      return (
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fff2f0] text-[#ba1a1a] inline-flex items-center gap-1 border border-[#ffccc7]"
          title={mod?.result?.error || 'Lỗi kiểm duyệt AI - Quản trị viên cần xử lý thủ công'}
        >
          <span className="material-symbols-outlined text-[13px] text-[#cf1322]">error</span>
          Lỗi quét AI (Duyệt thủ công)
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 inline-flex items-center gap-1 border border-gray-200">
        <span className="material-symbols-outlined text-[13px]">help_outline</span>
        {status || 'Chưa rõ'}
      </span>
    );
  };

  const renderFormattedContent = (content) => {
    if (!content) {
      return <p className="text-[#6e7977] italic text-xs">Chưa có nội dung chi tiết cho mục này.</p>;
    }

    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-[13px] text-[#2c3635] leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-2" />;
          }
          const isBullet =
            trimmed.startsWith('- ') ||
            trimmed.startsWith('• ') ||
            trimmed.startsWith('+ ') ||
            trimmed.startsWith('* ');

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#005c55] mt-2 shrink-0" />
                <span className="flex-1">{trimmed.substring(2)}</span>
              </div>
            );
          }
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  const filteredJobs = jobs.filter((job) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (job.title && job.title.toLowerCase().includes(q)) ||
      (job.companyName && job.companyName.toLowerCase().includes(q)) ||
      (job.categoryName && job.categoryName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-white transition-all transform animate-bounce ${
            toastMsg.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#131b2e]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] text-[#97f5cc]">
            {toastMsg.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-semibold">{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold text-[#131b2e] tracking-tight">Kiểm Duyệt & Quản Lý Tin Tuyển Dụng</h1>
        </div>
        <button
          onClick={fetchJobs}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#eaedff] border border-[#eaedff] text-[#005c55] rounded-lg text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Làm mới
        </button>
      </div>

      {/* Main card */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#eaedff] shadow-xs space-y-4">
        {/* Filter and search controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f2f3ff] rounded-2xl self-start overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'draft', label: 'Chờ duyệt / Nháp' },
              { id: 'open', label: 'Đang công khai' },
              { id: 'closed', label: 'Đã đóng' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#005c55] shadow-sm'
                    : 'text-[#6e7977] hover:text-[#131b2e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977] text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, công ty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#f2f3ff] rounded-lg text-[13px] text-[#131b2e] outline-none border border-transparent focus:border-[#005c55] transition-colors"
            />
          </div>
        </div>

        {/* Jobs Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-xs text-[#6e7977]">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-[#005c55] border-t-transparent rounded-full mb-2"></div>
              <p>Đang tải danh sách tin tuyển dụng...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#6e7977]">
              <span className="material-symbols-outlined text-4xl text-[#6e7977]/40 mb-1">work_outline</span>
              <p className="font-semibold text-sm text-[#131b2e]">Không tìm thấy tin tuyển dụng nào</p>
              <p className="text-[11px] mt-0.5">Thử đổi điều kiện tìm kiếm hoặc tab trạng thái.</p>
            </div>
          ) : (
            <table className="w-full text-left text-[13px] sm:text-[14px]">
              <thead>
                <tr className="border-b border-[#eaedff] text-[#6e7977] uppercase tracking-wider font-bold text-[12px]">
                  <th className="pb-3">Tiêu đề tin tuyển</th>
                  <th className="pb-3">Doanh nghiệp</th>
                  <th className="pb-3">Ngành nghề</th>
                  <th className="pb-3">Mức lương</th>
                  <th className="pb-3">Hạn nộp</th>
                  <th className="pb-3">Kiểm duyệt AI</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f3ff]">
                {filteredJobs.map((job) => {
                  const isActioning = actionLoadingId === job.id;
                  const isModerating = moderatingJobId === job.id;
                  return (
                    <tr key={job.id} className="hover:bg-[#f2f3ff]/50 transition-colors">
                      <td className="py-3.5 pr-2">
                        <div
                          className="font-bold text-[#131b2e] hover:text-[#005c55] cursor-pointer"
                          onClick={() => handleOpenJobDetail(job)}
                        >
                          {job.title}
                        </div>
                        <div className="text-[10px] text-[#6e7977] flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>Hình thức: {formatWorkingMode(job.workingMode)}</span>
                          <span>•</span>
                          <span>Chỉ tiêu: {job.vacancies || 1} người</span>
                          {job.location && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5 text-[#005c55] font-semibold">
                                <span className="material-symbols-outlined text-[12px]">location_on</span>
                                {job.location}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-[#3e4947] font-medium">
                        {job.companyName || 'Công ty ẩn'}
                      </td>
                      <td className="py-3.5 text-[#005c55] font-semibold">
                        {job.categoryName || 'Chung'}
                      </td>
                      <td className="py-3.5 font-bold text-[#005c55] whitespace-nowrap">
                        {formatSalary(job.salaryMin, job.salaryMax)}
                      </td>
                      <td className="py-3.5 text-[#6e7977] whitespace-nowrap">
                        {job.applicationDeadline || 'Không giới hạn'}
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        {renderAiModerationBadge(job.latestModeration)}
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            job.status === 'open'
                              ? 'bg-[#97f5cc]/60 text-[#00513a]'
                              : job.status === 'draft'
                              ? 'bg-[#ffe082]/70 text-[#795548]'
                              : 'bg-[#ffdad6] text-[#ba1a1a]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              job.status === 'open'
                                ? 'bg-[#00513a]'
                                : job.status === 'draft'
                                ? 'bg-[#ff8f00]'
                                : 'bg-[#ba1a1a]'
                            }`}
                          />
                          {job.status === 'open'
                            ? 'Đang tuyển (Công khai)'
                            : job.status === 'draft'
                            ? 'Chờ duyệt'
                            : 'Đã đóng'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenJobDetail(job)}
                          className="px-2.5 py-1 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
                          title="Xem toàn bộ thông tin & chi tiết bài viết"
                        >
                          Chi tiết
                        </button>
                        {job.status !== 'open' && (
                          <button
                            type="button"
                            disabled={isActioning || isModerating}
                            onClick={() => handleUpdateStatus(job.id, job.title, 'open')}
                            className="px-2.5 py-1 bg-[#005c55] hover:bg-[#007952] disabled:opacity-50 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            Duyệt đăng
                          </button>
                        )}
                        {job.status === 'open' && (
                          <button
                            type="button"
                            disabled={isActioning || isModerating}
                            onClick={() => handleUpdateStatus(job.id, job.title, 'closed')}
                            className="px-2.5 py-1 bg-[#f2f3ff] hover:bg-[#eaedff] disabled:opacity-50 text-[#3e4947] font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            Đóng tin
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isActioning || isModerating}
                          onClick={() => handleDeleteJob(job.id, job.title)}
                          className="px-2.5 py-1 bg-[#ffdad6]/60 hover:bg-[#ffdad6] disabled:opacity-50 text-[#ba1a1a] font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* REDESIGNED MODAL DIALOG: CHI TIẾT ĐẦY ĐỦ BÀI TUYỂN DỤNG */}
      {/* ======================================================== */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-4xl lg:max-w-5xl rounded-3xl shadow-2xl border border-[#eaedff] overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#f8f9ff] via-[#f2f3ff] to-white border-b border-[#eaedff] flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Logo công ty */}
                <div className="w-14 h-14 rounded-2xl bg-white border border-[#eaedff] p-1.5 shadow-xs flex items-center justify-center shrink-0">
                  {selectedJob.companyLogo ? (
                    <img
                      src={selectedJob.companyLogo}
                      alt={selectedJob.companyName || 'Logo'}
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML =
                          '<span class="material-symbols-outlined text-[28px] text-[#6e7977]">business</span>';
                      }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[28px] text-[#6e7977]">business</span>
                  )}
                </div>

                {/* Tiêu đề & Thông tin cơ bản */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#005c55]">
                      {selectedJob.companyName || 'Công ty ẩn danh'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#eaedff] text-[#3e4947]">
                      Mã: KJ-{selectedJob.id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#e0f7ef] text-[#00695c]">
                      {selectedJob.categoryName || 'Chung'}
                    </span>
                    {selectedJob.isFeatured && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#fff8e1] text-[#b78103] flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">star</span>
                        Nổi bật
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[#131b2e] leading-snug mt-1">
                    {selectedJob.title}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-[#6e7977] mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      Ngày tạo: {selectedJob.postedAt ? new Date(selectedJob.postedAt).toLocaleDateString('vi-VN') : 'Chưa công khai'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">badge</span>
                      Hình thức: {formatWorkingMode(selectedJob.workingMode)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nút đóng */}
              <button
                onClick={handleCloseJobDetail}
                className="w-9 h-9 rounded-full bg-white hover:bg-[#eaedff] border border-[#eaedff] flex items-center justify-center text-[#6e7977] hover:text-[#131b2e] transition-colors cursor-pointer shrink-0"
                title="Đóng modal"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* 1. KHỐI TRỢ LÝ AI KIỂM DUYỆT NỘI DUNG */}
              <div className="p-5 rounded-2xl border border-[#eaedff] bg-gradient-to-br from-[#f8f9ff] via-white to-[#f0f7ff] shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#005c55] text-white flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#131b2e]">Kết Quả Kiểm Duyệt AI (Groq AI Moderation)</h4>
                      <p className="text-[11px] text-[#6e7977]">Tự động phân tích các rủi ro lừa đảo, cọc tiền, đa cấp trong tiêu đề & mô tả công việc.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {renderAiModerationBadge(selectedJob.latestModeration)}
                    <button
                      type="button"
                      disabled={moderatingJobId === selectedJob.id}
                      onClick={() => handleRunAiCheck(selectedJob.id)}
                      className="px-3 py-1.5 bg-white hover:bg-[#eaedff] border border-[#eaedff] text-[#005c55] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <span className={`material-symbols-outlined text-[15px] ${moderatingJobId === selectedJob.id ? 'animate-spin' : ''}`}>
                        {moderatingJobId === selectedJob.id ? 'refresh' : 'auto_fix_high'}
                      </span>
                      {moderatingJobId === selectedJob.id ? 'Đang phân tích...' : 'Chạy lại kiểm duyệt'}
                    </button>
                  </div>
                </div>

                {/* Chi tiết phân tích AI */}
                {(() => {
                  const mod = selectedJob.latestModeration;
                  if (!mod) {
                    return (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 text-[11px]">
                        <span className="material-symbols-outlined text-[16px] text-amber-600">info</span>
                        <span>Bài đăng này chưa được quét qua hệ thống AI. Bạn có thể nhấn <strong>"Quét lại bằng AI"</strong> để phân tích rủi ro ngay.</span>
                      </div>
                    );
                  }

                  const risks = getRiskLabels(mod);
                  if (risks.length > 0) {
                    return (
                      <div className="p-4 rounded-xl bg-[#fff2f0] border border-[#ffccc7] text-[#ba1a1a] space-y-2.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#cf1322]">
                          <span className="material-symbols-outlined text-[18px]">warning</span>
                          <span>CẢNH BÁO: AI phát hiện {risks.length} dấu hiệu rủi ro tiềm ẩn!</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {risks.map((risk, idx) => (
                            <div key={idx} className="bg-white p-2.5 rounded-xl border border-[#ffccc7] flex items-center justify-between shadow-2xs">
                              <div>
                                <p className="font-bold text-xs text-[#cf1322]">{risk.name}</p>
                                <p className="text-[10px] text-[#6e7977] font-mono">{risk.code}</p>
                              </div>
                              <div className="text-right">
                                <span
                                  className="px-2 py-0.5 rounded-md font-bold text-xs bg-[#ffdad6] text-[#ba1a1a]"
                                  title="Độ tin cậy ước tính"
                                >
                                  {risk.probability != null ? `${(risk.probability * 100).toFixed(1)}%` : 'Cảnh báo'}
                                </span>
                                <p className="text-[9px] text-[#9e2a2b] mt-0.5">Độ tin cậy ước tính</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-[#8c1d1d] italic">
                          * Khuyến nghị: Quản trị viên cần rà soát kỹ phần <strong>Mô tả công việc</strong> và <strong>Quyền lợi</strong> bên dưới trước khi đưa ra quyết định duyệt.
                        </p>
                      </div>
                    );
                  }

                  if (mod.moderationStatus === 'passed') {
                    return (
                      <div className="p-3 rounded-xl bg-[#e6fbf2] border border-[#7bd8b1] text-[#00513a] flex items-center gap-2.5 text-xs font-semibold">
                        <span className="material-symbols-outlined text-[18px] text-[#007952]">verified</span>
                        <span>Đã kiểm duyệt AI an toàn: Không phát hiện dấu hiệu lừa đảo tuyển dụng, đa cấp hay yêu cầu đóng phí trước.</span>
                      </div>
                    );
                  }

                  if (mod.moderationStatus === 'approved') {
                    return (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2.5 text-xs font-semibold">
                        <span className="material-symbols-outlined text-[18px] text-blue-600">task_alt</span>
                        <span>Bài đăng này đã được Quản trị viên thẩm định và phê duyệt công khai.</span>
                      </div>
                    );
                  }

                  if (mod.moderationStatus === 'rejected') {
                    return (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-center gap-2.5 text-xs font-semibold">
                        <span className="material-symbols-outlined text-[18px] text-red-600">block</span>
                        <span>Bài đăng này đã bị Quản trị viên từ chối phê duyệt.</span>
                      </div>
                    );
                  }

                  if (mod.moderationStatus === 'error') {
                    const errorMsg = mod?.result?.error || 'Không thể kết nối đến hệ thống Groq AI hoặc đã vượt giới hạn hạn ngạch.';
                    return (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-[20px] text-amber-600 mt-0.5">error</span>
                          <div className="space-y-1">
                            <p className="font-bold text-xs text-amber-900">
                              Lỗi kiểm duyệt AI: Quá trình quét tự động gặp sự cố
                            </p>
                            <p className="text-[11px] text-amber-800 font-mono bg-white/80 p-2 rounded-lg border border-amber-200">
                              {errorMsg}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 flex-wrap gap-2 text-xs">
                          <p className="text-[11px] text-amber-800 italic">
                            * Quản trị viên có thể <strong>xử lý thủ công</strong> (Duyệt/Từ chối) ở thanh công cụ bên dưới, hoặc nhấn thử lại:
                          </p>
                          <button
                            type="button"
                            disabled={moderatingJobId === selectedJob.id}
                            onClick={() => handleRunAiCheck(selectedJob.id)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <span className={`material-symbols-outlined text-[15px] ${moderatingJobId === selectedJob.id ? 'animate-spin' : ''}`}>
                              refresh
                            </span>
                            <span>{moderatingJobId === selectedJob.id ? 'Đang kiểm tra...' : 'Chạy lại kiểm duyệt'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs">
                      Trạng thái kiểm duyệt: <strong className="uppercase">{mod.moderationStatus}</strong>
                    </div>
                  );
                })()}
              </div>

              {/* 2. KHỐI THÔNG SỐ ĐÃI NGỘ & ĐIỀU KIỆN (4 Card Highlights) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Mức lương */}
                <div className="p-3.5 bg-[#f8f9ff] rounded-2xl border border-[#eaedff] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[#6e7977] font-semibold text-[11px]">
                    <span className="material-symbols-outlined text-[16px] text-[#005c55]">payments</span>
                    <span>Mức lương</span>
                  </div>
                  <p className="font-extrabold text-[#005c55] text-sm mt-1.5 whitespace-nowrap">
                    {formatSalary(selectedJob.salaryMin, selectedJob.salaryMax)}
                  </p>
                </div>

                {/* Hình thức */}
                <div className="p-3.5 bg-[#f8f9ff] rounded-2xl border border-[#eaedff] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[#6e7977] font-semibold text-[11px]">
                    <span className="material-symbols-outlined text-[16px] text-[#005c55]">work_history</span>
                    <span>Hình thức</span>
                  </div>
                  <p className="font-bold text-[#131b2e] text-sm mt-1.5">
                    {formatWorkingMode(selectedJob.workingMode)}
                  </p>
                </div>

                {/* Số lượng tuyển */}
                <div className="p-3.5 bg-[#f8f9ff] rounded-2xl border border-[#eaedff] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[#6e7977] font-semibold text-[11px]">
                    <span className="material-symbols-outlined text-[16px] text-[#005c55]">group</span>
                    <span>Chỉ tiêu tuyển</span>
                  </div>
                  <p className="font-bold text-[#131b2e] text-sm mt-1.5">
                    {selectedJob.vacancies || 1} nhân sự
                  </p>
                </div>

                {/* Hạn nộp */}
                <div className="p-3.5 bg-[#f8f9ff] rounded-2xl border border-[#eaedff] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[#6e7977] font-semibold text-[11px]">
                    <span className="material-symbols-outlined text-[16px] text-[#005c55]">event</span>
                    <span>Hạn nộp</span>
                  </div>
                  <p className="font-bold text-[#131b2e] text-sm mt-1.5">
                    {selectedJob.applicationDeadline || 'Không giới hạn'}
                  </p>
                </div>
              </div>

              {/* 3. KHỐI ĐỊA ĐIỂM LÀM VIỆC & KỸ NĂNG/CHUYÊN MÔN (2 Cột) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Địa điểm */}
                <div className="p-4 bg-[#f8f9ff] rounded-2xl border border-[#eaedff] space-y-2">
                  <div className="flex items-center gap-1.5 text-[#6e7977] font-bold text-xs uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[18px] text-[#005c55]">location_on</span>
                    <span>Địa Điểm Làm Việc</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {Array.isArray(selectedJob.addresses) && selectedJob.addresses.length > 0 ? (
                      selectedJob.addresses.map((addr, aIdx) => (
                        <div
                          key={addr.id ?? aIdx}
                          className="bg-white p-2.5 rounded-xl border border-[#eaedff] text-[11px] space-y-0.5"
                        >
                          <div className="font-bold text-[#131b2e] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#005c55]"></span>
                            <span>{addr.provinceName || 'Tỉnh / Thành phố'}</span>
                          </div>
                          <p className="text-[#55605e] pl-2.5">
                            {addr.addressDetail || 'Chưa có địa chỉ cụ thể'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-[#131b2e]">
                        {selectedJob.location || 'Chưa cập nhật địa điểm'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Yêu cầu học vấn, Chuyên môn & Kỹ năng */}
                <div className="p-4 bg-[#f8f9ff] rounded-2xl border border-[#eaedff] space-y-3">
                  <div className="flex items-center gap-1.5 text-[#6e7977] font-bold text-xs uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[18px] text-[#005c55]">psychology</span>
                    <span>Kỹ Năng & Chuyên Môn Yêu Cầu</span>
                  </div>

                  {/* Yêu cầu học vấn */}
                  <div>
                    <span className="text-[11px] text-[#6e7977] font-semibold">Yêu cầu học vấn:</span>
                    <p className="text-xs font-bold text-[#131b2e] mt-0.5">
                      {selectedJob.educationalRequirement || 'Không yêu cầu cụ thể bằng cấp'}
                    </p>
                  </div>

                  {/* Chuyên môn liên kết */}
                  {jobSpecializations.length > 0 && (
                    <div>
                      <span className="text-[11px] text-[#6e7977] font-semibold block mb-1">Chuyên môn nghề:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {jobSpecializations.map((spec, sIdx) => (
                          <span
                            key={spec.id || sIdx}
                            className="px-2.5 py-0.5 bg-[#e0f7ef] text-[#00695c] font-semibold text-[11px] rounded-lg border border-[#b2dfdb]"
                          >
                            {spec.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kỹ năng liên quan */}
                  {jobSkills.length > 0 && (
                    <div>
                      <span className="text-[11px] text-[#6e7977] font-semibold block mb-1">Kỹ năng mong đợi:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {jobSkills.map((skill, kIdx) => (
                          <span
                            key={skill.id || kIdx}
                            className="px-2.5 py-0.5 bg-white text-[#005c55] font-semibold text-[11px] rounded-lg border border-[#eaedff] shadow-2xs"
                          >
                            {skill.skillName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. KHỐI NỘI DUNG MÔ TẢ CHI TIẾT BÀI ĐĂNG (JOB DETAILS) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-[#eaedff] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-6 rounded-full bg-[#005c55]"></span>
                    <h4 className="text-sm font-black text-[#131b2e] tracking-tight uppercase">
                      Nội Dung Chi Tiết Bài Tuyển Dụng (Job Description & Requirements)
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#6e7977] font-semibold">
                    {loadingDetails ? 'Đang tải...' : `${jobDetails.length} phần nội dung`}
                  </span>
                </div>

                {loadingDetails ? (
                  <div className="py-10 text-center text-xs text-[#6e7977] bg-[#f8f9ff] rounded-2xl border border-[#eaedff]">
                    <div className="inline-block animate-spin w-5 h-5 border-2 border-[#005c55] border-t-transparent rounded-full mb-2"></div>
                    <p>Đang tải toàn bộ mô tả chi tiết bài viết...</p>
                  </div>
                ) : jobDetails.length > 0 ? (
                  <div className="space-y-4">
                    {jobDetails.map((detail, idx) => (
                      <div
                        key={detail.id || idx}
                        className="p-5 bg-[#fbfcff] rounded-2xl border border-[#eaedff] shadow-xs space-y-2.5 transition-all hover:border-[#ccd7ff]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#005c55]"></span>
                          <h5 className="font-extrabold text-sm text-[#131b2e]">
                            {detail.title || `Mục chi tiết #${idx + 1}`}
                          </h5>
                        </div>
                        <div className="pl-4 border-l-2 border-[#eaedff]">
                          {renderFormattedContent(detail.content)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#6e7977] bg-[#f8f9ff] rounded-2xl border border-[#eaedff]">
                    <span className="material-symbols-outlined text-3xl text-[#6e7977]/50 mb-1">description</span>
                    <p className="font-bold text-[#131b2e]">Chưa có nội dung mô tả chi tiết</p>
                    <p className="text-[11px] mt-0.5">Nhà tuyển dụng chưa bổ sung các mục chi tiết công việc.</p>
                  </div>
                )}
              </div>

              {/* Trạng thái hiện tại */}
              <div className="flex items-center justify-between p-3.5 bg-[#f2f3ff] rounded-2xl border border-[#eaedff] text-xs">
                <span className="text-[#6e7977] font-semibold">Trạng thái phát hành hiện tại:</span>
                <span
                  className={`px-3 py-1 rounded-full font-bold text-xs ${
                    selectedJob.status === 'open'
                      ? 'bg-[#97f5cc]/60 text-[#00513a]'
                      : selectedJob.status === 'draft'
                      ? 'bg-[#ffe082]/70 text-[#795548]'
                      : 'bg-[#ffdad6] text-[#ba1a1a]'
                  }`}
                >
                  {selectedJob.status === 'open'
                    ? 'Đang tuyển (Công khai trên toàn hệ thống)'
                    : selectedJob.status === 'draft'
                    ? 'Chờ duyệt / Chưa công khai'
                    : 'Đã đóng tuyển dụng'}
                </span>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-[#f2f3ff] border-t border-[#eaedff] flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleDeleteJob(selectedJob.id, selectedJob.title)}
                className="px-4 py-2.5 bg-[#ffdad6]/70 hover:bg-[#ffdad6] text-[#ba1a1a] font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Xóa tin này</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseJobDetail}
                  className="px-5 py-2.5 bg-white hover:bg-[#eaedff] border border-[#eaedff] text-[#3e4947] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>

                {selectedJob.status !== 'open' ? (
                  <>
                    <button
                      type="button"
                      disabled={actionLoadingId === selectedJob.id}
                      onClick={() => handleUpdateStatus(selectedJob.id, selectedJob.title, 'closed')}
                      className="px-4 py-2.5 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      <span>Từ chối duyệt</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === selectedJob.id}
                      onClick={() => handleUpdateStatus(selectedJob.id, selectedJob.title, 'open')}
                      className="px-6 py-2.5 bg-[#005c55] hover:bg-[#007952] text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Duyệt & Công Khai</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={actionLoadingId === selectedJob.id}
                      onClick={() => handleUpdateStatus(selectedJob.id, selectedJob.title, 'draft')}
                      className="px-4 py-2.5 bg-white hover:bg-[#eaedff] border border-[#eaedff] text-[#795548] font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">undo</span>
                      <span>Chuyển về Chờ duyệt</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === selectedJob.id}
                      onClick={() => handleUpdateStatus(selectedJob.id, selectedJob.title, 'closed')}
                      className="px-5 py-2.5 bg-[#131b2e] hover:bg-[#232f48] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">pause_circle</span>
                      <span>Đóng tuyển dụng</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
