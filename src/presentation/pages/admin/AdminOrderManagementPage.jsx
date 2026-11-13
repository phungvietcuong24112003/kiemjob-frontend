import React, { useState, useEffect, useMemo } from 'react';
import { featurePackageApi } from '../../../infrastructure/api';
import InvoiceDetailModal from './components/InvoiceDetailModal';

/**
 * AdminOrderManagementPage - Trang Quản Lý Hóa Đơn & Gói Đẩy Top Tin Tuyển Dụng dành cho Admin
 * Hiển thị danh sách bài post nào của công ty nào đã mua gói nào, hiệu lực đẩy top mấy ngày, còn mấy ngày.
 */
export default function AdminOrderManagementPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending' | 'failed'
  const [validityFilter, setValidityFilter] = useState('all'); // 'all' | 'active' | 'expired' | 'pending'
  const [planFilter, setPlanFilter] = useState('all');

  // Modal chi tiết
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Tải danh sách đơn hàng
  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await featurePackageApi.getAllOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải danh sách hóa đơn:', err);
      showToast(err.message || 'Không thể tải danh sách hóa đơn', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const now = new Date();

  // Helper tính thời gian còn lại
  const getRemainingInfo = (order) => {
    const isPaid = order.status === 'paid';
    if (!isPaid) {
      return {
        type: 'pending',
        label: 'Chưa kích hoạt',
        sub: 'Chờ thanh toán',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
      };
    }

    if (!order.featuredUntil) {
      return {
        type: 'unknown',
        label: 'Chưa có mốc hạn',
        sub: 'Chưa gán tin',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
      };
    }

    const untilDate = new Date(order.featuredUntil);
    const diffMs = untilDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return {
        type: 'expired',
        label: 'Đã hết hạn',
        sub: `Hết hạn ${untilDate.toLocaleDateString('vi-VN')}`,
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        dotClass: 'bg-slate-400',
      };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;

    if (diffDays > 0) {
      return {
        type: 'active',
        label: `Còn ${diffDays} ngày ${remHours > 0 ? `${remHours}h` : ''}`,
        sub: `Đến ${untilDate.toLocaleDateString('vi-VN')}`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        dotClass: 'bg-emerald-500 animate-pulse',
      };
    }

    return {
      type: 'active',
      label: `Còn ${diffHours} giờ`,
      sub: `Đến ${untilDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
      dotClass: 'bg-teal-500 animate-pulse',
    };
  };

  // Lọc danh sách
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Keyword search
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const matchId = String(order.id).includes(q);
        const matchJobTitle = order.jobTitle?.toLowerCase().includes(q);
        const matchJobId = order.jobId && String(order.jobId).includes(q);
        const matchCompany = order.companyName?.toLowerCase().includes(q);
        const matchRecruiter = order.recruiterName?.toLowerCase().includes(q);
        const matchEmail = order.recruiterEmail?.toLowerCase().includes(q);
        const matchTxn = order.providerTxnId?.toLowerCase().includes(q);

        if (!matchId && !matchJobTitle && !matchJobId && !matchCompany && !matchRecruiter && !matchEmail && !matchTxn) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // 3. Plan filter
      if (planFilter !== 'all' && String(order.planId) !== planFilter) {
        return false;
      }

      // 4. Validity filter
      if (validityFilter !== 'all') {
        const rem = getRemainingInfo(order);
        if (validityFilter === 'active' && rem.type !== 'active') return false;
        if (validityFilter === 'expired' && rem.type !== 'expired') return false;
        if (validityFilter === 'pending' && rem.type !== 'pending') return false;
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter, planFilter, validityFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const paidOrders = orders.filter((o) => o.status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    let activeCount = 0;
    let expiredCount = 0;

    paidOrders.forEach((o) => {
      if (o.featuredUntil) {
        const until = new Date(o.featuredUntil);
        if (until > now) activeCount++;
        else expiredCount++;
      }
    });

    const pendingCount = orders.filter((o) => o.status === 'pending').length;

    return { totalCount, totalRevenue, activeCount, expiredCount, pendingCount };
  }, [orders]);

  // Danh sách các gói xuất hiện để filter
  const uniquePlans = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      if (o.planId && o.planName && !map.has(o.planId)) {
        map.set(o.planId, o.planName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const handleOpenDetail = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold animate-fade-in border ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold text-[#131b2e] tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#005c55] text-[20px]">
              receipt_long
            </span>
            <span>Quản Lý Hóa Đơn & Đẩy Top Tin Tuyển Dụng</span>
          </h1>
        </div>

        <button
          onClick={loadOrders}
          disabled={loading}
          className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-[#eaedff] hover:bg-slate-50 bg-white text-slate-700 text-[13px] font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Cards Thống Kê KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#eaedff] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Doanh thu mua gói</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div className="text-[20px] font-bold text-[#005c55] tracking-tight">
            {stats.totalRevenue.toLocaleString('vi-VN')} <span className="text-xs font-bold text-slate-400">VND</span>
          </div>
          <p className="text-[11px] text-slate-400">Từ các gói nổi bật đã thanh toán</p>
        </div>

        {/* Tổng hóa đơn */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#eaedff] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Tổng số đơn hàng</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">receipt</span>
            </div>
          </div>
          <div className="text-[20px] font-bold text-[#131b2e] tracking-tight">
            {stats.totalCount} <span className="text-xs font-bold text-slate-400">đơn</span>
          </div>
          <p className="text-[11px] text-slate-400">Toàn bộ lịch sử tạo đơn trong hệ thống</p>
        </div>

        {/* Đang đẩy top (Còn hạn) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#eaedff] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Đang đẩy top (Còn hạn)</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#005c55] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
            </div>
          </div>
          <div className="text-[20px] font-bold text-[#005c55] tracking-tight">
            {stats.activeCount} <span className="text-xs font-bold text-slate-400">tin đang VIP</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium">Đang ưu tiên hiển thị đầu trang</p>
        </div>

        {/* Chờ thanh toán */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#eaedff] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Chờ thanh toán</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
            </div>
          </div>
          <div className="text-[20px] font-bold text-amber-700 tracking-tight">
            {stats.pendingCount} <span className="text-xs font-bold text-slate-400">chờ xử lý</span>
          </div>
          <p className="text-[11px] text-slate-400">Chưa hoàn tất giao dịch VNPAY</p>
        </div>
      </div>

      {/* Thanh Điều Khiển & Bộ Lọc */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#eaedff] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-lg">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã đơn, Tiêu đề bài post, Tên công ty, Email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#005c55] focus:ring-2 focus:ring-[#005c55]/10 text-xs font-medium text-[#131b2e] outline-none transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
              </button>
            )}
          </div>

          {/* Nhóm Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc Trạng Thái TT */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:border-slate-300 focus:border-[#005c55] outline-none transition-colors cursor-pointer"
            >
              <option value="all">Tất cả trạng thái TT</option>
              <option value="paid">Đã thanh toán (paid)</option>
              <option value="pending">Chờ thanh toán (pending)</option>
              <option value="failed">Thất bại / Đã hủy</option>
            </select>

            {/* Lọc Hiệu Lực Đẩy Top */}
            <select
              value={validityFilter}
              onChange={(e) => setValidityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:border-slate-300 focus:border-[#005c55] outline-none transition-colors cursor-pointer"
            >
              <option value="all">Tất cả hiệu lực đẩy top</option>
              <option value="active">Đang đẩy top (Còn hạn)</option>
              <option value="expired">Đã hết hạn đẩy top</option>
              <option value="pending">Chưa kích hoạt</option>
            </select>

            {/* Lọc theo Gói Mua */}
            {uniquePlans.length > 0 && (
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:border-slate-300 focus:border-[#005c55] outline-none transition-colors cursor-pointer"
              >
                <option value="all">Tất cả gói dịch vụ</option>
                {uniquePlans.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Filter Button */}
            {(searchTerm || statusFilter !== 'all' || validityFilter !== 'all' || planFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setValidityFilter('all');
                  setPlanFilter('all');
                }}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">clear_all</span>
                <span>Bỏ lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bảng Dữ Liệu Hóa Đơn */}
      <div className="bg-white rounded-3xl border border-[#eaedff] overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#005c55] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Đang tải danh sách hóa đơn & dữ liệu đẩy top...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center space-y-3 px-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[32px]">receipt_long</span>
            </div>
            <h3 className="text-sm font-extrabold text-[#131b2e]">
              Không tìm thấy hóa đơn nào phù hợp
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc để xem lại danh sách đơn hàng.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#eaedff] text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-4 sm:px-6">Mã Đơn</th>
                  <th className="py-4 px-4">Bài Post Tuyển Dụng</th>
                  <th className="py-4 px-4">Công Ty Mua Gói</th>
                  <th className="py-4 px-4">Gói Mua & Giá</th>
                  <th className="py-4 px-4">Hiệu Lực & Còn Lại</th>
                  <th className="py-4 px-4">Trạng Thái TT</th>
                  <th className="py-4 px-4">Ngày Tạo</th>
                  <th className="py-4 px-4 sm:px-6 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-[#131b2e]">
                {filteredOrders.map((ord) => {
                  const rem = getRemainingInfo(ord);
                  const isPaid = ord.status === 'paid';
                  const isPending = ord.status === 'pending';

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Mã đơn */}
                      <td className="py-4 px-4 sm:px-6 font-bold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">#</span>
                          <span className="text-[#131b2e] font-black">{ord.id}</span>
                        </div>
                      </td>

                      {/* Bài post tuyển dụng */}
                      <td className="py-4 px-4 max-w-xs">
                        {ord.jobTitle ? (
                          <div>
                            <div className="font-bold text-[#131b2e] hover:text-[#005c55] transition-colors truncate">
                              {ord.jobTitle}
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">
                              Mã tin: #{ord.jobId}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Chưa gán tin tuyển dụng
                          </span>
                        )}
                      </td>

                      {/* Công ty */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex items-center gap-2.5">
                          {ord.companyLogo ? (
                            <img
                              src={ord.companyLogo}
                              alt={ord.companyName || 'Logo'}
                              className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#005c55]/10 text-[#005c55] font-black text-xs flex items-center justify-center shrink-0">
                              {ord.companyName?.charAt(0) || 'C'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-[#131b2e] truncate">
                              {ord.companyName || 'Công ty chưa cập nhật'}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {ord.recruiterName || `Recruiter #${ord.recruiterId}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Gói mua & Giá tiền */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-[#005c55]">{ord.planName}</div>
                        <div className="font-black text-sm text-[#131b2e]">
                          {Number(ord.amount).toLocaleString('vi-VN')}{' '}
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {ord.currency || 'VND'}
                          </span>
                        </div>
                      </td>

                      {/* Hiệu lực đẩy top & Còn mấy ngày */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${rem.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${rem.dotClass}`} />
                            <span>{rem.label}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block pl-1">
                            {ord.durationDays ? `Gói ${ord.durationDays} ngày • ` : ''}
                            {rem.sub}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái thanh toán */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {isPaid ? 'check_circle' : isPending ? 'schedule' : 'cancel'}
                          </span>
                          <span>{isPaid ? 'Đã Thanh Toán' : isPending ? 'Chờ Xử Lý' : 'Thất Bại'}</span>
                        </span>
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-4 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        <div>{formatDate(ord.createdAt)}</div>
                        {ord.paidAt && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            TT: {formatDate(ord.paidAt)}
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetail(ord)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#005c55] text-slate-700 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer group-hover:bg-[#005c55] group-hover:text-white"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Xem Chi Tiết Hóa Đơn */}
      <InvoiceDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />
    </div>
  );
}

