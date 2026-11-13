import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { featurePackageApi } from '../../../infrastructure/api';

/**
 * PaymentResultPage - Trang hiển thị thông báo kết quả thanh toán dịch vụ (VNPAY)
 * Cung cấp hóa đơn điện tử, thông tin gói nổi bật, tin tuyển dụng áp dụng,
 * chức năng in biên nhận, và đếm ngược chuyển tiếp tự động.
 */
export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Đọc thông số từ URL trả về của VNPAY
  const responseCode = searchParams.get('vnp_ResponseCode');
  const txnRef = searchParams.get('vnp_TxnRef');
  const transactionNo = searchParams.get('vnp_TransactionNo');
  const isValidSignature = searchParams.get('valid') === 'true';
  const rawAmount = searchParams.get('vnp_Amount');
  const bankCode = searchParams.get('vnp_BankCode');
  const payDateRaw = searchParams.get('vnp_PayDate');
  const orderInfoRaw = searchParams.get('vnp_OrderInfo');
  const cardType = searchParams.get('vnp_CardType');

  // Kiểm tra thành công
  // Hỗ trợ cả trường hợp redirect thật từ VNPAY lẫn trường hợp vào route /payment/success
  const isDirectSuccessRoute = location.pathname.includes('/payment/success') || searchParams.get('status') === 'success';
  const isSuccess = isDirectSuccessRoute || (isValidSignature && responseCode === '00');

  // State cho thông tin đơn hàng chi tiết từ backend (nếu có token)
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Đếm ngược tự động chuyển trang (15 giây)
  const [countdown, setCountdown] = useState(15);
  const [isPaused, setIsPaused] = useState(false);

  // Lấy ID đơn hàng (chuỗi trước dấu '_' nếu có timestamp)
  const orderId = useMemo(() => {
    if (!txnRef) return null;
    return txnRef.includes('_') ? txnRef.split('_')[0] : txnRef;
  }, [txnRef]);

  // Giải mã số tiền thanh toán (VNPAY nhân 100)
  const amountNumber = useMemo(() => {
    if (orderDetail?.amount) return Number(orderDetail.amount);
    if (rawAmount) {
      const val = Number(rawAmount);
      return val > 0 ? val / 100 : 0;
    }
    return null;
  }, [rawAmount, orderDetail]);

  // Định dạng ngày thanh toán (từ VNPAY: yyyyMMddHHmmss hoặc từ backend)
  const formattedPayDate = useMemo(() => {
    if (orderDetail?.paidAt) {
      try {
        const d = new Date(orderDetail.paidAt);
        return d.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch {
        // fallback
      }
    }
    if (payDateRaw && payDateRaw.length === 14) {
      const year = payDateRaw.substring(0, 4);
      const month = payDateRaw.substring(4, 6);
      const day = payDateRaw.substring(6, 8);
      const hour = payDateRaw.substring(8, 10);
      const min = payDateRaw.substring(10, 12);
      const sec = payDateRaw.substring(12, 14);
      return `${hour}:${min}:${sec} - ${day}/${month}/${year}`;
    }
    return new Date().toLocaleString('vi-VN');
  }, [payDateRaw, orderDetail]);

  // Giải mã nội dung đơn hàng
  const decodedOrderInfo = useMemo(() => {
    if (orderInfoRaw) {
      try {
        return decodeURIComponent(orderInfoRaw.replace(/\+/g, ' '));
      } catch {
        return orderInfoRaw;
      }
    }
    return null;
  }, [orderInfoRaw]);

  // Tải chi tiết đơn hàng từ backend nếu có mã đơn
  useEffect(() => {
    if (orderId) {
      setLoadingOrder(true);
      featurePackageApi
        .getMyOrder(orderId)
        .then((res) => {
          setOrderDetail(res);
        })
        .catch((err) => {
          console.warn('Không thể tải chi tiết đơn hàng từ API (có thể phiên đăng nhập chưa có):', err);
        })
        .finally(() => {
          setLoadingOrder(false);
        });
    }
  }, [orderId]);

  // Bộ đếm ngược tự động chuyển trang khi thành công
  useEffect(() => {
    if (!isSuccess || isPaused) return;

    if (countdown <= 0) {
      navigate('/recruiter/orders');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isSuccess, isPaused, navigate]);

  // Hàm in biên lai
  const handlePrint = () => {
    window.print();
  };

  // Sao chép mã đơn hàng
  const handleCopyOrderId = () => {
    const code = orderId || txnRef || 'KIEMJOB-VIP';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Thử thanh toán lại khi thất bại
  const handleRetryPayment = async () => {
    if (!orderId) {
      navigate('/recruiter/jobs');
      return;
    }
    setRetrying(true);
    try {
      const res = await featurePackageApi.createVnPayPayment(orderId);
      const url = res.paymentUrl || res.data?.paymentUrl;
      if (url) {
        window.location.href = url;
      } else {
        alert('Không thể tạo liên kết thanh toán mới. Vui lòng thử lại sau.');
      }
    } catch (err) {
      console.error('Lỗi thanh toán lại:', err);
      alert('Không thể kết nối cổng thanh toán. Vui lòng quay lại danh sách đơn hàng.');
      navigate('/recruiter/orders');
    } finally {
      setRetrying(false);
    }
  };

  // Map mã lỗi VNPAY sang tiếng Việt chi tiết
  const getErrorMessage = (code) => {
    const messages = {
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới gian lận hoặc bất thường).',
      '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
      '11': 'Đã hết thời hạn chờ thanh toán. Quý khách vui lòng thực hiện lại giao dịch.',
      '12': 'Thẻ/Tài khoản của quý khách hiện đang bị khóa.',
      '13': 'Quý khách nhập sai mật khẩu xác thực OTP. Vui lòng thử lại.',
      '24': 'Giao dịch đã bị hủy bởi người dùng.',
      '51': 'Tài khoản của quý khách không đủ số dư để thực hiện thanh toán.',
      '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày quy định.',
      '75': 'Ngân hàng thanh toán đang tạm thời bảo trì hệ thống.',
      '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
      '97': 'Chữ ký kiểm tra tính toàn vẹn không hợp lệ (Sai checksum).',
      '99': 'Lỗi không xác định từ cổng thanh toán. Giao dịch chưa được hoàn tất.',
    };
    return messages[code] || 'Giao dịch chưa hoàn tất hoặc bị hủy bỏ. Vui lòng kiểm tra lại.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf9] via-[#faf8ff] to-[#f4f7fb] text-[#131b2e] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* CSS In ấn hóa đơn */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Header thanh điều hướng thương hiệu */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 no-print">
        <button
          onClick={() => navigate('/recruiter')}
          className="flex items-center gap-2 text-slate-600 hover:text-[#005c55] font-bold text-sm transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center group-hover:border-[#005c55] group-hover:bg-[#005c55]/5 transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </div>
          <span>Trang Quản Trị Nhà Tuyển Dụng</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cổng Thanh Toán KiemJob Secure</span>
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="w-full max-w-3xl mx-auto my-auto print-container">
        {/* Card thông báo kết quả */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-[#eaedff] overflow-hidden">
          {/* ===================== TRƯỜNG HỢP: THANH TOÁN THÀNH CÔNG ===================== */}
          {isSuccess ? (
            <>
              {/* Banner Chúc Mừng Thành Công */}
              <div className="relative px-6 py-10 sm:px-10 text-center bg-gradient-to-br from-[#005c55] via-[#0f766e] to-[#047857] text-white overflow-hidden">
                {/* Họa tiết trang trí nền */}
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-emerald-300/10 blur-2xl pointer-events-none" />

                {/* Huy hiệu Checkmark rực rỡ */}
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping opacity-75" />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center mx-auto shadow-2xl">
                    <span className="material-symbols-outlined text-[48px] sm:text-[56px] text-[#97f5cc] drop-shadow-md">
                      check_circle
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white text-xs font-bold uppercase tracking-wider mb-2 border border-white/20">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Giao Dịch Đã Hoàn Tất</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                  Thanh Toán Thành Công!
                </h1>

                <p className="text-xs sm:text-sm text-emerald-100 max-w-md mx-auto leading-relaxed">
                  Cảm ơn bạn! Đơn hàng đã được xác nhận và quyền lợi nổi bật đã được kích hoạt trực tiếp cho tin tuyển dụng của bạn.
                </p>

                {/* Hiển thị số tiền nổi bật */}
                <div className="mt-6 pt-5 border-t border-white/15 flex flex-col items-center justify-center">
                  <span className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">
                    Tổng số tiền đã thanh toán
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
                    {amountNumber !== null
                      ? `${amountNumber.toLocaleString('vi-VN')} VNĐ`
                      : 'Đã thanh toán đầy đủ'}
                  </div>
                </div>
              </div>

              {/* Thông tin chi tiết biên lai & tin tuyển dụng */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Hộp tóm tắt quyền lợi đã kích hoạt */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                      <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-extrabold text-[#005c55] flex items-center gap-2">
                        <span>Gói Dịch Vụ Đã Được Kích Hoạt Tức Thì</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          VIP
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Tin tuyển dụng của bạn giờ đây đã được gắn nhãn nổi bật và ưu tiên xuất hiện tại các vị trí đầu tiên của trang chủ và trang tìm việc, giúp tăng tới <strong className="text-[#005c55]">gấp 3 lần lượt ứng tuyển</strong> từ ứng viên chất lượng cao.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hóa đơn điện tử chi tiết */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#005c55] text-[20px]">
                        receipt_long
                      </span>
                      <h3 className="text-sm font-extrabold text-[#131b2e]">
                        Chi Tiết Hóa Đơn & Giao Dịch
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Biên nhận điện tử
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Mã đơn hàng */}
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 sm:border-b-0">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">tag</span>
                        Mã đơn hàng:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#131b2e]">#{orderId || txnRef || '---'}</span>
                        <button
                          onClick={handleCopyOrderId}
                          title="Sao chép mã đơn hàng"
                          className="text-slate-400 hover:text-[#005c55] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {copied ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Mã giao dịch VNPAY */}
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 sm:border-b-0">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                        Mã GD VNPAY:
                      </span>
                      <span className="font-bold text-[#131b2e]">
                        {transactionNo || '---'}
                      </span>
                    </div>

                    {/* Gói dịch vụ đã mua */}
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 sm:border-b-0">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">stars</span>
                        Gói dịch vụ:
                      </span>
                      <span className="font-bold text-[#005c55]">
                        {orderDetail?.planName || decodedOrderInfo || 'Gói Đẩy Top Nổi Bật'}
                      </span>
                    </div>

                    {/* Phương thức thanh toán & Ngân hàng */}
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 sm:border-b-0">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">account_balance</span>
                        Cổng / Ngân hàng:
                      </span>
                      <span className="font-bold text-[#131b2e] flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          VNPAY
                        </span>
                        <span>{bankCode || cardType || 'ATM / QR'}</span>
                      </span>
                    </div>

                    {/* Thời gian thanh toán */}
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 sm:border-b-0">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        Thời gian GD:
                      </span>
                      <span className="font-bold text-[#131b2e]">{formattedPayDate}</span>
                    </div>

                    {/* Trạng thái xác thực */}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">security</span>
                        Xác thực số:
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">
                          verified_user
                        </span>
                        Chữ ký hợp lệ (SHA512)
                      </span>
                    </div>
                  </div>

                  {/* Tin tuyển dụng áp dụng (nếu có thông tin) */}
                  {(orderDetail?.jobTitle || orderDetail?.jobId) && (
                    <div className="pt-3 mt-3 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 p-4 rounded-b-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">work</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            Tin tuyển dụng áp dụng:
                          </span>
                          <span className="text-xs font-bold text-[#131b2e]">
                            {orderDetail?.jobTitle || `Tin tuyển dụng #${orderDetail?.jobId}`}
                          </span>
                        </div>
                      </div>

                      {orderDetail?.jobId && (
                        <button
                          onClick={() => navigate(`/recruiter/jobs/${orderDetail.jobId}`)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#005c55] text-xs font-bold text-[#005c55] hover:bg-[#005c55]/5 transition-colors cursor-pointer self-start sm:self-center flex items-center gap-1 shadow-2xs"
                        >
                          <span>Xem tin này</span>
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Thanh đếm ngược tự động chuyển hướng */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs no-print">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="material-symbols-outlined text-[18px] text-[#005c55] animate-spin">
                      progress_activity
                    </span>
                    <span>
                      Tự động chuyển về trang đơn hàng sau{' '}
                      <strong className="text-[#005c55] font-extrabold">{countdown}s</strong>...
                    </span>
                  </div>

                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {isPaused ? 'Tiếp tục đếm' : 'Tạm dừng'}
                  </button>
                </div>

                {/* Nút hành động */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 no-print">
                  <button
                    onClick={() => navigate('/recruiter/orders')}
                    className="w-full sm:flex-1 px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#005c55] to-[#0f766e] hover:opacity-95 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#005c55]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    <span>Xem Quản Lý Đơn Hàng</span>
                  </button>

                  <button
                    onClick={() => navigate('/recruiter/jobs')}
                    className="w-full sm:flex-1 px-5 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">list_alt</span>
                    <span>Danh Sách Tin Tuyển Dụng</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    title="In biên lai thanh toán"
                    className="w-full sm:w-auto px-4 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    <span className="sm:hidden">In biên lai</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ===================== TRƯỜNG HỢP: THANH TOÁN THẤT BẠI / HỦY ===================== */
            <>
              {/* Header Thất Bại */}
              <div className="relative px-6 py-10 sm:px-10 text-center bg-gradient-to-br from-red-600 via-rose-600 to-rose-700 text-white overflow-hidden">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <span className="material-symbols-outlined text-[48px] sm:text-[56px] text-white">
                    error
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white text-xs font-bold uppercase tracking-wider mb-2 border border-white/20">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  <span>Giao Dịch Chưa Hoàn Tất</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                  Thanh Toán Chưa Thành Công
                </h1>

                <p className="text-xs sm:text-sm text-red-100 max-w-md mx-auto leading-relaxed">
                  {getErrorMessage(responseCode)}
                </p>
              </div>

              {/* Chi tiết lỗi & Hướng xử lý */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Mã đơn hàng:</span>
                    <span className="font-bold text-[#131b2e]">#{orderId || txnRef || '---'}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Mã phản hồi từ VNPAY:</span>
                    <span className="font-bold text-red-600">
                      {responseCode ? `Mã lỗi [${responseCode}]` : 'Không có phản hồi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-500">Trạng thái xác thực chữ ký:</span>
                    <span
                      className={`font-bold ${
                        isValidSignature ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {isValidSignature ? 'Chữ ký hợp lệ' : 'Chữ ký không khớp'}
                    </span>
                  </div>
                </div>

                {/* Hộp trợ giúp */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[22px] text-amber-600 shrink-0 mt-0.5">
                    support_agent
                  </span>
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-bold">Bạn gặp vấn đề khi thanh toán?</p>
                    <p className="text-amber-800 leading-relaxed">
                      Nếu tiền trong tài khoản của bạn đã bị trừ nhưng hệ thống hiển thị chưa thành công, xin đừng lo lắng. Đơn hàng sẽ tự động đối soát qua IPN trong vòng 5-10 phút, hoặc bạn có thể liên hệ tổng đài hỗ trợ kèm mã đơn hàng{' '}
                      <strong>#{orderId || txnRef}</strong>.
                    </p>
                    <p className="pt-1 text-[11px] font-semibold text-amber-900">
                      Hotline: <span className="underline">1900 6868</span> • Email:{' '}
                      <span className="underline">support@kiemjob.com</span>
                    </p>
                  </div>
                </div>

                {/* Nút hành động khi thất bại */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleRetryPayment}
                    disabled={retrying}
                    className="w-full sm:flex-1 px-5 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {retrying ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang kết nối lại...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">replay</span>
                        <span>Thử Thanh Toán Lại</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => navigate('/recruiter/orders')}
                    className="w-full sm:flex-1 px-5 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    <span>Quản Lý Đơn Hàng</span>
                  </button>

                  <button
                    onClick={() => navigate('/recruiter/jobs')}
                    className="w-full sm:w-auto px-4 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Về Quản Lý Tin</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer bảo mật & đối tác */}
        <div className="mt-8 text-center text-xs text-slate-400 space-y-1 no-print">
          <p className="flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">lock</span>
            <span>Giao dịch được bảo mật bởi VNPAY Payment Gateway & PCI-DSS 256-bit</span>
          </p>
          <p>© {new Date().getFullYear()} KiemJob Platform. Mọi quyền được bảo lưu.</p>
        </div>
      </main>
    </div>
  );
}
