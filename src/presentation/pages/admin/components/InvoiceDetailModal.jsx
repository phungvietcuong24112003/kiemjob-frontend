import React, { useState, useEffect } from 'react';
import { featurePackageApi } from '../../../../infrastructure/api';

/**
 * InvoiceDetailModal - Modal xem chi tiết hóa đơn đơn mua gói nổi bật dành cho Admin
 */
export default function InvoiceDetailModal({ isOpen, onClose, order }) {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && order?.id) {
      setLoadingPayments(true);
      featurePackageApi
        .getAdminOrderPayments(order.id)
        .then((res) => {
          setPayments(Array.isArray(res) ? res : []);
        })
        .catch((err) => {
          console.warn('Không thể tải lịch sử giao dịch:', err);
          setPayments([]);
        })
        .finally(() => {
          setLoadingPayments(false);
        });
    } else {
      setPayments([]);
    }
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  // Tính toán thời hạn đẩy top
  const now = new Date();
  const featuredUntil = order.featuredUntil ? new Date(order.featuredUntil) : null;
  const isPaid = order.status === 'paid';
  const isExpired = featuredUntil ? featuredUntil < now : true;
  const isCurrentlyFeatured = isPaid && featuredUntil && !isExpired;

  // Tính số ngày/giờ còn lại
  const getRemainingTime = () => {
    if (!isPaid) return { text: 'Chưa kích hoạt', sub: 'Chờ thanh toán', status: 'pending' };
    if (!featuredUntil) return { text: 'Chưa kích hoạt', sub: 'Chưa có mốc thời gian', status: 'unknown' };
    if (isExpired) return { text: 'Đã hết hạn', sub: 'Hết hạn lúc ' + featuredUntil.toLocaleDateString('vi-VN'), status: 'expired' };

    const diffMs = featuredUntil.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;

    if (diffDays > 0) {
      return {
        text: `Còn ${diffDays} ngày ${remHours > 0 ? `${remHours} giờ` : ''}`,
        sub: `Hết hạn: ${featuredUntil.toLocaleString('vi-VN')}`,
        status: 'active',
        days: diffDays,
      };
    }
    return {
      text: `Còn ${diffHours} giờ`,
      sub: `Hết hạn: ${featuredUntil.toLocaleString('vi-VN')}`,
      status: 'active',
      hours: diffHours,
    };
  };

  const remainingInfo = getRemainingTime();

  const handleCopy = (text) => {
    navigator.clipboard.writeText(String(text));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-[#eaedff] overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#131b2e] via-[#1e293b] to-[#005c55] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#97f5cc] shadow-inner">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  Chi Tiết Hóa Đơn #{order.id}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isPaid
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : order.status === 'pending'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'bg-rose-400/20 text-rose-300 border border-rose-400/30'
                  }`}
                >
                  {isPaid ? 'Đã Thanh Toán' : order.status === 'pending' ? 'Chờ Thanh Toán' : 'Thất Bại'}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">
                Ngày tạo: {formatDate(order.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              title="In hóa đơn"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Card 1: Banner Hiệu Lực Đẩy Top */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isCurrentlyFeatured
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                : isPaid && isExpired
                ? 'bg-slate-50 border-slate-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isCurrentlyFeatured
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : isPaid && isExpired
                    ? 'bg-slate-500 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {isCurrentlyFeatured ? 'rocket_launch' : isPaid && isExpired ? 'timer_off' : 'hourglass_top'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Tình trạng hiệu lực đẩy top
                </span>
                <h4
                  className={`text-base font-extrabold ${
                    isCurrentlyFeatured
                      ? 'text-emerald-700'
                      : isPaid && isExpired
                      ? 'text-slate-700'
                      : 'text-amber-700'
                  }`}
                >
                  {remainingInfo.text}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">{remainingInfo.sub}</p>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="text-[11px] text-slate-500 block">Thời lượng gói mua</span>
              <span className="text-sm font-extrabold text-[#131b2e]">
                {order.durationDays || '—'} Ngày Đẩy Top
              </span>
            </div>
          </div>

          {/* Card 2: Thông tin bài post & Công ty */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <span className="material-symbols-outlined text-[16px] text-[#005c55]">apartment</span>
              <span>Tin Tuyển Dụng & Doanh Nghiệp Mua Gói</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Bài post */}
              <div className="space-y-1">
                <span className="text-slate-500 block">Bài post tuyển dụng áp dụng:</span>
                {order.jobTitle ? (
                  <div>
                    <div className="font-bold text-[#131b2e] text-sm hover:text-[#005c55] transition-colors">
                      {order.jobTitle}
                    </div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                      Mã tin: #{order.jobId}
                    </span>
                  </div>
                ) : (
                  <span className="text-amber-600 italic font-medium">Chưa liên kết bài post</span>
                )}
              </div>

              {/* Công ty */}
              <div className="space-y-1">
                <span className="text-slate-500 block">Doanh nghiệp tuyển dụng:</span>
                <div className="flex items-center gap-2">
                  {order.companyLogo ? (
                    <img
                      src={order.companyLogo}
                      alt={order.companyName}
                      className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#005c55] font-bold flex items-center justify-center shrink-0">
                      {order.companyName?.charAt(0) || 'C'}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-[#131b2e]">{order.companyName || 'Chưa cập nhật'}</div>
                    {order.companyId && (
                      <span className="text-slate-400 text-[10px]">ID Công ty: #{order.companyId}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Người mua */}
              <div className="space-y-1">
                <span className="text-slate-500 block">Người thực hiện mua gói:</span>
                <div className="font-semibold text-[#131b2e]">
                  {order.recruiterName || `Nhà tuyển dụng #${order.recruiterId}`}
                </div>
                {order.recruiterEmail && (
                  <span className="text-slate-500 text-[11px] block">{order.recruiterEmail}</span>
                )}
              </div>

              {/* Gói mua */}
              <div className="space-y-1">
                <span className="text-slate-500 block">Gói dịch vụ đã chọn:</span>
                <div className="font-bold text-[#005c55] text-sm">{order.planName}</div>
                <span className="text-slate-500 text-[11px] block">
                  Hiệu lực {order.durationDays} ngày kể từ thời điểm thanh toán
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Chi tiết thanh toán */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <span className="material-symbols-outlined text-[16px] text-[#005c55]">payments</span>
              <span>Thông Tin Thanh Toán & Hóa Đơn</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Mã hóa đơn:</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[#131b2e]">#{order.id}</span>
                  <button
                    onClick={() => handleCopy(order.id)}
                    title="Sao chép"
                    className="text-slate-400 hover:text-[#005c55] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Tổng thanh toán:</span>
                <span className="font-black text-sm text-[#005c55]">
                  {Number(order.amount).toLocaleString('vi-VN')} {order.currency || 'VND'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Phương thức / Cổng:</span>
                <span className="font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] border border-blue-200">
                  {order.paymentProvider || 'VNPAY'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Mã giao dịch cổng TT:</span>
                <span className="font-mono font-bold text-[#131b2e]">
                  {order.providerTxnId || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Thời gian tạo đơn:</span>
                <span className="font-medium text-slate-700">{formatDate(order.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Thời gian thanh toán:</span>
                <span className="font-medium text-slate-700">{formatDate(order.paidAt)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Bắt đầu đẩy top:</span>
                <span className="font-medium text-slate-700">
                  {formatDate(order.paidAt || order.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Hết hạn đẩy top:</span>
                <span className="font-bold text-[#005c55]">{formatDate(order.featuredUntil)}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Lịch sử các lần giao dịch liên quan */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#005c55]">history</span>
                <span>Lịch Sử Giao Dịch Của Đơn Hàng</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {payments.length} lượt giao dịch
              </span>
            </h4>

            {loadingPayments ? (
              <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin" />
                <span>Đang tải lịch sử giao dịch...</span>
              </div>
            ) : payments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Chưa có bản ghi giao dịch phụ nào cho đơn hàng này.
              </p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#131b2e]">Giao dịch #{p.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'success' || p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px] mt-0.5 block font-mono">
                        Ref: {p.providerOrderRef || '—'}
                      </span>
                    </div>

                    <div className="sm:text-right">
                      <span className="font-bold text-[#005c55] block">
                        {Number(p.amount).toLocaleString('vi-VN')} {p.currency}
                      </span>
                      <span className="text-slate-400 text-[10px] block">
                        {formatDate(p.completedAt || p.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            KiemJob Admin Invoicing System © {new Date().getFullYear()}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
}

