import React, { useState, useEffect, useMemo } from 'react';
import { featurePackageApi } from '../../../infrastructure/api';

/**
 * RecruiterOrdersPage - Quản lý đơn hàng mua gói nổi bật & lịch sử giao dịch thanh toán
 * Kết nối với backend: FeaturedOrder & PaymentTransaction
 */
export default function RecruiterOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending' | 'failed'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderPayments, setOrderPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await featurePackageApi.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng:', err);
      showToast(err.message || 'Không thể tải danh sách đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchTerm.trim().toLowerCase();
      const matchId = String(order.id).includes(q);
      const matchPlan = order.planName?.toLowerCase().includes(q);
      if (q && !matchId && !matchPlan) return false;

      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      return true;
    });
  }, [orders, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const paidOrders = orders.filter((o) => o.status === 'paid');
    const paidCount = paidOrders.length;
    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    const totalSpent = paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    return { total, paidCount, pendingCount, totalSpent };
  }, [orders]);

  const handleViewPayments = async (order) => {
    setSelectedOrder(order);
    setLoadingPayments(true);
    try {
      const payments = await featurePackageApi.getOrderPayments(order.id);
      setOrderPayments(Array.isArray(payments) ? payments : []);
    } catch (err) {
      console.error('Lỗi tải giao dịch thanh toán:', err);
      setOrderPayments([]);
      showToast('Không tải được lịch sử thanh toán của đơn hàng này', 'error');
    } finally {
      setLoadingPayments(false);
    }
  };

  const handlePayNow = async (orderId) => {
    setPayingOrderId(orderId);
    try {
      const res = await featurePackageApi.createVnPayPayment(orderId);
      const url = res.paymentUrl || res.data?.paymentUrl;
      if (url) {
        window.location.href = url;
      } else {
        showToast('Không thể tạo liên kết thanh toán VNPAY. Vui lòng thử lại.', 'error');
      }
    } catch (err) {
      console.error('Lỗi tiếp tục thanh toán:', err);
      showToast(err.message || 'Không thể kết nối cổng thanh toán VNPAY', 'error');
    } finally {
      setPayingOrderId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {status === 'success' ? 'Thành công' : 'Đã thanh toán'}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ thanh toán
          </span>
        );
      case 'failed':
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Đã hủy / Thất bại
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
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
    <div className="space-y-4 pb-12">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border text-xs font-semibold ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#005c55] text-[22px]">receipt_long</span>
            <span>Đơn hàng & Giao dịch</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lịch sử đơn mua gói đẩy top nổi bật tin tuyển dụng và thanh toán VNPAY.
          </p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>Làm mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{stats.total}</div>
            <div className="text-[11px] text-slate-500 font-medium">Tổng đơn hàng</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-700">{stats.paidCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Đã thanh toán</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">pending_actions</span>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-700">{stats.pendingCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Chờ thanh toán</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#005c55] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">payments</span>
          </div>
          <div>
            <div className="text-lg font-bold text-[#005c55]">
              {stats.totalSpent.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Tổng chi phí</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo mã đơn hoặc tên gói dịch vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#005c55] text-xs text-slate-900 placeholder-slate-400 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'paid', label: 'Đã thanh toán' },
            { key: 'pending', label: 'Chờ thanh toán' },
            { key: 'failed', label: 'Thất bại' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === item.key
                  ? 'bg-[#005c55] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <span className="w-6 h-6 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin inline-block" />
            <p className="text-xs font-semibold">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1">
            <span className="material-symbols-outlined text-[36px]">receipt</span>
            <p className="text-xs font-bold text-slate-700">Không tìm thấy đơn hàng nào</p>
            <p className="text-[11px] text-slate-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                : 'Bạn chưa có đơn hàng nào. Vào mục "Quản lý tin tuyển dụng" để đẩy top tin.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Mã đơn</th>
                  <th className="py-2.5 px-4">Gói dịch vụ</th>
                  <th className="py-2.5 px-4">Số tiền</th>
                  <th className="py-2.5 px-4">Trạng thái</th>
                  <th className="py-2.5 px-4">Ngày tạo</th>
                  <th className="py-2.5 px-4">Thanh toán</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOrders.map((order) => {
                  const isPaying = payingOrderId === order.id;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">#{order.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{order.planName || `Gói #${order.planId}`}</div>
                        <div className="text-[10px] text-slate-400">Gói đẩy top nổi bật</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-sm text-[#005c55]">
                        {Number(order.amount).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(order.createdAt)}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(order.paidAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handlePayNow(order.id)}
                              disabled={isPaying}
                              className="px-2.5 py-1 rounded-lg bg-[#005c55] hover:bg-[#007952] text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isPaying ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span className="material-symbols-outlined text-[14px]">credit_card</span>
                              )}
                              <span>Thanh toán</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleViewPayments(order)}
                            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            title="Xem lịch sử giao dịch thanh toán"
                          >
                            <span className="material-symbols-outlined text-[16px]">history</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Lịch Sử Giao Dịch */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Chi tiết thanh toán đơn #{selectedOrder.id}</h3>
                <p className="text-xs text-slate-500">{selectedOrder.planName || 'Gói dịch vụ'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {loadingPayments ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <span className="w-5 h-5 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin inline-block mb-1" />
                <p>Đang tải giao dịch...</p>
              </div>
            ) : orderPayments.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                Chưa ghi nhận giao dịch thanh toán nào cho đơn hàng này.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {orderPayments.map((p) => (
                  <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">GD #{p.id} ({p.paymentMethod || 'VNPAY'})</span>
                      <span className="font-bold text-[#005c55]">{Number(p.amount).toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Mã GD VNPAY: {p.transactionCode || '---'}</span>
                      <span>{formatDate(p.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
