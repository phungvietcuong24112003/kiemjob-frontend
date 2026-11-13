import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import jobPostApi from '../../../infrastructure/api/jobPostApi';
import applicationApi from '../../../infrastructure/api/appicationApi';
import featurePackageApi from '../../../infrastructure/api/featurePackageApi';
import EditJobModal from '../../components/recruiter/EditJobModal';
import PromoteJobModal from './components/PromoteJobModal';
import ApplicantTable from '../../components/recruiter/ApplicantTable';
import CvDetailModal from '../../components/recruiter/CvDetailModal';
import useAiScores from '../../../application/hooks/useAiScores';
import apiClient from '../../../infrastructure/api/client';
import {
  WORK_MODES,
  EXPERIENCE_LEVELS,
  JOB_STATUSES,
} from '../../../domain/constants';

/**
 * JobDetailManagementPage - Quản lý chi tiết tin tuyển dụng & ứng viên (Recruiter)
 * Giao diện chuẩn hóa tương đồng với trang JobDetailPage.jsx bên ứng viên,
 * đồng thời giữ nguyên toàn bộ tính năng quản trị: sửa tin, đẩy top, đổi trạng thái, duyệt CV.
 */
export default function JobDetailManagementPage() {
  const { id } = useParams();

  // State Dữ liệu chính
  const [job, setJob] = useState(null);
  const [categories, setCategories] = useState([]);
  const [jobDetails, setJobDetails] = useState([]);
  const [jobSkills, setJobSkills] = useState([]);
  const [applications, setApplications] = useState([]);

  // State Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State Bộ lọc Ứng viên
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Toast
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState('general');
  const [jobAddresses, setJobAddresses] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);

  // State Đẩy Top (Promote Feature Packages)
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [packages, setPackages] = useState([]);
  const [promotedInfo, setPromotedInfo] = useState(null);

  // Hook quản lý chấm điểm AI trong phiên
  const {
    scores: aiScores,
    batchProgress,
    scoreOne,
    scoreBatch,
  } = useAiScores();

  const openEditModal = (tab = 'general') => {
    setEditModalTab(tab);
    setIsEditModalOpen(true);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const unwrap = (response) => {
    const data = response?.data ?? response;
    return data?.data ?? data;
  };

  // ── Tải toàn bộ thông tin tin tuyển dụng từ Backend ──
  const loadJobData = useCallback(async () => {
    if (!id) {
      setError('Không tìm thấy mã tin tuyển dụng.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [jobRes, categoryRes, detailsRes, skillsRes, appRes, addressesRes, packagesRes] =
        await Promise.allSettled([
          jobPostApi.getJobPostById(id),
          jobPostApi.getJobCategories(),
          jobPostApi.getJobDetails(id),
          jobPostApi.getJobSkills(id),
          jobPostApi.getJobApplications(id),
          jobPostApi.getJobAddresses(id),
          featurePackageApi.getActivePackages(),
        ]);

      if (jobRes.status === 'fulfilled') {
        setJob(unwrap(jobRes.value));
      } else {
        throw jobRes.reason;
      }

      if (packagesRes.status === 'fulfilled') {
        const pkgData = unwrap(packagesRes.value);
        setPackages(Array.isArray(pkgData) ? pkgData : []);
      }

      if (categoryRes.status === 'fulfilled') {
        const catData = unwrap(categoryRes.value);
        setCategories(Array.isArray(catData) ? catData : catData?.content ?? []);
      }

      if (detailsRes.status === 'fulfilled') {
        const dData = unwrap(detailsRes.value);
        setJobDetails(Array.isArray(dData) ? dData : []);
      }

      if (skillsRes.status === 'fulfilled') {
        const sData = unwrap(skillsRes.value);
        setJobSkills(Array.isArray(sData) ? sData : []);
      }

      if (appRes.status === 'fulfilled') {
        const aData = unwrap(appRes.value);
        setApplications(Array.isArray(aData) ? aData : []);
      }

      if (addressesRes.status === 'fulfilled') {
        const addrData = unwrap(addressesRes.value);
        setJobAddresses(Array.isArray(addrData) ? addrData : []);
      } else if (jobRes.status === 'fulfilled') {
        const jData = unwrap(jobRes.value);
        if (Array.isArray(jData?.addresses)) {
          setJobAddresses(jData.addresses);
        }
      }
    } catch (err) {
      console.error('Không thể tải chi tiết tin tuyển dụng:', err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải thông tin tin tuyển dụng. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJobData();
  }, [loadJobData]);

  // ── Đổi trạng thái tin: Mở / Tạm dừng ──
  const toggleJobStatus = async () => {
    if (!job) return;

    if (job.status === 'draft') {
      showToast('Tin tuyển dụng đang chờ Quản trị viên duyệt, chưa thể mở công khai.');
      return;
    }

    const newStatus = job.status === 'open' ? 'closed' : 'open';

    try {
      await jobPostApi.updateJobPostStatus(job.id, newStatus);
      setJob((prev) => ({
        ...prev,
        status: newStatus,
      }));
      showToast(
        newStatus === 'open'
          ? 'Đã mở lại tin tuyển dụng.'
          : 'Đã tạm dừng tin tuyển dụng.'
      );
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái:', err);
      showToast(
        err?.response?.data?.message ||
        'Không thể cập nhật trạng thái tin tuyển dụng.'
      );
    }
  };

  // ── Modal Xem CV ──
  const [selectedCandidateForCv, setSelectedCandidateForCv] = useState(null);
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);

  const openCandidateCvModal = async (app) => {
    setSelectedCandidateForCv(app);
    setIsCvModalOpen(true);
    // Mở CV lần đầu: tự động chuyển pending -> viewed ở backend
    try {
      const res = await applicationApi.getApplicationById(app.id);
      const updated = res?.data ?? res;
      if (updated?.status && updated.status !== app.status) {
        setApplications((prev) =>
          prev.map((a) => (a.id === app.id ? { ...a, status: updated.status } : a))
        );
      }
    } catch {
      // ignore
    }
  };

  // ── Đổi trạng thái hồ sơ ứng viên đơn lẻ ──
  const updateCandidateStatus = async (applicationId, newStatus) => {
    try {
      await applicationApi.updateApplicationStatus(applicationId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a))
      );
      showToast('Đã cập nhật trạng thái hồ sơ ứng viên.');
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái hồ sơ:', err);
      showToast(err?.response?.data?.message || 'Không thể cập nhật trạng thái ứng viên.');
    }
  };

  // ── Đổi trạng thái ứng viên hàng loạt ──
  const handleBulkChangeStatus = async (applicationIds, newStatus) => {
    try {
      const res = await applicationApi.bulkUpdateApplicationStatus(applicationIds, newStatus);
      const updatedCount = res?.data?.updatedCount ?? applicationIds.length;
      setApplications((prev) =>
        prev.map((a) => (applicationIds.includes(a.id) ? { ...a, status: newStatus } : a))
      );
      showToast(`Đã cập nhật ${updatedCount} hồ sơ sang trạng thái mới.`);
    } catch (err) {
      console.error('Lỗi đổi trạng thái hàng loạt:', err);
      showToast(err?.response?.data?.message || 'Không thể cập nhật trạng thái hàng loạt.');
    }
  };

  // ── Chấm điểm tất cả CV chưa chấm (tối đa 2 request song song phía client) ──
  const handleBulkScoreAll = () => {
    if (batchProgress.isRunning) return;
    const unscoredIds = applications
      .filter(
        (a) =>
          !aiScores[a.id] ||
          aiScores[a.id].status === 'idle' ||
          aiScores[a.id].status === 'failed'
      )
      .map((a) => a.id);

    if (unscoredIds.length === 0) {
      showToast('Tất cả hồ sơ ứng viên đã có điểm đánh giá.');
      return;
    }
    scoreBatch(unscoredIds);
  };

  // ── Mở CV PDF ở tab mới ──
  const openCandidateCv = async (app) => {
    if (!app?.cvId) {
      showToast('Không tìm thấy mã CV của ứng viên.');
      return;
    }

    const newTab = window.open('about:blank', '_blank');

    if (!newTab) {
      showToast('Trình duyệt đã chặn tab mới. Vui lòng cho phép popup.');
      return;
    }

    newTab.opener = null;
    newTab.document.title = 'Đang tải CV...';
    newTab.document.body.innerHTML =
      '<p style="font-family:Arial,sans-serif;padding:24px">Đang tải CV PDF...</p>';

    try {
      const response = await apiClient.get(
        `/cvs/${app.cvId}/pdf/download`
      );

      const result = response?.data?.data
        ?? response?.data
        ?? response;

      const pdfUrl = result?.downloadUrl;

      if (!pdfUrl) {
        throw new Error('Backend không trả về đường dẫn PDF.');
      }

      newTab.location.replace(pdfUrl);
    } catch (err) {
      console.error('Lỗi mở CV PDF:', err);
      newTab.close();
      showToast(
        err?.response?.data?.message ||
        err?.message ||
        'Không thể mở CV PDF. Vui lòng thử lại.'
      );
    }
  };

  // ── Helper định dạng mức lương ──
  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thỏa thuận';
    const fmt = (num) =>
      num >= 1000000
        ? `${(num / 1000000).toLocaleString('vi-VN')} triệu`
        : `${Number(num).toLocaleString('vi-VN')} đ`;

    if (min && max) return `${fmt(min)} - ${fmt(max)} VNĐ`;
    if (min) return `Từ ${fmt(min)} VNĐ`;
    if (max) return `Lên đến ${fmt(max)} VNĐ`;
    return 'Thỏa thuận';
  };

  // ── Helper định dạng ngày tháng ──
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ── Tính số ngày còn lại đến hạn nộp ──
  const getDaysLeft = (deadlineStr) => {
    if (!deadlineStr) return null;
    const now = new Date();
    const deadline = new Date(deadlineStr);
    const diffTime = deadline - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // ── Helper nhãn hình thức làm việc ──
  const getWorkingModeLabel = (mode) => {
    if (!mode) return 'Toàn thời gian';
    if (WORK_MODES[mode]) return WORK_MODES[mode];
    switch (mode) {
      case 'onsite':
        return 'Làm việc tại văn phòng (Onsite)';
      case 'remote':
        return 'Làm việc từ xa (Remote)';
      case 'hybrid':
        return 'Linh hoạt kết hợp (Hybrid)';
      default:
        return mode;
    }
  };



  // ── RENDER: Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf8ff] gap-3">
        <div className="w-10 h-10 border-4 border-[#005c55] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-[#005c55]">
          Đang tải thông tin chi tiết bài viết tuyển dụng...
        </p>
      </div>
    );
  }

  // ── RENDER: Error ──
  if (error || !job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#faf8ff] px-4">
        <span className="material-symbols-outlined text-5xl text-[#6e7977]">
          work_off
        </span>
        <h2 className="text-xl font-bold text-[#131b2e]">
          Không thể hiển thị tin tuyển dụng
        </h2>
        <p className="text-sm text-[#6e7977] text-center max-w-md">
          {error || 'Tin tuyển dụng không tồn tại hoặc bạn không có quyền xem thông tin này.'}
        </p>
        <Link
          to="/recruiter/jobs"
          className="px-6 py-2.5 bg-[#005c55] hover:bg-[#007952] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Quay lại danh sách tin tuyển dụng</span>
        </Link>
      </div>
    );
  }

  const daysLeft = getDaysLeft(job.applicationDeadline);
  const displayLocation =
    job.location ||
    (jobAddresses.length > 0
      ? [...new Set(jobAddresses.map((a) => a.provinceName).filter(Boolean))].join(', ') ||
        jobAddresses[0]?.addressDetail
      : 'Toàn quốc');

  return (
    <div className="w-full bg-[#faf8ff] min-h-screen pb-20 font-['Plus_Jakarta_Sans',sans-serif] text-[#131b2e] antialiased">
      {/* ── Toast Alert ── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#131b2e] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#3e4947]">
          <span className="material-symbols-outlined text-[#97f5cc] text-[22px]">check_circle</span>
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* ── Top Breadcrumb & Status Ribbon (theo chuẩn JobDetailPage bên candidate) ── */}
      <section className="w-full bg-[#f2f3ff] py-3.5 border-b border-[#eaedff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-[#3e4947]">
          <nav className="flex items-center gap-2 flex-wrap">
            <Link to="/recruiter" className="hover:text-[#005c55] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Bảng điều khiển</span>
            </Link>
            <span className="material-symbols-outlined text-[14px] text-[#bdc9c6]">chevron_right</span>
            <Link to="/recruiter/jobs" className="hover:text-[#005c55] transition-colors">
              Quản lý tin tuyển dụng
            </Link>
            {job.categoryName && (
              <>
                <span className="material-symbols-outlined text-[14px] text-[#bdc9c6]">chevron_right</span>
                <span className="text-[#3e4947]">{job.categoryName}</span>
              </>
            )}
            <span className="material-symbols-outlined text-[14px] text-[#bdc9c6]">chevron_right</span>
            <span className="text-[#131b2e] font-semibold truncate max-w-xs md:max-w-md">
              {job.title}
            </span>
          </nav>

          <div className="flex items-center gap-2.5 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold ${
                job.status === 'open'
                  ? 'bg-[#97f5cc] text-[#00513a]'
                  : job.status === 'draft'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  job.status === 'open' ? 'bg-[#006c4e] animate-pulse' : 'bg-slate-500'
                }`}
              ></span>
              {job.status === 'open' || !job.status
                ? 'Đang nhận hồ sơ'
                : (JOB_STATUSES[job.status] || job.status)}
            </span>
            <span className="text-[#6e7977] font-medium">Mã tin: KJ-{job.id}</span>
          </div>
        </div>
      </section>

      {/* ── Main Content Grid (12 Columns) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 gap-8 items-start">
          
          {/* CỘT TRÁI (8 COLS) - CHI TIẾT BÀI ĐĂNG & QUẢN LÝ ỨNG VIÊN */}
          <article className="lg:col-span-8 flex flex-col gap-6">
            
            {/* 1. Job Header Master Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#005c55]/5 blur-2xl pointer-events-none"></div>

              {/* Badges Row */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {promotedInfo && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm">
                      <span className="material-symbols-outlined text-[15px]">bolt</span>
                      {promotedInfo.plan?.name || 'Tin Nổi Bật VIP'}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#9cf2e8] text-[#00201d] text-xs font-bold">
                    <span className="material-symbols-outlined text-[15px]">verified</span>
                    {job.status === 'open' ? 'Đang mở tuyển' : 'Tạm dừng'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eaedff] text-[#3e4947] text-xs font-medium">
                    <span className="material-symbols-outlined text-[15px]">hub</span>
                    {getWorkingModeLabel(job.workingMode)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eaedff] text-[#3e4947] text-xs font-medium">
                    <span className="material-symbols-outlined text-[15px]">person_check</span>
                    Tuyển {String(job.vacancies || 1).padStart(2, '0')} ứng viên
                  </span>
                </div>

                {/* Job Title */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight leading-tight">
                  {job.title}
                </h1>

                {/* Company Name & Meta Info */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#3e4947] flex-wrap">
                  <span className="text-[#131b2e] font-bold">
                    {job.companyName || 'Doanh nghiệp tuyển dụng'}
                  </span>
                  <span className="text-[#bdc9c6]">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#005c55]">location_on</span>
                    <span>{displayLocation}</span>
                  </span>
                  <span className="text-[#bdc9c6]">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#6e7977]">schedule</span>
                    <span>Hạn nộp: <strong className="text-[#131b2e] font-semibold">{formatDate(job.applicationDeadline)}</strong></span>
                    {daysLeft !== null && (
                      <span className={`ml-1 font-bold ${daysLeft > 0 ? 'text-[#005c55]' : 'text-[#ba1a1a]'}`}>
                        ({daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Đã hết hạn'})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Key Metrics Highlight Strip (4 Hộp chỉ số trọng tâm giống candidate JobDetailPage) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff]">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider">
                    Mức thu nhập
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-[#005c55] mt-0.5 line-clamp-1" title={formatSalary(job.salaryMin, job.salaryMax)}>
                    {formatSalary(job.salaryMin, job.salaryMax)}
                  </span>
                  <span className="text-[11px] text-[#6e7977] mt-0.5">
                    Thỏa thuận / Theo năng lực
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider">
                    Học vấn yêu cầu
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
                    {job.educationalRequirement || 'Không yêu cầu'}
                  </span>
                  <span className="text-[11px] text-[#6e7977] mt-0.5">
                    Trình độ đào tạo
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider">
                    Hình thức
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
                    {getWorkingModeLabel(job.workingMode)}
                  </span>
                  <span className="text-[11px] text-[#6e7977] mt-0.5">
                    Thời gian làm việc
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider">
                    Số lượng tuyển
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
                    {String(job.vacancies || 1).padStart(2, '0')} Nhân sự
                  </span>
                  <span className="text-[11px] text-[#006c4e] font-semibold mt-0.5">
                    Chỉ tiêu tuyển dụng
                  </span>
                </div>
              </div>

              {/* Recruiter Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#f2f3ff]">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openEditModal('general')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    <span>Chỉnh sửa bài đăng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPromoteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    <span>Đẩy Top Tin Này</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleJobStatus}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      job.status === 'open'
                        ? 'bg-white hover:bg-red-50 text-red-600 border-red-200'
                        : 'bg-[#97f5cc] text-[#00513a] border-[#7bd8b1] hover:bg-[#7bd8b1]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {job.status === 'open' ? 'pause_circle' : 'play_circle'}
                    </span>
                    <span>{job.status === 'open' ? 'Tạm dừng nhận CV' : 'Kích hoạt lại'}</span>
                  </button>
                </div>

                <Link
                  to={`/jobs/${job.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-xs font-bold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>Xem trên KiemJob (Ứng viên)</span>
                </Link>
              </div>
            </div>

            {/* 2. Section: Mô tả công việc (Job Description) */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-7 rounded-full bg-[#005c55]"></span>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#131b2e]">
                    Mô tả công việc
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => openEditModal('details')}
                  className="text-xs font-bold text-[#005c55] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Chỉnh sửa nội dung</span>
                </button>
              </div>

              <div className="flex flex-col gap-4 text-sm text-[#3e4947] leading-relaxed">
                {/* Mục tiêu vị trí */}
                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex flex-col gap-2">
                  <span className="text-sm font-bold text-[#005c55] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">target</span>
                    Mục tiêu vị trí (Position Purpose):
                  </span>
                  <p className="text-xs sm:text-sm text-[#3e4947]">
                    Đảm nhiệm vai trò then chốt trong việc kiến tạo, vận hành và tối ưu hóa các giải pháp chuyên môn tại {job.companyName || 'doanh nghiệp'}. Phối hợp chặt chẽ cùng các phòng ban liên quan để hoàn thiện các mục tiêu chiến lược và nâng cao chất lượng hoạt động.
                  </p>
                </div>

                {/* Danh sách nhiệm vụ chi tiết từ API jobDetails */}
                {jobDetails.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    {jobDetails.map((detail, idx) => (
                      <div key={detail.id || idx} className="space-y-1.5">
                        <h3 className="font-bold text-sm text-[#131b2e] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#005c55]"></span>
                          {detail.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#3e4947] whitespace-pre-line pl-3.5 border-l-2 border-[#eaedff]">
                          {detail.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-[#faf8ff] rounded-xl border border-dashed border-[#eaedff] text-center">
                    <p className="text-xs sm:text-sm text-[#6e7977] mb-3">
                      Chưa có nội dung mô tả chi tiết được thiết lập cho tin tuyển dụng này.
                    </p>
                    <button
                      type="button"
                      onClick={() => openEditModal('details')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#005c55] text-white text-xs font-bold rounded-xl hover:bg-[#007952] transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>Thêm nội dung mô tả</span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* 3. Section: Yêu cầu ứng viên (Requirements) */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-7 rounded-full bg-[#005c55]"></span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#131b2e]">
                  Yêu cầu ứng viên
                </h2>
              </div>

              {/* Kỹ năng bắt buộc */}
              <div className="flex flex-col gap-3">
                <span className="text-xs sm:text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#005c55] text-[18px]">verified</span>
                  Kỹ năng chuyên môn yêu cầu:
                </span>

                {jobSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {jobSkills.map((skill, idx) => (
                      <span
                        key={skill.id || idx}
                        className="px-3 py-1.5 rounded-lg bg-[#9cf2e8]/50 text-[#00201d] font-semibold text-xs border border-[#9cf2e8]"
                      >
                        {skill.skillName ?? skill.skill_name ?? 'Kỹ năng'}
                        {skill.description ? ` (${skill.description})` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6e7977]">
                    Chưa có thẻ kỹ năng chuyên biệt nào được gán cho tin này.
                  </p>
                )}

                {/* Tiêu chí chi tiết */}
                <ul className="flex flex-col gap-2.5 pt-3 text-xs sm:text-sm text-[#3e4947]">
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#005c55] text-[16px] shrink-0 mt-0.5">fiber_manual_record</span>
                    <span>
                      Học vấn yêu cầu: <strong>{job.educationalRequirement || 'Không yêu cầu cụ thể'}</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#005c55] text-[16px] shrink-0 mt-0.5">fiber_manual_record</span>
                    <span>
                      Hình thức làm việc: <strong>{getWorkingModeLabel(job.workingMode)}</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#005c55] text-[16px] shrink-0 mt-0.5">fiber_manual_record</span>
                    <span>
                      Chỉ tiêu tuyển dụng: <strong>{job.vacancies || 1} nhân sự</strong>.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 4. Section: Địa điểm & Khu vực làm việc */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-7 rounded-full bg-[#005c55]"></span>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#131b2e]">
                    Địa điểm làm việc
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => openEditModal('addresses')}
                  className="text-xs font-bold text-[#005c55] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit_location_alt</span>
                  <span>Chỉnh sửa địa chỉ</span>
                </button>
              </div>

              {jobAddresses.length === 0 ? (
                <div className="p-4 bg-[#f8f9fe] rounded-xl border border-dashed border-[#eaedff] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-[#6e7977]">
                    <span className="material-symbols-outlined text-[#bdc9c6] text-xl">
                      location_off
                    </span>
                    <span>Chưa thiết lập địa chỉ làm việc cụ thể cho tin tuyển dụng này.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal('addresses')}
                    className="px-3 py-1.5 bg-[#005c55] text-white text-xs font-bold rounded-lg hover:bg-[#007952] transition-colors shrink-0"
                  >
                    + Thêm địa chỉ
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {jobAddresses.map((addr, idx) => (
                    <div
                      key={addr.id ?? idx}
                      className="p-3.5 bg-[#f8f9fe] rounded-xl border border-[#eaedff] flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#005c55]/10 text-[#005c55] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-base">location_on</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#131b2e]">
                          {addr.provinceName || 'Tỉnh / Thành phố'}
                        </p>
                        <p className="text-[11px] text-[#55605e] mt-0.5 line-clamp-2">
                          {addr.addressDetail || 'Chưa có địa chỉ chi tiết'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 5. Section: Quản lý hồ sơ ứng viên ứng tuyển & Chấm điểm AI */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#eaedff] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-6 rounded-full bg-[#005c55]"></span>
                    <h2 className="text-lg sm:text-xl font-bold text-[#131b2e]">
                      Quản lý hồ sơ ứng viên
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#005c55] text-white text-xs font-bold">
                      {applications.length} hồ sơ
                    </span>
                  </div>
                  <p className="text-xs text-[#6e7977] mt-1 pl-5">
                    Hồ sơ nộp trực tuyến, sắp xếp ưu tiên theo điểm AI so với yêu cầu bài đăng.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleBulkScoreAll}
                    disabled={batchProgress.isRunning}
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                    title="Chấm điểm lần lượt các hồ sơ chưa chấm (tối đa 2 request song song)"
                  >
                    <span
                      className={`material-symbols-outlined text-[17px] ${
                        batchProgress.isRunning ? 'animate-spin' : ''
                      }`}
                    >
                      {batchProgress.isRunning ? 'sync' : 'auto_awesome'}
                    </span>
                    <span>
                      {batchProgress.isRunning
                        ? `Đang chấm điểm ${batchProgress.completed}/${batchProgress.total} CV...`
                        : 'Chấm điểm tất cả CV chưa chấm'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Bảng ứng viên dùng chung */}
              <ApplicantTable
                applications={applications}
                onChangeStatus={updateCandidateStatus}
                onBulkChange={handleBulkChangeStatus}
                onOpenCv={openCandidateCvModal}
                onRescore={scoreOne}
                aiScores={aiScores}
                showJobColumn={false}
                loading={false}
              />
            </section>
          </article>
        </div>
      </div>

      {/* ── Modal Chỉnh Sửa Tin Tuyển Dụng ── */}
      <EditJobModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        job={job}
        categories={categories}
        jobDetails={jobDetails}
        initialTab={editModalTab}
        onSaved={loadJobData}
      />

      {/* ── Modal Đẩy Top & Nổi Bật Tin Tuyển Dụng ── */}
      <PromoteJobModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        job={job}
        packages={packages}
        onPromoteSuccess={(data) => {
          setPromotedInfo(data);
          showToast(`Đã đẩy top thành công với gói "${data.plan?.name}"!`);
        }}
      />

      {/* ── Modal Xem Chi Tiết CV ── */}
      {selectedCandidateForCv && (
        <CvDetailModal
          isOpen={isCvModalOpen}
          onClose={() => {
            setIsCvModalOpen(false);
            setSelectedCandidateForCv(null);
          }}
          candidate={selectedCandidateForCv}
          jobTitle={job?.title}
          aiScoreData={selectedCandidateForCv ? aiScores[selectedCandidateForCv.id]?.data : null}
          onUpdateStatus={(appId, newStatus) => {
            setApplications((prev) =>
              prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
            );
          }}
        />
      )}
    </div>
  );
}
