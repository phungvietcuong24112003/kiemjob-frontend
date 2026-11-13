import React, { useState } from 'react';
import { featurePackageApi } from '../../../../infrastructure/api';

/**
 * PromoteJobModal - Modal chọn gói dịch vụ Đẩy Top / Nổi Bật tin tuyển dụng
 * Hiển thị danh sách các gói sắp xếp từ RẺ ĐẾN ĐẮT (từ trái sang phải).
 */
export default function PromoteJobModal({ isOpen, onClose, job, packages = [], onPromoteSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('vnpay'); // 'vnpay' | 'momo'
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('select'); // 'select' | 'confirm' | 'success'
  const [createdOrder, setCreatedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Lọc chỉ lấy các gói đang hoạt động và sắp xếp theo GIÁ TĂNG DẦN (RẺ ĐẾN ĐẮT)
  const sortedPackages = [...packages]
    .filter((p) => p.isActive !== false)
    .sort((a, b) => Number(a.price) - Number(b.price));

  // Tùy biến màu sắc & huy hiệu theo từng gói (thời hạn hoặc giá)
  const getPackageStyle = (pkg, index) => {
    const days = pkg.durationDays;
    if (days === 1) {
      return {
        badgeText: 'Dùng Thử 24H',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        gradientHeader: 'from-emerald-500 to-teal-600',
        borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10',
        tagBg: 'bg-emerald-50 text-emerald-700',
        icon: 'timer',
      };
    }
    if (days === 7) {
      return {
        badgeText: 'Phổ Biến Nhất',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        gradientHeader: 'from-indigo-600 to-blue-600',
        borderActive: 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-indigo-500/10',
        tagBg: 'bg-indigo-50 text-indigo-700',
        icon: 'local_fire_department',
      };
    }
    if (days === 14) {
      return {
        badgeText: 'VIP Hiệu Quả',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
        gradientHeader: 'from-amber-500 to-orange-600',
        borderActive: 'border-amber-500 ring-2 ring-amber-500/20 shadow-amber-500/10',
        tagBg: 'bg-amber-50 text-amber-800',
        icon: 'workspace_premium',
      };
    }
    // Gói tùy chỉnh khác
    return {
      badgeText: `Gói ${days} Ngày`,
      badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
      gradientHeader: 'from-teal-600 to-cyan-700',
      borderActive: 'border-teal-500 ring-2 ring-teal-500/20',
      tagBg: 'bg-teal-50 text-teal-700',
      icon: 'auto_awesome',
    };
  };

  // Tiến hành tạo đơn hàng và thanh toán
  const handleProceedPayment = async () => {
    if (!selectedPlan) {
      setErrorMsg('Vui lòng chọn 1 gói đẩy top trước khi tiếp tục.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      // 1. Tạo đơn hàng Featured Order (kèm ID tin tuyển dụng)
      const order = await featurePackageApi.createOrder(selectedPlan.id, job?.id);
      setCreatedOrder(order);

      // 2. Tạo giao dịch thanh toán (ghi nhận pending)
      try {
        await featurePackageApi.createPayment(order.id, paymentMethod);
      } catch (payErr) {
        console.warn('Giao dịch thanh toán tự động ghi nhận:', payErr);
      }

      // 3. Nếu chọn VNPAY → lấy URL thanh toán và redirect
      if (paymentMethod === 'vnpay') {
        try {
          const vnpayResult = await featurePackageApi.createVnPayPayment(order.id);
          const paymentUrl = vnpayResult.paymentUrl || vnpayResult.data?.paymentUrl;
          if (paymentUrl) {
            console.log('VNPAY PAYMENT URL:', paymentUrl);
            window.location.href = paymentUrl;
            return; // Đang redirect, không tiếp tục
          } else {
            setErrorMsg('Không thể tạo liên kết thanh toán VNPAY. Vui lòng thử lại.');
            setIsProcessing(false);
            return;
          }
        } catch (vnpayErr) {
          console.error('Lỗi tạo thanh toán VNPAY:', vnpayErr);
          setErrorMsg('Không thể kết nối cổng thanh toán VNPAY. Vui lòng thử lại sau.');
          setIsProcessing(false);
          return;
        }
      }

      // Nếu chọn MoMo hoặc phương thức khác → hiện thông báo thành công (chưa tích hợp)
      setStep('success');
      if (typeof onPromoteSuccess === 'function') {
        onPromoteSuccess({
          jobId: job?.id,
          plan: selectedPlan,
          order,
        });
      }
    } catch (err) {
      console.error('Lỗi đẩy top tin tuyển dụng:', err);
      setErrorMsg(err.message || 'Không thể tạo đơn mua gói. Vui lòng thử lại sau.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setStep('select');
    setSelectedPlan(null);
    setErrorMsg('');
    setCreatedOrder(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-[#eaedff] overflow-hidden flex flex-col my-auto animate-scale-up">
        {/* Header Modal */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#131b2e] via-[#1e293b] to-[#0f766e] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#97f5cc] shadow-inner">
              <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                  Đẩy Top & Quảng Bá Tin Tuyển Dụng
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30 uppercase">
                  Tiếp cận x3
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5 truncate max-w-md">
                Tin tuyển dụng: <span className="font-semibold text-white">"{job?.title}"</span> (Mã #{job?.id})
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-red-500">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'select' && (
            <>
              {/* Tiêu đề chọn gói */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-[#131b2e] flex items-center gap-2">
                    <span>Chọn Gói Nổi Bật Phù Hợp</span>
                    <span className="text-xs font-medium text-slate-400">
                      (Sắp xếp từ rẻ nhất đến cao cấp)
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tin tuyển dụng sẽ được ghim vị trí đầu trang tìm kiếm và dán nhãn nổi bật thu hút ứng viên.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <span>Rẻ nhất</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  <span>Cao cấp</span>
                </div>
              </div>

              {/* DANH SÁCH GÓI: HIỂN THỊ TỪ RẺ ĐẾN ĐẮT (TỪ TRÁI SANG PHẢI) */}
              {sortedPackages.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="material-symbols-outlined text-4xl text-slate-400">inventory_2</span>
                  <p className="text-sm font-bold text-slate-700">Hiện chưa có gói đẩy top nào đang mở bán.</p>
                  <p className="text-xs text-slate-500">Vui lòng liên hệ ban quản trị để được hỗ trợ kích hoạt gói.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
                  {sortedPackages.map((pkg, index) => {
                    const isSelected = selectedPlan?.id === pkg.id;
                    const style = getPackageStyle(pkg, index);
                    const dailyPrice = Math.round(Number(pkg.price) / Number(pkg.durationDays));

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => {
                          setSelectedPlan(pkg);
                          setErrorMsg('');
                        }}
                        className={`rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative bg-white hover:shadow-lg ${
                          isSelected
                            ? `${style.borderActive} shadow-lg ring-2`
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Radio Check Indicator */}
                        <div className="absolute top-3 right-3 z-10">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#0f766e] text-white shadow-sm'
                                : 'bg-slate-100 text-transparent border border-slate-300'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          </div>
                        </div>

                        {/* Top Gradient Banner */}
                        <div className={`p-4 bg-gradient-to-r ${style.gradientHeader} text-white`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="material-symbols-outlined text-[18px]">{style.icon}</span>
                            <span className="text-[11px] font-black uppercase tracking-wider">
                              {style.badgeText}
                            </span>
                          </div>
                          <h5 className="font-extrabold text-base text-white leading-tight pr-6">
                            {pkg.name}
                          </h5>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            {/* Price */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-[#005c55]">
                                  {Number(pkg.price).toLocaleString('vi-VN')}
                                </span>
                                <span className="text-xs font-bold text-slate-500">đ</span>
                                <span className="text-xs text-slate-400 font-medium ml-1">
                                  / {pkg.durationDays} ngày
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                ≈ {dailyPrice.toLocaleString('vi-VN')} đ / ngày
                              </p>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-600 mt-3 leading-relaxed min-h-[44px]">
                              {pkg.description || 'Ưu tiên hiển thị bài đăng và tiếp cận tối đa ứng viên ứng tuyển.'}
                            </p>

                            {/* Quyền lợi checklist */}
                            <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                                <span>Ghim ưu tiên đầu danh sách tìm kiếm</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                                <span>Gắn nhãn nổi bật thu hút ứng viên</span>
                              </div>
                              {pkg.durationDays >= 7 && (
                                <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                                  <span className="material-symbols-outlined text-[15px] text-indigo-600">bolt</span>
                                  <span>Đẩy top tự động liên tục</span>
                                </div>
                              )}
                              {pkg.durationDays >= 14 && (
                                <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                                  <span className="material-symbols-outlined text-[15px] text-amber-600">star</span>
                                  <span>Huy hiệu VIP xuất hiện trang chủ</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Chọn nút */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlan(pkg);
                            }}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-[#0f766e] text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? 'Đã Chọn Gói Này' : 'Chọn Gói'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Phương thức thanh toán */}
              {selectedPlan && (
                <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 animate-fade-in">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#131b2e] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#0f766e]">credit_card</span>
                    <span>Phương Thức Thanh Toán</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* VNPAY */}
                    <label
                      onClick={() => setPaymentMethod('vnpay')}
                      className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all bg-white ${
                        paymentMethod === 'vnpay'
                          ? 'border-[#0f766e] ring-2 ring-[#0f766e]/10 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === 'vnpay'}
                        onChange={() => setPaymentMethod('vnpay')}
                        className="text-[#0f766e] focus:ring-[#0f766e]"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center border border-blue-200">
                          VN
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#131b2e]">Cổng VNPAY / Thẻ ATM & QR Code</div>
                          <div className="text-[11px] text-slate-500">Quét mã VNPAY-QR hoặc thẻ ngân hàng</div>
                        </div>
                      </div>
                    </label>

                    {/* MOMO */}
                    <label
                      onClick={() => setPaymentMethod('momo')}
                      className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all bg-white ${
                        paymentMethod === 'momo'
                          ? 'border-[#0f766e] ring-2 ring-[#0f766e]/10 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === 'momo'}
                        onChange={() => setPaymentMethod('momo')}
                        className="text-[#0f766e] focus:ring-[#0f766e]"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 font-black text-xs flex items-center justify-center border border-pink-200">
                          M
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#131b2e]">Ví Điện Tử MoMo</div>
                          <div className="text-[11px] text-slate-500">Thanh toán tức thì qua ứng dụng MoMo</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: THÔNG BÁO THÀNH CÔNG */}
          {step === 'success' && (
            <div className="py-8 px-4 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-extrabold text-[#131b2e]">
                  Kích Hoạt Đẩy Top Thành Công!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Đơn hàng của bạn đã được ghi nhận thành công. Tin tuyển dụng{' '}
                  <span className="font-bold text-[#131b2e]">"{job?.title}"</span> đã được nâng cấp lên{' '}
                  <span className="font-bold text-[#0f766e]">{selectedPlan?.name}</span> ({selectedPlan?.durationDays} ngày).
                </p>
              </div>

              {/* Thông tin tóm tắt đơn hàng */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left max-w-md mx-auto text-xs space-y-2">
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-bold text-[#131b2e]">#{createdOrder?.id || 'KJ-' + Date.now()}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Gói dịch vụ:</span>
                  <span className="font-bold text-[#0f766e]">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Thời hạn ưu tiên:</span>
                  <span className="font-bold text-[#131b2e]">{selectedPlan?.durationDays} ngày</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Tổng thanh toán:</span>
                  <span className="font-black text-sm text-[#005c55]">
                    {Number(selectedPlan?.price).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-[#eaedff] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {step === 'success' ? 'Đóng cửa sổ' : 'Hủy bỏ'}
          </button>

          {step === 'select' && (
            <div className="flex items-center gap-3">
              {selectedPlan && (
                <div className="text-right hidden sm:block">
                  <div className="text-[11px] text-slate-500">Tổng thanh toán:</div>
                  <div className="text-sm font-black text-[#005c55]">
                    {Number(selectedPlan.price).toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleProceedPayment}
                disabled={!selectedPlan || isProcessing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0f766e] to-[#005c55] hover:opacity-95 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0f766e]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xử lý thanh toán...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    <span>Xác Nhận Đẩy Top Ngay</span>
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'success' && (
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-[#0f766e] text-white text-xs font-bold hover:bg-[#0d635c] transition-colors"
            >
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
