import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { registerRecruiter, resendOtp, verifyEmail } from '../../../infrastructure/api';
import { USER } from '../../../config/storageKeys';
import { ROLES } from '../../../domain/constants/roles';

/**
 * Trang Đăng Ký Tài Khoản Nhà Tuyển Dụng (RecruiterRegisterPage.jsx)
 * 
 * Luồng hoạt động chuẩn:
 * 1. Bước 1: Form điền thông tin đăng ký (Email, Mật khẩu, Nhập lại mật khẩu).
 * 2. Bước 2: Khi bấm "Đăng ký", hàm handleRegister gọi API registerRecruiter để
 *    Backend tạo tài khoản và gửi mã xác thực 6 số qua Gmail SMTP. Chuyển sang Bước 2 (Nhập OTP).
 * 3. Bước 3: Khi nhập mã OTP, hàm handleVerifyOtp gọi API verifyEmail để xác thực.
 *    Khi xác thực thành công, tự động lưu phiên làm việc và chuyển hướng sang
 *    trang hoàn tất hồ sơ doanh nghiệp ban đầu: /recruiter/first-company-info (FirstCompanyInfoPage).
 */
export default function RecruiterRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Dữ liệu form đăng ký
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Ẩn/hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Điều khiển bước: 1 = Form đăng ký, 2 = Xác thực OTP
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Trạng thái xử lý
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const otpInputRef = useRef(null);

  // Tự động nhận email hoặc bước xác thực nếu chuyển hướng từ trang Đăng nhập
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    if (location.state?.step) {
      setStep(location.state.step);
      if (location.state.step === 2) {
        setCountdown(60);
      }
    }
  }, [location.state]);

  // Đếm ngược gửi lại OTP (60 giây)
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  /**
   * Đánh giá độ mạnh của mật khẩu
   * Chức năng: Phân tích độ dài, ký tự số, ký tự đặc biệt để hiển thị thanh đo độ an toàn.
   */
  const getPasswordStrength = (val) => {
    if (!val || val.length === 0) {
      return { level: 0, label: 'Chưa nhập', colorClass: 'text-slate-400', barColor: 'bg-slate-200' };
    }
    if (val.length < 8) {
      return { level: 1, label: 'Yếu', colorClass: 'text-rose-500', barColor: 'bg-rose-500' };
    }
    const hasNum = /\d/.test(val);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);
    if (hasNum && hasSpecial && val.length >= 10) {
      return { level: 3, label: 'Rất mạnh', colorClass: 'text-emerald-600', barColor: 'bg-emerald-600' };
    }
    if (hasNum || val.length >= 8) {
      return { level: 2, label: 'Tốt', colorClass: 'text-teal-600', barColor: 'bg-teal-600' };
    }
    return { level: 1, label: 'Yếu', colorClass: 'text-rose-500', barColor: 'bg-rose-500' };
  };

  const strength = getPasswordStrength(password);

  /**
   * BƯỚC 1: Xử lý Đăng ký tài khoản Nhà tuyển dụng và Gửi mã OTP xác minh qua Email
   * Chức năng:
   * 1. Kiểm tra tính hợp lệ của Email (regex) và Mật khẩu (tối thiểu 8 ký tự, khớp với confirmPassword).
   * 2. Gọi hàm registerRecruiter({ email, password }) gửi request POST /api/auth/register/recruiter
   *    để Backend tạo tài khoản role='recruiter' và kích hoạt EmailService gửi mã OTP 6 số qua Gmail SMTP.
   * 3. Nếu tài khoản đã được tạo nhưng chưa xác minh OTP (lỗi 409 Conflict), tự động gọi resendOtp để cấp lại OTP mới.
   * 4. Khi hoàn tất, chuyển state sang Bước 2 (step = 2), kích hoạt đếm ngược 60 giây và focus vào ô nhập OTP.
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Email không đúng định dạng. Ví dụ: hr@congty.com hoặc tenban@gmail.com');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Mật khẩu phải có tối thiểu 8 ký tự để đảm bảo an toàn.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu và Nhập lại mật khẩu không khớp. Vui lòng kiểm tra lại!');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật tuyển dụng.');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      try {
        res = await registerRecruiter({ email: trimmedEmail, password });
      } catch (regErr) {
        const errMsg = (regErr?.message || '').toLowerCase();
        if (errMsg.includes('tồn tại') || errMsg.includes('đã được sử dụng') || errMsg.includes('409') || errMsg.includes('conflict')) {
          res = await resendOtp(trimmedEmail);
        } else {
          throw regErr;
        }
      }

      // Chuyển sang bước xác thực OTP
      setStep(2);
      setCountdown(60);
      setSuccessMessage(
        res?.message || `Mã xác thực 6 số đã được gửi tới email ${trimmedEmail}. Vui lòng kiểm tra hộp thư!`
      );
      setTimeout(() => {
        if (otpInputRef.current) otpInputRef.current.focus();
      }, 100);
    } catch (err) {
      const errMsg = (err?.message || '').toLowerCase();
      if (errMsg.includes('đã được xác minh') || errMsg.includes('đã kích hoạt')) {
        setErrorMessage('Email này đã được kích hoạt tài khoản. Vui lòng chọn Đăng nhập!');
      } else {
        setErrorMessage(err?.message || 'Không thể gửi mã OTP xác nhận. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * BƯỚC 2: Xác thực mã OTP và chuyển hướng tới FirstCompanyInfoPage
   * Chức năng:
   * 1. Kiểm tra mã OTP nhập đủ 6 chữ số.
   * 2. Gọi hàm verifyEmail(trimmedEmail, trimmedOtp) (POST /api/auth/verify-email) để Backend
   *    kiểm tra token_hash, đánh dấu emailVerified=true và cấp JWT cookie access_token.
   * 3. Khởi tạo đối tượng phiên làm việc cơ bản vào localStorage ('kiemjob_user') với
   *    các trường công ty ban đầu là null (company_name: null, companyId: null, profileCompleted: false).
   * 4. Bắn sự kiện 'authChange' để cập nhật trạng thái đăng nhập toàn ứng dụng.
   * 5. Tự động điều hướng người dùng tới trang Hoàn tất thông tin doanh nghiệp ban đầu
   *    (navigate('/recruiter/first-company-info')).
   */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setErrorMessage('Vui lòng nhập đúng 6 chữ số mã xác thực OTP.');
      return;
    }

    setSubmitting(true);
    try {
      const account = await verifyEmail(trimmedEmail, trimmedOtp);

      // Sau khi đăng ký xong, tất cả thông tin liên quan đến companies là NULL
      const user = {
        id: account?.id || Date.now(),
        email: account?.email || trimmedEmail,
        role: ROLES.RECRUITER,
        fullName: null,
        company_name: null,
        companyId: null,
        company: null,
        companyType: null,
        logo: null,
        banner: null,
        companyEmail: null,
        companyPhone: null,
        companyDescription: null,
        provinceId: null,
        provinceName: null,
        addressDetail: null,
        taxCode: null,
        status: null,
        profileCompleted: false,
      };

      localStorage.setItem(USER, JSON.stringify(user));
      window.dispatchEvent(new Event('authChange'));

      setSuccessMessage('Xác thực tài khoản thành công! Đang chuyển đến trang hoàn tất thông tin doanh nghiệp ban đầu...');

      // Chuyển hướng tới trang FirstCompanyInfoPage để điền thông tin công ty
      setTimeout(() => {
        navigate('/recruiter/first-company-info');
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Mã xác thực OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Gửi lại mã OTP qua Email
   * Chức năng:
   * 1. Kiểm tra trạng thái đếm ngược 60s để tránh spam request.
   * 2. Gọi hàm resendOtp(trimmedEmail) (POST /api/auth/resend-otp) để Backend tạo mã OTP mới
   *    và gửi lại tới email qua Gmail SMTP.
   * 3. Reset thời gian đếm ngược 60 giây và hiển thị thông báo thành công cho người dùng.
   */
  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setErrorMessage('');
    setResending(true);
    const trimmedEmail = email.trim().toLowerCase();
    try {
      const res = await resendOtp(trimmedEmail);
      setSuccessMessage(res?.message || `Đã gửi lại mã xác thực mới tới ${trimmedEmail}. Vui lòng kiểm tra hộp thư!`);
      setCountdown(60);
    } catch (err) {
      setErrorMessage(err?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-[#faf8ff] selection:bg-[#005c55] selection:text-white">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100 grid grid-cols-1 lg:grid-cols-12 min-h-[700px]">
          {/* Cột trái: Giới thiệu quyền lợi nhà tuyển dụng */}
          <section className="lg:col-span-5 bg-gradient-to-br from-[#004e48] via-[#005c55] to-[#016f67] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-teal-300/10 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center space-x-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 mb-6 shadow-sm">
                <span className="text-sm">💼</span>
                <span className="text-xs font-semibold tracking-wide text-white">
                  Dành riêng cho Nhà tuyển dụng &amp; Doanh nghiệp
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-4">
                Bứt phá tuyển dụng nhân tài cùng <span className="text-emerald-300">KiemJob Recruiter</span>
              </h1>
              <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed mb-8">
                Tiếp cận hơn 3.500.000+ ứng viên chất lượng cao, tối ưu 60% thời gian tuyển dụng và chi phí.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-3.5 bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-300 mt-0.5">
                    <i className="fa-solid fa-wand-magic-sparkles text-lg" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-snug">
                      Đăng tin nhanh chóng &amp; gợi ý ứng viên AI
                    </h2>
                    <p className="text-xs text-emerald-100/80 mt-0.5 leading-relaxed">
                      Hệ thống tự động lọc CV theo kỹ năng, mức lương và kinh nghiệm chuẩn xác.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-300 mt-0.5">
                    <i className="fa-solid fa-gift text-lg" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-snug">
                      Tặng ngay 01 Tin Ưu Tiên &amp; 30 lượt xem CV
                    </h2>
                    <p className="text-xs text-emerald-100/80 mt-0.5 leading-relaxed">
                      Quà tặng kích hoạt tài khoản doanh nghiệp mới hoàn toàn miễn phí.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-300 mt-0.5">
                    <i className="fa-solid fa-shield-halved text-lg" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-snug">
                      Xác thực OTP chính chủ an toàn
                    </h2>
                    <p className="text-xs text-emerald-100/80 mt-0.5 leading-relaxed">
                      Đảm bảo thông tin doanh nghiệp được bảo mật tuyệt đối qua hòm thư công ty.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-6 border-t border-white/15">
              <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-chart-line text-sm" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold">Thống kê ấn tượng</div>
                  <p className="text-xs font-medium text-white">98% Doanh nghiệp tìm được nhân sự ưng ý trong 14 ngày</p>
                </div>
              </div>
            </div>
          </section>

          {/* Cột phải: Form Đăng Ký hoặc Màn hình Xác thực OTP */}
          <section className="lg:col-span-7 bg-white p-8 sm:p-12 flex flex-col justify-between">
            <div className="max-w-lg mx-auto w-full">
              {/* Header Titles */}
              <div className="mb-6">
                <div className="inline-flex items-center text-xs font-bold text-[#005c55] bg-[#e6f7f5] px-3 py-1 rounded-full mb-2">
                  <i className="fa-solid fa-building mr-1.5" />
                  {step === 1 ? 'Cổng thông tin Doanh Nghiệp' : 'Bước 2: Kích hoạt tài khoản'}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {step === 1 ? 'Đăng Ký Tuyển Dụng' : 'Xác Thực Email Doanh Nghiệp'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {step === 1
                    ? 'Bắt đầu đăng tin và tìm kiếm nhân tài cho doanh nghiệp của bạn'
                    : `Nhập mã 6 chữ số chúng tôi đã gửi tới ${email}`}
                </p>
              </div>

              {/* Thông báo lỗi */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                  <i className="fa-solid fa-circle-exclamation text-rose-600 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Thông báo thành công */}
              {successMessage && (
                <div className="mb-5 p-3.5 rounded-2xl bg-[#e6f7f5] border border-[#97f5cc] text-[#00513a] text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                  <i className="fa-solid fa-circle-check text-[#005c55] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">{successMessage}</p>
                    {step === 2 && (
                      <p className="text-[11px] text-[#006c4e] mt-0.5">
                        💡 Hãy kiểm tra cả hộp thư <strong>Spam (Thư rác)</strong> nếu chưa thấy email.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* BƯỚC 1: FORM ĐIỀN THÔNG TIN DOANH NGHIỆP (TINH GỌN, CHUẨN IMPECCABLE)   */}
              {/* ========================================================================= */}
              {step === 1 && (
                <form className="space-y-4" onSubmit={handleRegister}>
                  {/* Trường 1: Email doanh nghiệp / Gmail */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="work_email">
                      Email doanh nghiệp / Gmail <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <i className="fa-regular fa-envelope text-sm" />
                      </div>
                      <input
                        className="block w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] transition-all placeholder:text-slate-400"
                        id="work_email"
                        placeholder="hr@congty.com hoặc tenban@gmail.com"
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Hệ thống sẽ gửi mã xác thực OTP 6 số đến email này sau khi bấm Đăng ký.
                    </span>
                  </div>

                  {/* Trường 3: Mật khẩu */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-700" htmlFor="password">
                        Mật khẩu <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Độ mạnh: <span className={`font-semibold ${strength.colorClass}`}>{strength.label}</span>
                      </span>
                    </div>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <i className="fa-solid fa-lock text-sm" />
                      </div>
                      <input
                        className="block w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] transition-all placeholder:text-slate-400"
                        id="password"
                        placeholder="Tối thiểu 8 ký tự"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        aria-label="Hiện/ẩn mật khẩu"
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                      </button>
                    </div>
                    {/* Thanh độ mạnh mật khẩu */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <div className={`h-1.5 rounded-full transition-colors ${strength.level >= 1 ? strength.barColor : 'bg-slate-200'}`} />
                      <div className={`h-1.5 rounded-full transition-colors ${strength.level >= 2 ? strength.barColor : 'bg-slate-200'}`} />
                      <div className={`h-1.5 rounded-full transition-colors ${strength.level >= 3 ? strength.barColor : 'bg-slate-200'}`} />
                    </div>
                  </div>

                  {/* Trường 4: Nhập lại mật khẩu */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="confirm_password">
                      Nhập lại mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <i className="fa-solid fa-rotate-left text-sm" />
                      </div>
                      <input
                        className="block w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] transition-all placeholder:text-slate-400"
                        id="confirm_password"
                        placeholder="Nhập lại mật khẩu vừa đặt"
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        aria-label="Hiện/ẩn xác nhận mật khẩu"
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <span className="text-[11px] text-rose-600 mt-1 block font-semibold">
                        Mật khẩu xác nhận chưa khớp!
                      </span>
                    )}
                  </div>

                  {/* Checkbox Điều khoản */}
                  <div className="pt-1">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-[#005c55] focus:ring-[#005c55] w-4 h-4 cursor-pointer accent-[#005c55]"
                        required
                        type="checkbox"
                      />
                      <span className="text-xs text-slate-600 leading-relaxed">
                        Tôi đồng ý với{' '}
                        <a className="text-[#005c55] font-bold hover:underline" href="#terms" onClick={(e) => e.preventDefault()}>
                          Điều khoản dịch vụ
                        </a>{' '}
                        và{' '}
                        <a className="text-[#005c55] font-bold hover:underline" href="#privacy" onClick={(e) => e.preventDefault()}>
                          Chính sách bảo mật tuyển dụng
                        </a>{' '}
                        của KiemJob.
                      </span>
                    </label>
                  </div>

                  {/* Nút Đăng Ký */}
                  <button
                    className="w-full mt-4 bg-[#005c55] hover:bg-[#007952] active:scale-95 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#005c55]/25 hover:shadow-[#005c55]/35 transition-all duration-200 flex items-center justify-center space-x-2 group focus:ring-4 focus:ring-[#005c55]/30 focus:outline-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang tạo tài khoản &amp; gửi mã OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng Ký Tài Khoản Nhà Tuyển Dụng</span>
                        <i className="fa-solid fa-arrow-right text-sm group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ========================================================================= */}
              {/* BƯỚC 2: MÀN HÌNH NHẬN MÃ OTP (XUẤT HIỆN SAU KHI ĐĂNG KÝ XONG)              */}
              {/* ========================================================================= */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in duration-200">
                  <div className="p-6 bg-[#f0fdf9] border-2 border-[#005c55]/25 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#005c55] flex items-center gap-1.5 uppercase tracking-wider">
                        <i className="fa-solid fa-shield-halved text-sm" />
                        Nhập mã xác thực 6 số
                      </span>
                      <span className="text-[10px] text-[#006c4e] font-bold bg-[#97f5cc]/60 px-2.5 py-0.5 rounded-full">
                        Hiệu lực 10 phút
                      </span>
                    </div>

                    {/* Ô nhập OTP to rõ, căn giữa chuẩn Impeccable */}
                    <div className="relative">
                      <input
                        ref={otpInputRef}
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        placeholder=""
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full h-14 rounded-2xl bg-white text-center text-2xl sm:text-3xl font-extrabold tracking-[0.45em] text-[#005c55] outline-none border-2 border-[#97f5cc] focus:border-[#005c55] focus:ring-4 focus:ring-[#005c55]/15 shadow-inner transition-all font-mono"
                      />
                    </div>

                    {/* Thao tác phụ: Sửa thông tin & Gửi lại mã */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setErrorMessage('');
                          setSuccessMessage('');
                        }}
                        className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <i className="fa-solid fa-arrow-left text-xs" />
                        <span>Sửa thông tin</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={countdown > 0 || resending}
                        className={`font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          countdown > 0 || resending
                            ? 'text-slate-400 cursor-not-allowed'
                            : 'text-[#005c55] hover:text-[#007952]'
                        }`}
                      >
                        <i className={`fa-solid fa-rotate ${resending ? 'animate-spin' : ''} text-xs`} />
                        <span>
                          {resending
                            ? 'Đang gửi lại...'
                            : countdown > 0
                            ? `Gửi lại sau (${countdown}s)`
                            : 'Gửi lại mã OTP'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Nút Xác thực & Kích hoạt tài khoản */}
                  <button
                    type="submit"
                    disabled={submitting || otp.trim().length !== 6}
                    className={`w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      submitting || otp.trim().length !== 6
                        ? 'bg-[#005c55]/50 cursor-not-allowed'
                        : 'bg-[#005c55] hover:bg-[#007952] active:scale-95 shadow-[#005c55]/25'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang kích hoạt tài khoản...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-circle-check text-base" />
                        <span>Xác Thực &amp; Kích Hoạt Tài Khoản</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Chuyển sang Đăng nhập */}
              <div className="text-center mt-5">
                <p className="text-xs text-slate-600">
                  Đã có tài khoản Nhà tuyển dụng?
                  <Link to="/recruiter/login" className="text-[#005c55] font-bold hover:underline ml-1">
                    Đăng nhập ngay
                  </Link>
                </p>
              </div>
            </div>

            {/* Banner hỗ trợ */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center">
              <div className="inline-flex items-center space-x-2 bg-slate-50 text-slate-600 px-4 py-2 rounded-full border border-slate-200/80 text-xs font-medium">
                <i className="fa-solid fa-headset text-[#005c55]" />
                <span>Gặp sự cố khi đăng ký? Gọi Hotline B2B:</span>
                <a className="font-extrabold text-slate-900 hover:text-[#005c55] transition-colors" href="tel:19006868">
                  1900 6868 (Nhánh 2)
                </a>
              </div>
            </div>
          </section>
        </div>
    </div>
  );
}
