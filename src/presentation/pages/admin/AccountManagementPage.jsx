import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../infrastructure/api';

export default function AccountManagementPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'candidate', 'recruiter', 'admin'
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAdminAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching admin accounts:', err);
      showToast('Không thể tải danh sách tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleToggleVerify = async (id, name, currentVerified) => {
    setActionLoadingId(id);
    try {
      const res = await adminApi.toggleAccountVerify(id);
      const nextStatus = res.isVerified;
      setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, isVerified: nextStatus } : acc));
      showToast(`Đã ${nextStatus ? 'xác thực tài khoản' : 'hủy xác thực tài khoản'} cho "${name}"`);
    } catch (err) {
      console.error('Error toggling verify:', err);
      showToast('Có lỗi xảy ra khi đổi trạng thái xác thực', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return { label: 'Quản trị viên', bg: 'bg-[#ffdad6] text-[#ba1a1a]' };
      case 'recruiter':
        return { label: 'Nhà tuyển dụng', bg: 'bg-[#97f5cc]/60 text-[#00513a]' };
      case 'candidate':
      default:
        return { label: 'Ứng viên', bg: 'bg-[#e2e7ff] text-[#0039a6]' };
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  const filtered = accounts.filter(acc => {
    // Role filter
    if (roleFilter !== 'all') {
      if (acc.role?.toLowerCase() !== roleFilter.toLowerCase()) return false;
    }
    // Search term
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (acc.name && acc.name.toLowerCase().includes(q)) ||
      (acc.email && acc.email.toLowerCase().includes(q)) ||
      (acc.role && acc.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-white transition-all transform animate-bounce ${
          toastMsg.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#131b2e]'
        }`}>
          <span className="material-symbols-outlined text-[18px] text-[#97f5cc]">
            {toastMsg.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-[13px] font-semibold">{toastMsg.text}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-[#131b2e] tracking-tight">Quản Lý Tài Khoản Người Dùng</h1>
        </div>
        <button
          onClick={fetchAccounts}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#eaedff] border border-[#eaedff] text-[#005c55] rounded-lg text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Làm mới</span>
        </button>
      </div>

      {/* ── Main Content Card ── */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#eaedff] shadow-xs space-y-4">
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#f2f3ff] rounded-xl self-start overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'candidate', label: 'Ứng viên' },
              { id: 'recruiter', label: 'Nhà tuyển dụng' },
              { id: 'admin', label: 'Quản trị viên' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  roleFilter === tab.id
                    ? 'bg-white text-[#005c55] shadow-xs'
                    : 'text-[#6e7977] hover:text-[#131b2e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977] text-[18px]">search</span>
            <input
              type="text"
              placeholder="Tìm theo tên, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#f2f3ff] rounded-lg text-[13px] text-[#131b2e] outline-none border border-transparent focus:border-[#005c55] transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-[13px] text-[#6e7977]">
              <div className="inline-block animate-spin w-5 h-5 border-2 border-[#005c55] border-t-transparent rounded-full mb-2"></div>
              <p>Đang tải danh sách tài khoản...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-[#6e7977]">
              <span className="material-symbols-outlined text-[32px] text-[#6e7977]/40 mb-1">people_outline</span>
              <p className="font-semibold text-[14px] text-[#131b2e]">Không tìm thấy tài khoản nào</p>
              <p className="text-[12px] mt-0.5">Thử đổi điều kiện tìm kiếm hoặc tab vai trò.</p>
            </div>
          ) : (
            <table className="w-full text-left text-[13px] sm:text-[14px]">
              <thead>
                <tr className="border-b border-[#eaedff] text-[#6e7977] uppercase tracking-wider text-[12px] font-bold">
                  <th className="pb-3 px-2">Họ và tên</th>
                  <th className="pb-3 px-2">Email</th>
                  <th className="pb-3 px-2">Vai trò</th>
                  <th className="pb-3 px-2">Ngày tạo</th>
                  <th className="pb-3 px-2">Xác thực</th>
                  <th className="pb-3 px-2 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f3ff]">
                {filtered.map((acc) => {
                  const roleBadge = getRoleBadge(acc.role);
                  const isActioning = actionLoadingId === acc.id;
                  return (
                    <tr key={acc.id} className="hover:bg-[#f2f3ff]/50 transition-colors">
                      <td className="py-2.5 px-2 font-semibold text-[#131b2e] flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#005c55]/10 text-[#005c55] flex items-center justify-center font-bold text-[11px] uppercase shrink-0">
                          {(acc.name || acc.email || '?').charAt(0)}
                        </div>
                        <span className="truncate">{acc.name || '(Chưa đặt tên)'}</span>
                      </td>
                      <td className="py-2.5 px-2 text-[#3e4947]">{acc.email}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] uppercase ${roleBadge.bg}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[#6e7977] whitespace-nowrap text-[13px]">{formatDate(acc.createdAt)}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] inline-flex items-center gap-1 ${
                          acc.isVerified
                            ? 'bg-[#97f5cc]/60 text-[#00513a]'
                            : 'bg-[#ffdad6] text-[#ba1a1a]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${acc.isVerified ? 'bg-[#00513a]' : 'bg-[#ba1a1a]'}`} />
                          {acc.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isActioning}
                          onClick={() => handleToggleVerify(acc.id, acc.name || acc.email, acc.isVerified)}
                          className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                            acc.isVerified
                              ? 'bg-[#ffdad6]/60 text-[#ba1a1a] hover:bg-[#ffdad6]'
                              : 'bg-[#97f5cc]/40 text-[#00513a] hover:bg-[#97f5cc]'
                          }`}
                        >
                          {acc.isVerified ? 'Hủy xác thực' : 'Kích hoạt xác minh'}
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
    </div>
  );
}
