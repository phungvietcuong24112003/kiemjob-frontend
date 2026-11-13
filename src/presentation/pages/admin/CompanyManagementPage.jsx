import React, { useState, useEffect, useCallback } from 'react';
import {
  getAdminCompanies,
  getCompanyById,
  approveCompany,
  rejectCompany,
  deleteCompany,
  getCompanyLicenses,
  getCompanyAddresses,
  getCompanyLinks,
  getCompanyImages,
} from '../../../infrastructure/api/companyApi';
import CompanyTierBadge from '../../components/common/CompanyTierBadge';
import { formatCurrency } from '../../../infrastructure/utils/companyTierUtils';

export default function CompanyManagementPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved'
  const [tierFilter, setTierFilter] = useState('all'); // 'all', 'bronze', 'silver', 'gold', 'platinum'
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [toastMsg, setToastMsg] = useState(null);

  // Detail Modal State
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [companyLicenses, setCompanyLicenses] = useState([]);
  const [companyAddresses, setCompanyAddresses] = useState([]);
  const [companyLinks, setCompanyLinks] = useState([]);
  const [companyImages, setCompanyImages] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // License Lightbox Preview
  const [previewImage, setPreviewImage] = useState(null);

  // Toast Helper
  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch Companies
  const fetchCompanies = useCallback(async (currPage = page, status = statusFilter, search = searchTerm, tier = tierFilter) => {
    try {
      setLoading(true);
      const res = await getAdminCompanies({
        status,
        search,
        membershipTier: tier,
        page: currPage,
        size: 10,
      });

      if (res && Array.isArray(res.content)) {
        setCompanies(res.content);
        setTotalPages(res.totalPages || 0);
        setTotalElements(res.totalElements || 0);
      } else {
        setCompanies([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (err) {
      console.error('Fetch companies error:', err);
      showToast('Không thể tải danh sách doanh nghiệp.', true);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchTerm, tierFilter]);

  useEffect(() => {
    fetchCompanies(0, statusFilter, searchTerm, tierFilter);
    setPage(0);
  }, [statusFilter, tierFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchCompanies(0, statusFilter, searchTerm, tierFilter);
  };

  // Open Company Detail & Business License Modal
  const handleOpenDetail = async (company) => {
    setSelectedCompany(company);
    setModalLoading(true);
    setCompanyLicenses([]);
    setCompanyAddresses([]);
    setCompanyLinks([]);
    setCompanyImages([]);

    try {
      // Parallel fetch detail, licenses, addresses, links, images
      const [detail, licenses, addresses, links, images] = await Promise.all([
        getCompanyById(company.id).catch(() => company),
        getCompanyLicenses(company.id).catch(() => []),
        getCompanyAddresses(company.id).catch(() => []),
        getCompanyLinks(company.id).catch(() => []),
        getCompanyImages(company.id).catch(() => []),
      ]);

      setSelectedCompany(detail || company);
      setCompanyLicenses(Array.isArray(licenses) ? licenses : []);
      setCompanyAddresses(Array.isArray(addresses) ? addresses : []);
      setCompanyLinks(Array.isArray(links) ? links : []);
      setCompanyImages(Array.isArray(images) ? images : []);
    } catch (err) {
      console.error('Load company detail error:', err);
      showToast('Không thể tải đầy đủ thông tin doanh nghiệp.', true);
    } finally {
      setModalLoading(false);
    }
  };

  // Approve Company Action
  const handleApprove = async (companyId, companyName) => {
    try {
      setActionLoading(true);
      await approveCompany(companyId);
      showToast(`Đã phê duyệt doanh nghiệp "${companyName}" thành công!`);

      // Update in table
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: 'approved' } : c));
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany(prev => ({ ...prev, status: 'approved' }));
      }
    } catch (err) {
      console.error('Approve error:', err);
      showToast(err.message || 'Lỗi khi phê duyệt doanh nghiệp.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject / Revert to Pending Action
  const handleReject = async (companyId, companyName) => {
    try {
      setActionLoading(true);
      await rejectCompany(companyId);
      showToast(`Đã chuyển doanh nghiệp "${companyName}" về trạng thái chờ duyệt.`);

      // Update in table
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: 'pending' } : c));
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany(prev => ({ ...prev, status: 'pending' }));
      }
    } catch (err) {
      console.error('Reject error:', err);
      showToast(err.message || 'Lỗi khi cập nhật trạng thái.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Company Action
  const handleDelete = async (companyId, companyName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa doanh nghiệp "${companyName}"? Toàn bộ địa chỉ, hình ảnh và giấy phép liên quan sẽ bị xóa.`)) {
      return;
    }
    try {
      setActionLoading(true);
      await deleteCompany(companyId);
      showToast(`Đã xóa doanh nghiệp "${companyName}".`);
      setCompanies(prev => prev.filter(c => c.id !== companyId));
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message || 'Lỗi khi xóa doanh nghiệp.', true);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-[slideUp_0.3s_ease] ${
          toastMsg.isError ? 'bg-rose-700 text-white' : 'bg-[#131b2e] text-white'
        }`}>
          <span className="material-symbols-outlined text-[20px] text-[#97f5cc]">
            {toastMsg.isError ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-semibold">{toastMsg.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold text-[#131b2e] tracking-tight">Quản Lý &amp; Kiểm Duyệt Doanh Nghiệp</h1>
        </div>
        <button
          onClick={() => fetchCompanies(page, statusFilter, searchTerm)}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 bg-white border border-[#eaedff] hover:bg-slate-50 text-[#005c55] rounded-lg text-[13px] font-semibold shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
          Làm mới
        </button>
      </div>

      {/* Control Card: Filter Tabs & Search */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#eaedff] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Tất cả trạng thái', icon: 'corporate_fare' },
              { id: 'pending', label: 'Chờ kiểm duyệt', icon: 'pending_actions', isBadge: true },
              { id: 'approved', label: 'Đã phê duyệt', icon: 'verified' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#005c55] text-white shadow-md shadow-[#005c55]/20'
                    : 'bg-[#f2f3ff] text-[#475569] hover:bg-[#e2e8f0]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên doanh nghiệp..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#f2f3ff] rounded-lg text-[13px] text-[#131b2e] border border-transparent focus:border-[#005c55] outline-none transition-all font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); fetchCompanies(0, statusFilter, '', tierFilter); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7977] hover:text-[#131b2e]"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#005c55] hover:bg-[#007952] text-white text-[13px] font-semibold rounded-lg transition-all shadow-xs cursor-pointer"
            >
              Tìm
            </button>
          </form>
        </div>

        {/* Membership Tier Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#f2f3ff]">
          <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider mr-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-[#005c55]">stars</span>
            Hạng thành viên:
          </span>
          {[
            { id: 'all', label: 'Tất cả hạng' },
            { id: 'bronze', label: 'Bronze (< 500k)' },
            { id: 'silver', label: 'Silver (500k - 2M)' },
            { id: 'gold', label: 'Gold (2M - 5M)' },
            { id: 'platinum', label: 'Platinum VIP (5M+)' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTierFilter(t.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                tierFilter === t.id
                  ? 'bg-[#131b2e] text-white shadow-xs'
                  : 'bg-[#f8fafc] text-[#475569] border border-[#eaedff] hover:bg-[#eaedff]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Total count badge */}
        <div className="text-xs text-[#6e7977] font-medium pt-1">
          Hiển thị: <strong>{companies.length}</strong> / <strong>{totalElements}</strong> doanh nghiệp
        </div>

        {/* Company Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-[#005c55] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-[#6e7977]">Đang tải danh sách công ty từ máy chủ...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <span className="material-symbols-outlined text-[48px] text-[#cbd5e1]">business_center</span>
              <p className="text-sm font-bold text-[#131b2e]">Không tìm thấy doanh nghiệp nào</p>
              <p className="text-xs text-[#6e7977]">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#eaedff] text-[#6e7977] uppercase tracking-wider font-semibold">
                  <th className="pb-3 pl-2">Doanh Nghiệp</th>
                  <th className="pb-3">Phân loại</th>
                  <th className="pb-3">Hạng &amp; Chi tiêu</th>
                  <th className="pb-3">Liên hệ</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3 text-right pr-2">Kiểm duyệt &amp; GPKD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f3ff]">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f2f3ff]/40 transition-colors">
                    {/* Company Info */}
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#f8fafc] border border-[#eaedff] overflow-hidden shrink-0 flex items-center justify-center">
                          {c.logoUrl ? (
                            <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[#005c55] text-[24px]">corporate_fare</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#131b2e] text-sm hover:text-[#005c55] cursor-pointer" onClick={() => handleOpenDetail(c)}>
                            {c.name}
                          </p>
                          <p className="text-[11px] text-[#6e7977] truncate max-w-xs">{c.description || 'Chưa cập nhật mô tả'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Company Type */}
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        c.companyType === 'big'
                          ? 'bg-[#005c55]/10 text-[#005c55]'
                          : 'bg-[#f1f5f9] text-[#475569]'
                      }`}>
                        {c.companyType === 'big' ? '🏢 Tập đoàn lớn' : '🏬 Vừa & Nhỏ'}
                      </span>
                    </td>

                    {/* Membership Tier & Total Spending */}
                    <td className="py-3.5">
                      <div className="space-y-1">
                        <CompanyTierBadge tier={c.membershipTier || 'bronze'} size="xs" />
                        <p className="text-[11px] font-bold text-[#005c55]">
                          {formatCurrency(c.totalSpending || 0)}
                        </p>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[#131b2e]">{c.email || '—'}</p>
                        <p className="text-[#6e7977]">{c.phone || '—'}</p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 ${
                        c.status === 'approved'
                          ? 'bg-[#97f5cc]/60 text-[#00513a]'
                          : 'bg-[#ffdad6] text-[#ba1a1a]'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {c.status === 'approved' ? 'verified' : 'pending'}
                        </span>
                        {c.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 text-right pr-2">
                      <div className="inline-flex items-center gap-1.5">
                        {/* View Detail & License */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(c)}
                          title="Xem hồ sơ chi tiết & Giấy phép kinh doanh"
                          className="px-3 py-1.5 bg-[#005c55]/10 hover:bg-[#005c55] text-[#005c55] hover:text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Hồ sơ &amp; GPKD</span>
                        </button>

                        {/* Quick Approve if pending */}
                        {c.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => handleApprove(c.id, c.name)}
                            disabled={actionLoading}
                            title="Phê duyệt ngay"
                            className="px-3 py-1.5 bg-[#005c55] hover:bg-[#007952] text-white font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            <span>Duyệt</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReject(c.id, c.name)}
                            disabled={actionLoading}
                            title="Hủy duyệt, đưa về chờ"
                            className="px-2.5 py-1.5 bg-[#f1f5f9] hover:bg-[#ffdad6]/60 text-[#475569] hover:text-[#ba1a1a] font-bold rounded-xl transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">undo</span>
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={actionLoading}
                          title="Xóa công ty"
                          className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-xl transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[#eaedff]">
            <p className="text-xs text-[#6e7977]">
              Trang {page + 1} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { const next = page - 1; setPage(next); fetchCompanies(next, statusFilter, searchTerm, tierFilter); }}
                disabled={page === 0 || loading}
                className="px-3 py-1.5 bg-[#f2f3ff] hover:bg-[#e2e8f0] text-[#131b2e] rounded-xl text-xs font-bold disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => { const next = page + 1; setPage(next); fetchCompanies(next, statusFilter, searchTerm, tierFilter); }}
                disabled={page >= totalPages - 1 || loading}
                className="px-3 py-1.5 bg-[#f2f3ff] hover:bg-[#e2e8f0] text-[#131b2e] rounded-xl text-xs font-bold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: XEM CHI TIẾT CÔNG TY & GIẤY PHÉP KINH DOANH       */}
      {/* ======================================================== */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-[fadeIn_0.2s_ease]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-[#eaedff]">
            
            {/* Modal Header */}
            <div className="relative p-6 sm:p-7 border-b border-[#eaedff] bg-gradient-to-r from-[#005c55]/10 via-[#005c55]/5 to-transparent">
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="absolute top-5 right-5 text-[#6e7977] hover:text-[#131b2e] p-1.5 rounded-full hover:bg-white/80 transition-all"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>

              <div className="flex items-start gap-4 pr-10">
                <div className="w-16 h-16 rounded-2xl bg-white border border-[#eaedff] shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                  {selectedCompany.logoUrl ? (
                    <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[#005c55] text-[36px]">corporate_fare</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-[16px] font-bold text-[#131b2e]">{selectedCompany.name}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                      selectedCompany.status === 'approved' ? 'bg-[#97f5cc]/60 text-[#00513a]' : 'bg-[#ffdad6] text-[#ba1a1a]'
                    }`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {selectedCompany.status === 'approved' ? 'verified' : 'pending'}
                      </span>
                      {selectedCompany.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                    </span>
                    <CompanyTierBadge tier={selectedCompany.membershipTier || 'bronze'} size="sm" />
                  </div>

                  <p className="text-xs text-[#6e7977]">
                    Loại hình: <strong>{selectedCompany.companyType === 'big' ? 'Tập đoàn lớn' : 'Doanh nghiệp vừa & nhỏ'}</strong> • ID: #{selectedCompany.id} • Tổng chi tiêu: <strong className="text-[#005c55]">{formatCurrency(selectedCompany.totalSpending || 0)}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 sm:p-7 overflow-y-auto space-y-6 flex-1 divide-y divide-[#f2f3ff]">
              
              {/* === SECTION 1: GIẤY PHÉP KINH DOANH (TRỌNG TÂM DUYỆT) === */}
              <div className="space-y-3 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#005c55]/10 text-[#005c55] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">assignment</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#131b2e] uppercase tracking-wider">
                        Giấy Phép Kinh Doanh &amp; Hồ Sơ Pháp Lý
                      </h3>
                      <p className="text-xs text-[#6e7977]">Chứng từ do doanh nghiệp cung cấp để kiểm tra tính hợp pháp</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#f2f3ff] text-[#005c55]">
                    {companyLicenses.length} chứng từ
                  </span>
                </div>

                {modalLoading ? (
                  <div className="py-8 text-center text-xs text-[#6e7977]">
                    <div className="w-6 h-6 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Đang tải giấy phép kinh doanh...
                  </div>
                ) : companyLicenses.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">warning</span>
                    <div>
                      <p className="font-bold">Chưa tải lên Giấy Phép Kinh Doanh</p>
                      <p className="mt-0.5 leading-relaxed text-amber-700">
                        Doanh nghiệp này hiện chưa cung cấp tài liệu hoặc ảnh chụp giấy phép kinh doanh. Vui lòng cân nhắc kỹ trước khi phê duyệt.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {companyLicenses.map((lic, index) => {
                      const isImage = lic.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
                      return (
                        <div
                          key={lic.id || index}
                          className="group relative bg-[#f8fafc] border border-[#eaedff] hover:border-[#005c55]/40 rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#131b2e] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px] text-[#005c55]">verified_user</span>
                                Giấy phép kinh doanh #{index + 1}
                              </span>
                              <span className="text-[11px] text-[#6e7977]">Bản số hóa</span>
                            </div>

                            {/* Thumbnail / Preview */}
                            {isImage ? (
                              <div
                                onClick={() => setPreviewImage(lic.fileUrl)}
                                className="w-full h-44 rounded-xl overflow-hidden bg-white border border-[#cbd5e1] cursor-pointer relative group-hover:ring-2 group-hover:ring-[#005c55]/20"
                              >
                                <img
                                  src={lic.fileUrl}
                                  alt="Giấy phép kinh doanh"
                                  className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                                  <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                                  Phóng to
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-44 rounded-xl bg-white border border-[#cbd5e1] flex flex-col items-center justify-center text-[#6e7977] p-4 text-center">
                                <span className="material-symbols-outlined text-[48px] text-[#005c55]">description</span>
                                <span className="text-xs font-semibold mt-1">Tài liệu đính kèm (PDF / File)</span>
                              </div>
                            )}
                          </div>

                          {/* Link to Open Original */}
                          <div className="pt-3 flex items-center justify-between border-t border-[#eaedff] mt-3">
                            <button
                              type="button"
                              onClick={() => setPreviewImage(lic.fileUrl)}
                              className="text-xs text-[#005c55] hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                              Xem chi tiết
                            </button>

                            <a
                              href={lic.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1 bg-white border border-[#cbd5e1] hover:border-[#005c55] text-[#131b2e] rounded-lg font-bold inline-flex items-center gap-1 shadow-2xs hover:shadow-xs transition-all"
                            >
                              <span>Mở bản gốc</span>
                              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* === SECTION 2: THÔNG TIN LIÊN HỆ & MÔ TẢ === */}
              <div className="pt-6 pb-6 space-y-4">
                <h3 className="text-sm font-bold text-[#131b2e] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#005c55]">info</span>
                  Thông tin doanh nghiệp
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-[#f8fafc] rounded-xl border border-[#eaedff]">
                    <span className="text-[#6e7977] block text-[11px] uppercase font-bold">Email doanh nghiệp</span>
                    <span className="font-bold text-[#131b2e] text-sm mt-0.5 block">{selectedCompany.email || '—'}</span>
                  </div>

                  <div className="p-3.5 bg-[#f8fafc] rounded-xl border border-[#eaedff]">
                    <span className="text-[#6e7977] block text-[11px] uppercase font-bold">Số điện thoại</span>
                    <span className="font-bold text-[#131b2e] text-sm mt-0.5 block">{selectedCompany.phone || '—'}</span>
                  </div>
                </div>
              </div>

              {/* === SECTION 3: ĐỊA CHỈ & CHI NHÁNH === */}
              <div className="pt-6 pb-6 space-y-3">
                <h3 className="text-sm font-bold text-[#131b2e] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#005c55]">location_on</span>
                  Trụ sở &amp; Địa chỉ chi nhánh ({companyAddresses.length})
                </h3>

                {companyAddresses.length === 0 ? (
                  <p className="text-xs text-[#6e7977] italic">Chưa có thông tin địa chỉ cụ thể.</p>
                ) : (
                  <div className="space-y-2">
                    {companyAddresses.map((addr) => (
                      <div key={addr.id} className="p-3 bg-[#f8fafc] rounded-xl border border-[#eaedff] flex items-center gap-2 text-xs">
                        <span className="material-symbols-outlined text-[#005c55] text-[18px]">pin_drop</span>
                        <span className="font-bold text-[#131b2e]">{addr.provinceName || 'Tỉnh/Thành'}:</span>
                        <span className="text-[#3e4947]">{addr.addressDetail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* === SECTION 4: LIÊN KẾT & MẠNG XÃ HỘI === */}
              {companyLinks.length > 0 && (
                <div className="pt-6 space-y-3">
                  <h3 className="text-sm font-bold text-[#131b2e] uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#005c55]">link</span>
                    Liên kết mạng xã hội &amp; Website
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {companyLinks.map((l) => (
                      <a
                        key={l.id}
                        href={l.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#f8fafc] hover:bg-[#eaedff] border border-[#eaedff] rounded-xl font-bold text-[#005c55] inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        <span>{l.tpye || 'Website'}: {l.link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-5 sm:p-6 bg-white border-t border-[#eaedff] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDelete(selectedCompany.id, selectedCompany.name)}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-[#ba1a1a] rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Xóa doanh nghiệp
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedCompany(null)}
                  className="px-5 py-2.5 bg-[#f2f3ff] hover:bg-[#e2e8f0] text-[#131b2e] rounded-xl text-xs font-bold transition-colors"
                >
                  Đóng
                </button>

                {selectedCompany.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedCompany.id, selectedCompany.name)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-[#005c55] hover:bg-[#007952] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Phê duyệt doanh nghiệp
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReject(selectedCompany.id, selectedCompany.name)}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">undo</span>
                    Hủy phê duyệt
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LIGHTBOX: PHÓNG TO XEM GIẤY PHÉP KINH DOANH              */}
      {/* ======================================================== */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease]"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <img
              src={previewImage}
              alt="Giấy phép kinh doanh phóng to"
              className="max-h-[85vh] max-w-full object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
