import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerCandidate, verifyEmail, resendOtp, loginWithGoogle } from '../../../infrastructure/api';
import { triggerGoogleLogin } from '../../../infrastructure/utils/googleAuth';
import { setCookie } from '../../../infrastructure/utils/cookieUtils';
import { USER } from '../../../config/storageKeys';
import { ROLES } from '../../../domain/constants/roles';

/**
 * Trang Đăng Ký Tài Khoản Ứng Viên (RegisterPage.jsx)
 * 
 * Luồng chuẩn Impeccable:
 * 1. Bước 1: Điền thông tin đăng ký tinh gọn (Gmail, Mật khẩu, Nhập lại mật khẩu).
 * 2. Bước 2: Khi bấm "Đăng ký tài khoản", hệ thống gửi mã OTP tới Gmail và chuyển
 *    sang màn hình Xác thực OTP tối giản, tập trung.
 * 3. Sau khi xác thực thành công, tự động đăng nhập và chuyển hướng sang trang
 *    Thông tin cá nhân (/profile) để cập nhật thông tin chi tiết.
 */
export default function RegisterPage() {
  // Dữ liệu form đăng ký
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

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
  const navigate = useNavigate();

  // Đếm ngược thời gian gửi lại OTP (60 giây)
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Đánh giá độ mạnh mật khẩu
  const getStrength = (pwd) => {
    if (!pwd) return { label: 'Chưa nhập', level: 0, color: 'bg-slate-200' };
    if (pwd.length < 8) return { label: 'Yếu (dưới 8 ký tự)', level: 1, color: 'bg-rose-500' };
    const hasNum = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    if (hasNum && hasSpecial && pwd.length >= 10) {
      return { label: 'Rất mạnh', level: 3, color: 'bg-emerald-600' };
    }
    if (hasNum || pwd.length >= 8) {
      return { label: 'Tốt', level: 2, color: 'bg-teal-600' };
    }
    return { label: 'Yếu', level: 1, color: 'bg-rose-500' };
  };

  const strength = getStrength(password);

  /**
   * BƯỚC 1: Xử lý Đăng ký tài khoản -> Gửi OTP -> Chuyển sang Bước 2
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Kiểm tra Email
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Vui lòng nhập địa chỉ Gmail hợp lệ (Ví dụ: tenban@gmail.com)');
      return;
    }

    // 2. Kiểm tra Mật khẩu
    if (!password || password.length < 8) {
      setErrorMessage('Mật khẩu phải có tối thiểu 8 ký tự để đảm bảo an toàn.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!');
      return;
    }

    // 3. Kiểm tra Điều khoản
    if (!agreeTerms) {
      setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.');
      return;
    }

    setSubmitting(true);
    try {
      // Gọi API Backend: POST /api/auth/register/candidate
      let res;
      try {
        res = await registerCandidate({
          email: cleanEmail,
          password: password,
        });
      } catch (regErr) {
        const rawErrMsg = regErr?.message || '';
        const errMsg = rawErrMsg.toLowerCase();

        // Nếu email thuộc tài khoản Nhà tuyển dụng -> Dừng ngay, ném lỗi rõ ràng
        if (errMsg.includes('nhà tuyển dụng') || errMsg.includes('recruiter')) {
          throw new Error('Email này đã được đăng ký tài khoản Nhà tuyển dụng. Vui lòng chuyển sang cổng dành cho Nhà tuyển dụng.');
        }

        // Nếu tài khoản ứng viên đã tồn tại nhưng chưa xác minh OTP -> Gửi lại OTP
        if (errMsg.includes('tồn tại') || errMsg.includes('409') || errMsg.includes('conflict') || errMsg.includes('đã được sử dụng')) {
          res = await resendOtp(cleanEmail);
        } else {
          throw regErr;
        }
      }

      // Đăng ký thành công -> Gửi OTP -> Chuyển sang màn hình xác thực OTP
      setStep(2);
      setCountdown(60);
      setSuccessMessage(
        res?.message || `Mã xác thực 6 số đã được gửi tới ${cleanEmail}. Vui lòng kiểm tra hộp thư!`
      );
      setTimeout(() => {
        if (otpInputRef.current) otpInputRef.current.focus();
      }, 100);
    } catch (err) {
      const rawErrMsg = err?.message || '';
      const errMsg = rawErrMsg.toLowerCase();
      if (errMsg.includes('nhà tuyển dụng') || errMsg.includes('recruiter')) {
        setErrorMessage('Email này đã được đăng ký tài khoản Nhà tuyển dụng. Vui lòng chuyển sang cổng dành cho Nhà tuyển dụng.');
      } else if (errMsg.includes('đã được xác minh') || errMsg.includes('đã kích hoạt') || errMsg.includes('đã được sử dụng')) {
        setErrorMessage('Email này đã có tài khoản trên hệ thống. Vui lòng chọn Đăng nhập!');
      } else {
        setErrorMessage(rawErrMsg || 'Không thể đăng ký tài khoản. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Đăng ký nhanh với Google: Bỏ qua bước nhập mật khẩu và mã OTP
   */
  const handleGoogleRegister = () => {
    setErrorMessage('');
    triggerGoogleLogin({
      role: 'candidate',
      onSuccess: async (payload) => {
        setSubmitting(true);
        try {
          const data = await loginWithGoogle(payload);
          const account = data.account || data || {};

          let user = {
            id: account.id,
            email: account.email || '',
            phone: account.phone || '',
            role: account.role || ROLES.CANDIDATE,
            fullName: account.fullName || account.fullname || (account.email ? account.email.split('@')[0] : 'Ứng viên'),
            fullname: account.fullName || account.fullname || (account.email ? account.email.split('@')[0] : 'Ứng viên'),
            title: account.headline || '',
            avatar: account.avatarUrl || ''
          };

          setCookie('logged_in', 'true', 14);
          localStorage.setItem(USER, JSON.stringify(user));
          window.dispatchEvent(new Event('authChange'));

          if (account.role === ROLES.ADMIN) {
            navigate('/admin');
            return;
          }

          navigate('/');
        } catch (err) {
          setErrorMessage(err.message || 'Đăng ký nhanh với Google thất bại. Vui lòng thử lại!');
        } finally {
          setSubmitting(false);
        }
      },
      onError: (err) => {
        setErrorMessage(err.message || 'Không thể mở cửa sổ đăng ký Google.');
      }
    });
  };

  /**
   * BƯỚC 2: Xác thực mã OTP và hoàn tất đăng nhập
   */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage('Vui lòng nhập đúng 6 chữ số mã xác thực OTP.');
      return;
    }

    setSubmitting(true);
    try {
      // Gọi API Backend: POST /api/auth/verify-email
      const accountData = await verifyEmail(cleanEmail, cleanOtp);

      // Kiểm tra vai trò tài khoản: Cổng này chỉ dành cho Ứng viên!
      if (accountData?.role === ROLES.RECRUITER) {
        localStorage.removeItem(USER);
        throw new Error('Email này thuộc tài khoản Nhà tuyển dụng. Vui lòng chuyển sang cổng dành cho Nhà tuyển dụng.');
      }

      // Lưu trữ phiên đăng nhập vào hệ thống
      const atIdx = cleanEmail.indexOf('@');
      const defaultFullName = accountData?.fullname || accountData?.fullName || (atIdx > 0 ? cleanEmail.slice(0, atIdx).trim() : cleanEmail.trim()) || 'Ứng viên';

      const user = {
        id: accountData?.id || Date.now(),
        email: cleanEmail,
        role: ROLES.CANDIDATE,
        fullName: defaultFullName,
        title: null,
        avatar: null,
        phone: null,
        headline: null,
        gender: null,
        dateOfBirth: null,
        provinceId: null,
        addressDetail: null,
        profileCompleted: false,
        justRegistered: true,
      };

      setCookie('logged_in', 'true', 7);
      localStorage.setItem(USER, JSON.stringify(user));

      window.dispatchEvent(new Event('authChange'));

      setSuccessMessage('Xác thực thành công! Đang chuyển đến trang thông tin cá nhân...');

      // Chuyển hướng sang trang Thông tin cá nhân (/profile) để bổ sung hồ sơ
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Gửi lại mã OTP
   */
  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setErrorMessage('');
    setResending(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      await resendOtp(cleanEmail);
      setSuccessMessage(`Đã gửi lại mã xác thực mới tới ${cleanEmail}.`);
      setCountdown(60);
    } catch (err) {
      setErrorMessage(err.message || 'Không thể gửi lại mã xác thực. Vui lòng thử lại sau.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full flex-1 py-8 sm:py-14 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-[#faf8ff] selection:bg-[#005c55] selection:text-white">
      <div className="relative w-full max-w-5xl mx-auto rounded-3xl bg-white shadow-xl shadow-slate-200/50 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] border border-[#eaedff]">
        {/* Cột trái: Thương hiệu & Giá trị cốt lõi */}
        <div className="lg:col-span-5 relative flex flex-col justify-between p-7 sm:p-10 bg-gradient-to-br from-[#004e48] via-[#005c55] to-[#016f67] text-white overflow-hidden">
          {/* Subtle glow decorations */}
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-teal-300/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="space-y-2.5">
              <span className="px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider text-[#97f5cc] inline-flex items-center gap-1.5 border border-white/10">
                <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                Dành cho Người tìm việc
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Gia nhập nền tảng KiemJob
              </h1>
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                Đăng ký tài khoản nhanh chóng chỉ với Gmail và Mật khẩu. Xác thực an toàn qua mã OTP để bảo vệ tài khoản của bạn.
              </p>
            </div>

            {/* Danh sách lợi ích */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-[#97f5cc] text-[#00513a] flex items-center justify-center shrink-0 font-bold">
                  <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Xác thực OTP chính chủ</h3>
                  <p className="text-[11px] text-white/80">
                    Mã xác thực gửi trực tiếp về hòm thư, kích hoạt tài khoản an toàn tuyệt đối.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Hoàn thiện hồ sơ sau</h3>
                  <p className="text-[11px] text-white/80">
                    Bổ sung họ tên, kinh nghiệm, kỹ năng và CV tại trang Thông tin cá nhân sau khi đăng ký.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Chat trực tiếp cùng nhà tuyển dụng</h3>
                  <p className="text-[11px] text-white/80">
                    Trao đổi nhanh qua giao diện Messenger tích hợp ngay trên thanh công cụ.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer cột trái */}
          <div className="relative z-10 pt-4 mt-6 border-t border-white/15">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <p className="text-xs text-white/90 mt-0.5">
                Đăng ký tài khoản ➔ Nhận mã OTP kích hoạt ➔ Cập nhật thông tin cá nhân.
              </p>
            </div>
          </div>
        </div>

        {/* Cột phải: Form Đăng ký hoặc Màn hình Xác thực OTP */}
        <div className="lg:col-span-7 p-7 sm:p-12 flex flex-col justify-between bg-white">
          <div className="max-w-md mx-auto w-full space-y-5">
            {/* Header Form */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f2f3ff] text-xs font-bold text-[#005c55] mb-2.5">
                <span className="material-symbols-outlined text-[16px]">
                  {step === 1 ? 'person_add' : 'mail_lock'}
                </span>
                <span>{step === 1 ? 'Tạo tài khoản ứng viên' : 'Bước 2: Xác thực email'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#131b2e] tracking-tight">
                {step === 1 ? 'Đăng ký tài khoản' : 'Xác thực mã OTP'}
              </h2>
              <p className="text-xs sm:text-sm text-[#6e7977] mt-1">
                {step === 1
                  ? 'Điền thông tin cơ bản để bắt đầu tìm việc ngay'
                  : `Nhập mã 6 số chúng tôi đã gửi tới ${email}`}
              </p>
            </div>

            {/* Thông báo lỗi */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
                <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">error</span>
                <div className="flex-1">
                  <span>{errorMessage}</span>
                  {errorMessage.includes('Nhà tuyển dụng') && (
                    <div className="mt-2 flex items-center gap-2">
                      <Link
                        to="/recruiter/login"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#005c55] text-white text-[11px] font-bold rounded-lg hover:bg-[#007952] transition-colors shadow-sm"
                      >
                        <span>Đăng nhập Nhà tuyển dụng</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  )}
                  {errorMessage.includes('Đăng nhập!') && !errorMessage.includes('Nhà tuyển dụng') && (
                    <div className="mt-2 flex items-center gap-2">
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#005c55] text-white text-[11px] font-bold rounded-lg hover:bg-[#007952] transition-colors shadow-sm"
                      >
                        <span>Đến trang Đăng nhập</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Thông báo thành công */}
            {successMessage && (
              <div className="p-3.5 bg-[#e6f7f5] border border-[#97f5cc] rounded-2xl flex items-start gap-2.5 text-xs text-[#00513a] animate-in fade-in duration-200">
                <span className="material-symbols-outlined text-[18px] text-[#005c55] shrink-0">check_circle</span>
                <div className="space-y-0.5">
                  <p className="font-bold">{successMessage}</p>
                  {step === 2 && (
                    <p className="text-[11px] text-[#006c4e]">
                      💡 Lưu ý: Hãy kiểm tra cả hộp thư <strong>Spam (Thư rác)</strong> nếu chưa nhận được mã.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* BƯỚC 1: FORM ĐIỀN THÔNG TIN ĐĂNG KÝ (TINH GỌN, KHÔNG CHỨA NÚT/Ô OTP)    */}
            {/* ========================================================================= */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Đăng ký nhanh bằng Google */}
                <button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] text-xs font-bold transition-all border border-[#eaedff] cursor-pointer disabled:opacity-60 disabled:cursor-wait shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" fill="#4285F4" />
                    <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853" />
                    <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05" />
                    <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335" />
                  </svg>
                  <span>{submitting ? 'Đang xác thực...' : 'Đăng ký nhanh với Google'}</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center py-1">
                  <div className="w-full h-px bg-[#eaedff]" />
                  <span className="absolute bg-white px-3 text-[11px] font-semibold text-[#6e7977]">
                    hoặc đăng ký bằng Email
                  </span>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                {/* 1. Gmail */}
                <div>
                  <label className="text-xs font-bold text-[#131b2e] block mb-1.5">
                    Địa chỉ Gmail <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#6e7977] text-[18px]">
                      mail
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="tenban@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:bg-white focus:border-[#005c55] focus:ring-2 focus:ring-[#005c55]/20 transition-all font-medium placeholder:text-[#9aa4a2]"
                    />
                  </div>
                  <span className="text-[11px] text-[#6e7977] mt-1 block">
                    Sau khi bấm Đăng ký, hệ thống sẽ gửi mã OTP xác thực tới hộp thư này.
                  </span>
                </div>

                {/* 2. Mật khẩu */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#131b2e]">
                      Mật khẩu <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#005c55]">{strength.label}</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#6e7977] text-[18px]">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Tối thiểu 8 ký tự"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 pl-10 pr-10 rounded-2xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:bg-white focus:border-[#005c55] focus:ring-2 focus:ring-[#005c55]/20 transition-all font-medium placeholder:text-[#9aa4a2]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#6e7977] hover:text-[#131b2e] p-1 cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Thanh đo độ mạnh mật khẩu */}
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    <div className={`h-1.5 rounded-full ${strength.level >= 1 ? strength.color : 'bg-[#eaedff]'}`} />
                    <div className={`h-1.5 rounded-full ${strength.level >= 2 ? strength.color : 'bg-[#eaedff]'}`} />
                    <div className={`h-1.5 rounded-full ${strength.level >= 3 ? strength.color : 'bg-[#eaedff]'}`} />
                  </div>
                </div>

                {/* 3. Nhập lại mật khẩu */}
                <div>
                  <label className="text-xs font-bold text-[#131b2e] block mb-1.5">
                    Nhập lại mật khẩu <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#6e7977] text-[18px]">
                      lock_reset
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Nhập lại mật khẩu vừa đặt"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-11 pl-10 pr-10 rounded-2xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:bg-white focus:border-[#005c55] focus:ring-2 focus:ring-[#005c55]/20 transition-all font-medium placeholder:text-[#9aa4a2]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-[#6e7977] hover:text-[#131b2e] p-1 cursor-pointer"
                      title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <span className="text-[11px] text-rose-600 mt-1 block font-semibold">
                      Mật khẩu xác nhận chưa khớp!
                    </span>
                  )}
                </div>

                {/* Điều khoản */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-[#3e4947]">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      required
                      className="mt-0.5 rounded text-[#005c55] accent-[#005c55]"
                    />
                    <span>
                      Tôi đồng ý với <Link to="/terms" className="text-[#005c55] font-bold hover:underline">Điều khoản dịch vụ</Link> và <Link to="/privacy" className="text-[#005c55] font-bold hover:underline">Chính sách bảo mật</Link> của KiemJob.
                    </span>
                  </label>
                </div>

                {/* Nút gửi yêu cầu đăng ký */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full h-12 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    submitting ? 'bg-[#005c55]/70 cursor-wait' : 'bg-[#005c55] hover:bg-[#007952] active:scale-95'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Đang tạo tài khoản &amp; gửi mã OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng ký tài khoản</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
            {/* BƯỚC 2: MÀN HÌNH NHẬN MÃ OTP (XUẤT HIỆN SAU KHI ĐĂNG KÝ XONG)              */}
            {/* ========================================================================= */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in duration-200">
                {/* OTP Input Card */}
                <div className="p-5 sm:p-6 bg-[#f0fdf9] border-2 border-[#005c55]/25 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#005c55] flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[18px]">pin</span>
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

                  {/* Nút thao tác phụ: Đổi email & Gửi lại mã */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[#6e7977] hover:text-[#131b2e] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span>Sửa thông tin</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={countdown > 0 || resending}
                      className={`font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        countdown > 0 || resending
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-[#005c55] hover:text-[#007952]'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${resending ? 'animate-spin' : ''}`}>
                        {resending ? 'sync' : 'replay'}
                      </span>
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

                {/* Nút Xác thực & Hoàn tất */}
                <button
                  type="submit"
                  disabled={submitting || otp.trim().length !== 6}
                  className={`w-full h-12 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    submitting || otp.trim().length !== 6
                      ? 'bg-[#005c55]/50 cursor-not-allowed'
                      : 'bg-[#005c55] hover:bg-[#007952] active:scale-95'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Đang kích hoạt tài khoản...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Xác thực &amp; Hoàn tất đăng ký</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer chuyển sang Đăng nhập */}
            <div className="text-center pt-2 border-t border-[#eaedff]">
              <span className="text-xs text-[#3e4947]">Bạn đã có tài khoản KiemJob? </span>
              <Link to="/login" className="text-xs font-bold text-[#005c55] hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
