import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, companyApi } from '../../../infrastructure/api';
import { ROLES } from '../../../domain/constants/roles';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [recentAccounts, setRecentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, companiesData, jobsData, accountsData] = await Promise.allSettled([
        adminApi.getAdminStats(),
        companyApi.getAdminCompanies({ status: 'pending', size: 5 }),
        adminApi.getJobPosts({ status: 'draft', size: 20 }),
        adminApi.getAdminAccounts()
      ]);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      }
      if (companiesData.status === 'fulfilled') {
        const cList = companiesData.value?.content || companiesData.value || [];
        setPendingCompanies(Array.isArray(cList) ? cList : []);
      }
      if (jobsData.status === 'fulfilled') {
        const jList = Array.isArray(jobsData.value)
          ? jobsData.value
          : Array.isArray(jobsData.value?.content)
            ? jobsData.value.content
            : [];
        setPendingJobs(jList);
      }
      if (accountsData.status === 'fulfilled') {
        setRecentAccounts(Array.isArray(accountsData.value) ? accountsData.value.slice(0, 5) : []);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-[#131b2e] tracking-tight">Tổng Quan Quản Trị Hệ Thống</h1>
        </div>

        <button
          onClick={fetchDashboardData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#eaedff] border border-[#eaedff] text-[#005c55] rounded-lg text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Cập nhật số liệu</span>
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Companies */}
        <div className="bg-white p-4 rounded-xl border border-[#eaedff] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#6e7977] mb-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-wider">Tổng Doanh Nghiệp</span>
              <span className="material-symbols-outlined text-[18px] text-[#005c55]">corporate_fare</span>
            </div>
            <span className="text-[20px] font-bold text-[#131b2e]">
              {loading ? '...' : (stats?.totalCompanies ?? 0)}
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-[#f2f3ff] flex items-center justify-between text-[12px]">
            <span className="text-[#006c4e] font-semibold">
              {stats?.approvedCompanies ?? 0} đã duyệt
            </span>
            <Link to="/admin/companies" className="text-[#005c55] hover:underline font-bold">
              Quản lý →
            </Link>
          </div>
        </div>

        {/* Pending Companies */}
        <div className="bg-white p-4 rounded-xl border border-[#eaedff] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#6e7977] mb-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-wider">Công Ty Chờ Duyệt</span>
              <span className="material-symbols-outlined text-[18px] text-amber-600">domain_verification</span>
            </div>
            <span className="text-[20px] font-bold text-[#ba1a1a]">
              {loading ? '...' : (stats?.pendingCompanies ?? 0)}
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-[#f2f3ff] flex items-center justify-between text-[12px]">
            <span className="text-[#ba1a1a] font-semibold">
              {stats?.pendingCompanies ? 'Cần duyệt ngay' : 'Không có tồn đọng'}
            </span>
            <Link to="/admin/companies" className="text-[#ba1a1a] hover:underline font-bold">
              Xem hồ sơ →
            </Link>
          </div>
        </div>

        {/* Pending Jobs */}
        <div className="bg-white p-4 rounded-xl border border-[#eaedff] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#6e7977] mb-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-wider">Tin Chờ Duyệt</span>
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">pending_actions</span>
            </div>
            <span className="text-[20px] font-bold text-[#ba1a1a]">
              {loading ? '...' : (stats?.pendingJobPosts ?? pendingJobs.length ?? 0)}
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-[#f2f3ff] flex items-center justify-between text-[12px]">
            <span className="text-[#3e4947] font-medium">
              Tổng {stats?.totalJobPosts ?? 0} tin tuyển
            </span>
            <Link to="/admin/posts" className="text-[#005c55] hover:underline font-bold">
              Kiểm duyệt →
            </Link>
          </div>
        </div>

        {/* Total Accounts */}
        <div className="bg-white p-4 rounded-xl border border-[#eaedff] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#6e7977] mb-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-wider">Tài Khoản Hệ Thống</span>
              <span className="material-symbols-outlined text-[18px] text-[#006c4e]">group</span>
            </div>
            <span className="text-[20px] font-bold text-[#131b2e]">
              {loading ? '...' : (stats?.totalAccounts ?? 0)}
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-[#f2f3ff] flex items-center justify-between text-[12px]">
            <span className="text-[#006c4e] font-semibold truncate">
              {stats?.totalCandidates ?? 0} UV • {stats?.totalRecruiters ?? 0} NTD
            </span>
            <Link to="/admin/accounts" className="text-[#005c55] hover:underline font-bold shrink-0 ml-1">
              Danh sách →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Grid: Pending Companies & Pending Jobs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Companies list */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#eaedff] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-[16px] font-semibold text-[#131b2e] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005c55] text-[18px]">verified_user</span>
              Doanh nghiệp chờ duyệt ({pendingCompanies.length})
            </h2>
            <Link to="/admin/companies" className="text-[12px] font-bold text-[#005c55] hover:underline">
              Tất cả →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-[13px] text-[#6e7977]">Đang tải...</div>
          ) : pendingCompanies.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#6e7977]">
              <span className="material-symbols-outlined text-[28px] text-[#6e7977]/30 mb-1">done_all</span>
              <p>Hiện không có doanh nghiệp nào chờ duyệt!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingCompanies.map((c) => (
                <div key={c.id} className="p-3 bg-[#f2f3ff] rounded-xl flex items-center justify-between text-[13px] hover:bg-[#eaedff]/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#eaedff] flex items-center justify-center font-bold text-[12px] text-[#005c55] overflow-hidden shrink-0">
                      {c.logoUrl ? (
                        <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        c.name?.charAt(0) || 'C'
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-[#131b2e] truncate">{c.name}</p>
                      <p className="text-[11px] text-[#6e7977] truncate">
                        {c.taxCode ? `MST: ${c.taxCode}` : 'Chưa có MST'} • {c.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="px-2 py-0.5 bg-[#ffdad6] text-[#ba1a1a] font-bold rounded text-[10px]">
                      Chờ duyệt
                    </span>
                    <Link
                      to="/admin/companies"
                      className="px-2.5 py-1 bg-[#005c55] hover:bg-[#007952] text-white font-bold rounded-lg text-[11px] transition-colors"
                    >
                      Kiểm duyệt
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Jobs list */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#eaedff] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-[16px] font-semibold text-[#131b2e] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005c55] text-[18px]">work</span>
              Tin tuyển dụng chờ duyệt ({pendingJobs.length})
            </h2>
            <Link to="/admin/posts" className="text-[12px] font-bold text-[#005c55] hover:underline">
              Tất cả →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-[13px] text-[#6e7977]">Đang tải...</div>
          ) : pendingJobs.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#6e7977]">
              <span className="material-symbols-outlined text-[28px] text-[#6e7977]/30 mb-1">done_all</span>
              <p>Hiện không có tin tuyển dụng nào chờ duyệt!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingJobs.map((pjob) => (
                <div key={pjob.id} className="p-3 bg-[#f2f3ff] rounded-xl flex items-center justify-between text-[13px] hover:bg-[#eaedff]/60 transition-colors">
                  <div className="truncate min-w-0 mr-2">
                    <p className="font-semibold text-[#131b2e] truncate">{pjob.title}</p>
                    <p className="text-[11px] text-[#6e7977] truncate">
                      {pjob.companyName || 'Công ty ẩn'} • {pjob.categoryName || 'Chung'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 bg-[#ffe082]/70 text-[#795548] font-bold rounded text-[10px]">
                      {pjob.status === 'draft' ? 'Chờ duyệt' : pjob.status}
                    </span>
                    <Link
                      to="/admin/posts"
                      className="px-2.5 py-1 bg-[#005c55] hover:bg-[#007952] text-white font-bold rounded-lg text-[11px] transition-colors"
                    >
                      Duyệt tin
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Accounts list ── */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#eaedff] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <h2 className="text-[16px] font-semibold text-[#131b2e] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#005c55] text-[18px]">manage_accounts</span>
            Tài khoản mới nhất ({recentAccounts.length})
          </h2>
          <Link to="/admin/accounts" className="text-[12px] font-bold text-[#005c55] hover:underline">
            Tất cả tài khoản →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[13px] text-[#6e7977]">Đang tải...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentAccounts.map((acc) => (
              <div key={acc.id} className="p-3 bg-[#f2f3ff] rounded-xl flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-full bg-[#005c55]/10 text-[#005c55] shrink-0 flex items-center justify-center font-bold text-[11px] uppercase">
                    {(acc.name || acc.email || '?').charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-[#131b2e] truncate">{acc.name || '(Chưa đặt tên)'}</p>
                    <p className="text-[11px] text-[#6e7977] truncate">{acc.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase whitespace-nowrap ml-2 ${
                  acc.role === ROLES.ADMIN
                    ? 'bg-[#ffdad6] text-[#ba1a1a]'
                    : acc.role === ROLES.RECRUITER
                    ? 'bg-[#97f5cc]/60 text-[#00513a]'
                    : 'bg-[#e2e7ff] text-[#0039a6]'
                }`}>
                  {acc.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
