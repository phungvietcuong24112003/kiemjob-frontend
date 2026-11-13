import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { jobPostApi } from '../../../infrastructure/api/jobPostApi';
import { applicationApi } from '../../../infrastructure/api/appicationApi';
import { useRecruiterChat } from '../../../application/context/RecruiterChatContext';
import useAiScores from '../../../application/hooks/useAiScores';
import ApplicantTable from '../../components/recruiter/ApplicantTable';
import CvDetailModal from '../../components/recruiter/CvDetailModal';

export default function CandidateManagementPage() {
  const [jobPosts, setJobPosts] = useState([]);
  const [filterJob, setFilterJob] = useState('all');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Modal CV
  const [modalCandidate, setModalCandidate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hook chấm điểm AI trong phiên
  const { scores: aiScores, scoreOne } = useAiScores();

  const { openChatWithCandidate } = useRecruiterChat() || {};

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Tải danh sách bài đăng của Recruiter
  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      try {
        const res = await jobPostApi.getJobPosts({ size: 100 });
        const list = Array.isArray(res) ? res : res?.content || [];
        if (isMounted) {
          setJobPosts(list);
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách bài đăng:', err);
      }
    };
    fetchJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tải danh sách đơn ứng tuyển tổng hợp từ API GET /api/recruiter/applications
  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { size: 200 };
      if (filterJob !== 'all') {
        params.jobId = Number(filterJob);
      }
      const res = await applicationApi.getRecruiterApplications(params);
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : data?.content || [];
      setApplications(list);
    } catch (err) {
      console.error('Lỗi khi tải danh sách hồ sơ ứng viên:', err);
      setError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách ứng viên');
    } finally {
      setLoading(false);
    }
  }, [filterJob]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // 3. Đổi trạng thái đơn lẻ
  const handleChangeStatus = async (appId, newStatus) => {
    try {
      await applicationApi.updateApplicationStatus(appId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      showToast('Đã cập nhật trạng thái ứng viên thành công!');
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái:', err);
      showToast(err?.response?.data?.message || 'Không thể cập nhật trạng thái ứng viên');
    }
  };

  // 4. Đổi trạng thái hàng loạt
  const handleBulkChangeStatus = async (appIds, newStatus) => {
    try {
      const res = await applicationApi.bulkUpdateApplicationStatus(appIds, newStatus);
      const updatedCount = res?.data?.updatedCount ?? appIds.length;
      setApplications((prev) =>
        prev.map((a) => (appIds.includes(a.id) ? { ...a, status: newStatus } : a))
      );
      showToast(`Đã cập nhật trạng thái cho ${updatedCount} hồ sơ.`);
    } catch (err) {
      console.error('Lỗi đổi trạng thái hàng loạt:', err);
      showToast(err?.response?.data?.message || 'Không thể cập nhật trạng thái hàng loạt');
    }
  };

  // 5. Chấm lại điểm AI
  const handleRescore = async (appId) => {
    try {
      showToast('Đang gửi yêu cầu chấm điểm lại bằng AI...');
      const res = await applicationApi.rescoreApplication(appId);
      const updated = res?.data ?? res;
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, ...updated } : a))
      );
      showToast('Đã hoàn tất chấm điểm AI cho hồ sơ.');
    } catch (err) {
      console.error('Lỗi khi chấm lại AI:', err);
      showToast(err?.response?.data?.message || 'Không thể chấm điểm AI. Vui lòng thử lại sau.');
    }
  };

  // 6. Mở xem chi tiết CV (Tự động chuyển pending -> viewed ở backend)
const handleOpenCv = async (app) => {
  setModalCandidate(app);
  setIsModalOpen(true);

  try {
    const res = await applicationApi.getApplicationById(app.id);
    const updated = res?.data ?? res;

    if (updated) {
      // Cập nhật toàn bộ dữ liệu chi tiết cho modal
      setModalCandidate((prev) => ({
        ...prev,
        ...updated,
      }));

      // Đồng bộ trạng thái trong danh sách
      if (updated.status) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === app.id
              ? { ...a, status: updated.status }
              : a
          )
        );
      }
    }
} catch (err) {
    console.error('Lỗi lấy chi tiết đơn ứng tuyển:', err);
  }
};

  // 7. Thống kê nhanh
  const stats = useMemo(() => {
    const pendingCount = applications.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
    const shortlistedCount = applications.filter((a) => (a.status || '').toLowerCase() === 'shortlisted').length;
    const interviewCount = applications.filter((a) => (a.status || '').toLowerCase() === 'interview').length;
    const acceptedCount = applications.filter((a) => (a.status || '').toLowerCase() === 'accepted').length;

    return {
      pending: pendingCount,
      shortlisted: shortlistedCount,
      interview: interviewCount,
      accepted: acceptedCount,
    };
  }, [applications]);

  return (
    <div className="w-full space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-slate-700 text-xs sm:text-sm font-semibold animate-fade-in">
          <span className="material-symbols-outlined text-[#97f5cc] text-[20px]">
            check_circle
          </span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Trang Tổng Hợp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản lý ứng viên
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Trung tâm quản lý, sàng lọc và chấm điểm hồ sơ ứng tuyển bằng AI cho tất cả tin tuyển dụng.
          </p>
        </div>
      </div>

      {/* Dashboard Thống Kê Nhanh (CV Mới & Lịch Phỏng Vấn) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* CV mới cần xử lý */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">hourglass_empty</span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              CV mới cần xử lý
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {stats.pending}
            </p>
          </div>
        </div>

        {/* Qua vòng CV */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">fact_check</span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              Qua vòng sơ tuyển
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {stats.shortlisted}
            </p>
          </div>
        </div>

        {/* Lịch phỏng vấn sắp tới */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-white border border-teal-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">calendar_month</span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
              Lịch phỏng vấn
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {stats.interview}
            </p>
          </div>
        </div>

        {/* Trúng tuyển */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Trúng tuyển
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {stats.accepted}
            </p>
          </div>
        </div>
      </div>

      {/* Thông Báo Lỗi nếu có */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-rose-500">error</span>
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={loadApplications}
            className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-xs"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Bảng ứng viên dùng chung */}
      <ApplicantTable
        applications={applications}
        onChangeStatus={handleChangeStatus}
        onBulkChange={handleBulkChangeStatus}
        onOpenCv={handleOpenCv}
        onRescore={scoreOne}
        aiScores={aiScores}
        showJobColumn={true}
        loading={loading}
      />

      {/* Modal Xem CV Chi Tiết */}
      {modalCandidate && (
        <CvDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalCandidate(null);
          }}
          candidate={modalCandidate}
          jobTitle={modalCandidate?.jobTitle || modalCandidate?.title}
          aiScoreData={modalCandidate ? aiScores[modalCandidate.id]?.data : null}
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
