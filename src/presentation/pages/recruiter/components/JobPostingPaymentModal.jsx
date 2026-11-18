import React, { useState, useEffect } from 'react';
import { X, CreditCard, Clock, Calendar, AlertCircle, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';
import { jobPostingOrderApi } from '../../../../infrastructure/api';

export default function JobPostingPaymentModal({
  isOpen,
  onClose,
  job,
  mode = 'pay', // 'pay' (thanh toán đơn đã có) hoặc 'renew' (tạo đơn gia hạn mới)
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [durationDays, setDurationDays] = useState(30);
  const [error, setError] = useState('');

  const PRICE_PER_DAY = 1000;

  useEffect(() => {
    if (!isOpen || !job) {
      setOrder(null);
      setError('');
      return;
    }

    if (mode === 'pay') {
      loadLatestOrder();
    } else {
      setDurationDays(30);
    }
  }, [isOpen, job, mode]);

  const loadLatestOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await jobPostingOrderApi.getLatestOrderByJobId(job.id);
      setOrder(res?.data || res);
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng:', err);
      setError('Không thể tải thông tin đơn hàng thanh toán. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (orderIdToPay) => {
    try {
      setLoading(true);
      setError('');
      const id = orderIdToPay || order?.id;
      if (!id) {
        setError('Không tìm thấy mã đơn hàng cần thanh toán.');
        return;
      }
      const res = await jobPostingOrderApi.createPaymentUrl(id);
      const url = res?.data?.paymentUrl || res?.paymentUrl;
      if (url) {
        window.location.href = url;
      } else {
        setError('Không nhận được URL thanh toán từ cổng VNPay.');
      }
    } catch (err) {
      console.error('Lỗi khi tạo URL thanh toán:', err);
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo link thanh toán VNPay.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRenewalAndPay = async () => {
    try {
      setLoading(true);
      setError('');
      if (durationDays < 3 || durationDays > 90) {
        setError('Số ngày hiển thị gia hạn phải từ 3 đến 90 ngày.');
        return;
      }

      const res = await jobPostingOrderApi.renewJobPost(job.id, durationDays);
      const createdOrder = res?.data || res;
      if (createdOrder?.id) {
        // Tự động chuyển hướng thanh toán
        await handlePayNow(createdOrder.id);
      }
    } catch (err) {
      console.error('Lỗi khi gia hạn tin:', err);
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo đơn gia hạn.');
      setLoading(false);
    }
  };

  if (!isOpen || !job) return null;

  const totalAmount = mode === 'renew'
    ? durationDays * PRICE_PER_DAY
    : (order?.totalAmount || (job.durationDays || 30) * PRICE_PER_DAY);

  const displayDays = mode === 'renew'
    ? durationDays
    : (order?.durationDays || job.durationDays || 30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-200" />
            <h3 className="text-lg font-bold">
              {mode === 'renew' ? 'Gia hạn tin tuyển dụng' : 'Thanh toán phí đăng tin tuyển dụng'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Job summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tin tuyển dụng</div>
            <div className="text-base font-bold text-slate-800 line-clamp-1">{job.title}</div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                Tin trả phí (PAID)
              </span>
              <span>Đơn giá: <strong>1.000đ / ngày</strong></span>
            </div>
          </div>

          {/* Renewal Day Selector */}
          {mode === 'renew' ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Chọn số ngày gia hạn hiển thị (3 - 90 ngày):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="3"
                  max="90"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(3, Math.min(90, parseInt(e.target.value) || 3)))}
                  className="w-28 px-3 py-2 text-center text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-sm text-slate-600">ngày</span>
                <div className="flex gap-1.5 ml-auto">
                  {[7, 15, 30, 60].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDurationDays(days)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                        durationDays === days
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {days} ngày
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Thời hạn hiển thị:</span>
                <span className="font-semibold text-slate-800">{displayDays} ngày</span>
              </div>
              {order?.paymentDeadline && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-amber-700">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Hạn thanh toán (48h):
                  </span>
                  <span className="font-semibold">
                    {new Date(order.paymentDeadline).toLocaleString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Fee Calculation */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 space-y-2">
            <div className="flex justify-between items-center text-sm text-slate-600">
              <span>Đơn giá hiển thị:</span>
              <span>1.000 VNĐ / ngày</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600">
              <span>Thời gian đăng ký:</span>
              <span>{displayDays} ngày</span>
            </div>
            <div className="pt-2 border-t border-blue-200/60 flex justify-between items-center">
              <span className="text-base font-bold text-slate-800">Tổng thanh toán:</span>
              <span className="text-2xl font-black text-blue-700">
                {totalAmount.toLocaleString('vi-VN')} <span className="text-sm font-semibold">VNĐ</span>
              </span>
            </div>
          </div>

          {/* Payment gateway badge */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Thanh toán an toàn, bảo mật qua Cổng thanh toán quốc gia VNPay (ATM / QR Pay / Visa).</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={mode === 'renew' ? handleCreateRenewalAndPay : () => handlePayNow()}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Thanh toán VNPay ngay</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
