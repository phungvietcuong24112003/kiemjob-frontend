import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRecruiterProfile, getJobPosts } from '../../../infrastructure/api';

export default function RecruiterOverviewPage() {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverviewData = async () => {
      setLoading(true);
      try {
        const profileRes = await getRecruiterProfile();
        const recProfile = profileRes?.data ?? profileRes;
        if (recProfile) {
          setProfile(recProfile);
        }

        const companyId = recProfile?.companyId;
        if (companyId) {
          const jobsRes = await getJobPosts({ companyId, size: 100 });
          const jobPosts = Array.isArray(jobsRes)
            ? jobsRes
            : Array.isArray(jobsRes?.content)
            ? jobsRes.content
            : Array.isArray(jobsRes?.data?.content)
            ? jobsRes.data.content
            : Array.isArray(jobsRes?.data)
            ? jobsRes.data
            : Array.isArray(jobsRes?.data?.data)
            ? jobsRes.data.data
            : [];
          setJobs(jobPosts);
        }
      } catch (err) {
        console.warn('Lỗi lấy thông tin tổng quan:', err);
        try {
          const stored = localStorage.getItem('kiemjob_user');
          if (stored) setProfile(JSON.parse(stored));
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  const companyName = profile?.companyName || profile?.company_name || 'Doanh nghiệp';

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thỏa thuận';
    const fmt = (num) =>
      num >= 1000000
        ? `${(num / 1000000).toLocaleString('vi-VN')} tr`
        : `${Number(num).toLocaleString('vi-VN')} đ`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `Từ ${fmt(min)}`;
    if (max) return `Đến ${fmt(max)}`;
    return 'Thỏa thuận';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  // Tính toán số liệu thực tế từ danh sách tin
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => {
    const s = String(j.status || '').toLowerCase();
    return s === 'open' || s === 'active' || s === 'approved';
  }).length;
  const pendingJobs = jobs.filter((j) => {
    const s = String(j.status || '').toLowerCase();
    return s === 'pending' || s === 'draft';
  }).length;
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicants || j.applicantsCount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tổng quan tuyển dụng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bảng theo dõi hoạt động tuyển dụng của <strong>{companyName}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/recruiter/post-job"
            className="px-3.5 py-2 bg-[#005c55] hover:bg-[#007952] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Đăng tin tuyển dụng</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI Compact Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tin đang mở tuyển</span>
            <span className="material-symbols-outlined text-[18px] text-[#005c55]">work</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{activeJobs}</span>
            <span className="text-xs text-slate-400 ml-1">/ {totalJobs} tin</span>
          </div>
          <Link to="/recruiter/jobs" className="text-[11px] text-[#005c55] font-semibold mt-2 hover:underline inline-flex items-center gap-0.5">
            <span>Xem danh sách</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          </Link>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tổng ứng viên tiếp nhận</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">group</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{totalApplicants}</span>
            <span className="text-xs text-slate-400 ml-1">hồ sơ nộp</span>
          </div>
          <Link to="/recruiter/candidates" className="text-[11px] text-[#005c55] font-semibold mt-2 hover:underline inline-flex items-center gap-0.5">
            <span>Duyệt ứng viên ATS</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          </Link>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tin chờ duyệt / Nháp</span>
            <span className="material-symbols-outlined text-[18px] text-amber-600">hourglass_empty</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{pendingJobs}</span>
            <span className="text-xs text-slate-400 ml-1">tin tuyển dụng</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-2">
            {pendingJobs > 0 ? 'Đang được hệ thống duyệt' : 'Không có tin chờ duyệt'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Gói nổi bật & Đơn hàng</span>
            <span className="material-symbols-outlined text-[18px] text-indigo-600">receipt_long</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">VIP</span>
            <span className="text-xs text-slate-400 ml-1">Đẩy Top</span>
          </div>
          <Link to="/recruiter/orders" className="text-[11px] text-[#005c55] font-semibold mt-2 hover:underline inline-flex items-center gap-0.5">
            <span>Lịch sử đơn hàng</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          </Link>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/recruiter/post-job"
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#005c55] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">add_box</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 group-hover:text-[#005c55]">Đăng tin mới</div>
            <div className="text-[10px] text-slate-400 truncate">Tiếp cận ứng viên ngay</div>
          </div>
        </Link>

        <Link
          to="/recruiter/jobs"
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">list_alt</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 group-hover:text-[#005c55]">Quản lý bài đăng</div>
            <div className="text-[10px] text-slate-400 truncate">{totalJobs} tin đã tạo</div>
          </div>
        </Link>

        <Link
          to="/recruiter/candidates"
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">view_kanban</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 group-hover:text-[#005c55]">Hệ thống ATS</div>
            <div className="text-[10px] text-slate-400 truncate">Quy trình tuyển dụng</div>
          </div>
        </Link>

        <Link
          to="/recruiter/company"
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">domain</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 group-hover:text-[#005c55]">Hồ sơ công ty</div>
            <div className="text-[10px] text-slate-400 truncate">Cập nhật thông tin</div>
          </div>
        </Link>
      </div>

      {/* Posted Jobs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Danh sách tin tuyển dụng gần đây</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
              {jobs.length} tin
            </span>
          </div>
          <Link to="/recruiter/jobs" className="text-xs font-semibold text-[#005c55] hover:underline flex items-center gap-0.5">
            <span>Xem tất cả tin</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Đang tải dữ liệu tin tuyển dụng...
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-[20px]">post_add</span>
            </div>
            <p className="text-xs font-bold text-slate-800">Chưa có bài tuyển dụng nào được tạo</p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
              Đăng tin tuyển dụng đầu tiên để tiếp cận ứng viên tiềm năng trên hệ thống KiemJob.
            </p>
            <Link
              to="/recruiter/post-job"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#005c55] text-white text-xs font-semibold rounded-lg hover:bg-[#007952] transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Đăng tin ngay</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2.5 px-4">Vị trí chức danh</th>
                  <th className="py-2.5 px-4">Ngành nghề</th>
                  <th className="py-2.5 px-4">Mức thu nhập</th>
                  <th className="py-2.5 px-4">Hạn nộp</th>
                  <th className="py-2.5 px-4 text-center">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.slice(0, 6).map((job) => {
                  const rawStatus = String(job.status || '').toLowerCase();
                  const isOpen = rawStatus === 'open' || rawStatus === 'active' || rawStatus === 'approved';
                  const isDraft = rawStatus === 'draft';
                  return (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4">
                        <Link
                          to={`/recruiter/jobs/${job.id}`}
                          className="font-bold text-slate-900 hover:text-[#005c55] transition-colors line-clamp-1"
                        >
                          {job.title}
                        </Link>
                        <span className="text-[10px] text-slate-400">Mã: KJ-{job.id}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {job.categoryName || 'Chưa cập nhật'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {formatSalary(job.salaryMin, job.salaryMax)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {formatDate(job.applicationDeadline)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOpen
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isDraft
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isOpen ? 'Đang tuyển' : isDraft ? 'Bản nháp' : 'Đã đóng'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          to={`/recruiter/jobs/${job.id}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#005c55] font-semibold rounded text-[11px] transition-colors inline-block"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
