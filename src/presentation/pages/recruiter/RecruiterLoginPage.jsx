import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, loginWithGoogle, resendOtp, getRecruiterProfile } from '../../../infrastructure/api';
import { triggerGoogleLogin } from '../../../infrastructure/utils/googleAuth';
import { setCookie } from '../../../infrastructure/utils/cookieUtils';
import { USER } from '../../../config/storageKeys';
import { ROLES } from '../../../domain/constants/roles';

export default function RecruiterLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  const navigate = useNavigate();

  /**
   * Hoàn tất phiên đăng nhập và đồng bộ hồ sơ nhà tuyển dụng
   * Chức năng:
   * 1. Gọi getRecruiterProfile() để lấy thông tin hồ sơ và công ty từ Backend.
   * 2. Kiểm tra xem nhà tuyển dụng đã hoàn tất thông tin công ty hay chưa (hasCompany).
   * 3. Lưu thông tin người dùng vào localStorage ('kiemjob_user') và kích hoạt sự kiện 'authChange'.
   * 4. Phân luồng điều hướng:
   *    - Nếu chưa có công ty (!hasCompany): Chuyển tới /recruiter/first-company-info (FirstCompanyInfoPage)
   *      để bắt buộc điền thông tin doanh nghiệp ban đầu.
   *    - Nếu đã có công ty: Chuyển thẳng tới Cổng quản lý tuyển dụng (/recruiter).
   */
  const finalizeLogin = async (account) => {
    let companyName = null;
    let fullName = null;
    let companyLogo = null;
    let recruiterId = null;
    let companyId = null;
    let profileCompleted = account.profileCompleted || false;

    let companyStatus = null;

    try {
      const profile = await getRecruiterProfile();
      if (profile) {
        if (profile.fullName) fullName = profile.fullName;
        if (profile.recruiterId) recruiterId = profile.recruiterId;
        if (profile.companyId) companyId = profile.companyId;
        if (profile.companyName) companyName = profile.companyName;
        if (profile.logoUrl) companyLogo = profile.logoUrl;
        if (profile.status) companyStatus = profile.status;
        if (profile.company) {
          companyName = profile.company.name || companyName;
          companyLogo = profile.company.logoUrl || companyLogo;
          companyId = profile.company.id || companyId;
          companyStatus = profile.company.status || companyStatus;
        }
        if (companyName || companyId) {
          profileCompleted = true;
        }
      }
    } catch {
      // Profile may not exist yet if newly registered (company is null)
    }

    const hasCompany = Boolean(companyName || companyId) && profileCompleted;

    const user = {
      id: account.id,
      email: account.email,
      role: account.role || ROLES.RECRUITER,
      recruiterId,
      company_id: companyId,
      companyId: companyId,
      company_name: companyName,
      company: companyId ? { id: companyId, name: companyName, status: companyStatus || 'pending' } : null,
      status: companyStatus,
      fullName,
      title: 'Quản lý tuyển dụng (HR)',
      avatar: companyLogo,
      profileCompleted: hasCompany,
    };

    setCookie('logged_in', 'true', rememberMe ? 14 : 1);
    localStorage.setItem(USER, JSON.stringify(user));
    window.dispatchEvent(new Event('authChange'));
    setLoginSuccess(true);

    setTimeout(() => {
      if (!hasCompany) {
        navigate('/recruiter/first-company-info');
      } else {
        navigate('/recruiter');
      }
    }, 700);
  };

  /**
   * Xử lý gửi biểu mẫu Đăng nhập nhà tuyển dụng
   * Chức năng:
   * 1. Kiểm tra định dạng đầu vào Email và Mật khẩu.
   * 2. Gọi hàm login({ email, password }) (POST /api/auth/login) để xác thực tài khoản.
   * 3. Kiểm tra vai trò tài khoản (chỉ cho phép recruiter hoặc admin đăng nhập cổng này).
   * 4. Bắt lỗi: Nếu tài khoản chưa xác minh email (mã lỗi 403 / unverified), bật cờ isUnverified
   *    để hiển thị nút gửi lại mã OTP và chuyển sang trang nhập mã OTP.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsUnverified(false);
    setOtpNotice('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập email công ty hoặc Gmail đăng ký.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const account = await login({ email: trimmedEmail, password });
      
      const role = account?.role;
      if (role && role !== ROLES.RECRUITER && role !== ROLES.ADMIN) {
        throw new Error('Email này thuộc tài khoản Ứng viên. Vui lòng chuyển sang cổng dành cho Ứng viên.');
      }

      await finalizeLogin(account);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('xác minh email') || msg.includes('403')) {
        setIsUnverified(true);
        setErrorMessage('Tài khoản chưa được xác minh email. Vui lòng bấm vào nút bên dưới để nhận mã OTP.');
      } else {
        setErrorMessage(msg || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gửi lại mã xác minh OTP qua Email khi tài khoản chưa kích hoạt
   * Chức năng:
   * 1. Gọi resendOtp(email) (POST /api/auth/resend-otp) để Backend gửi lại mã xác thực tới hộp thư.
   * 2. Hiển thị thông báo trạng thái gửi mã OTP cho người dùng.
   */
  const handleResendOtp = async () => {
    if (!email.trim()) return;
    setResendingOtp(true);
    setOtpNotice('');
    try {
      const res = await resendOtp(email.trim());
      setOtpNotice(res?.message || 'Đã gửi mã xác minh OTP mới đến email của bạn.');
    } catch (err) {
      setOtpNotice(err.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
    } finally {
      setResendingOtp(false);
    }
  };

  const handleGoogleLogin = () => {
    setErrorMessage('');
    setIsUnverified(false);
    triggerGoogleLogin({
      role: 'recruiter',
      onSuccess: async (payload) => {
        setLoading(true);
        try {
          const account = await loginWithGoogle(payload);
          await finalizeLogin(account);
        } catch (err) {
          setErrorMessage(err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại!');
        } finally {
          setLoading(false);
        }
      },
      onError: (err) => {
        setErrorMessage(err.message || 'Không thể mở cửa sổ đăng nhập Google.');
      }
    });
  };

  return (
    <div className="w-full flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-[#faf8ff] selection:bg-[#005c55] selection:text-white">
      <div className="max-w-[1200px] w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* ================= LEFT COLUMN: Enterprise Value Proposition ================= */}
          <section className="lg:col-span-5 bg-gradient-to-b from-[#0f766e] to-[#0c5953] text-white p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden">
            {/* Decorative Ambient Light */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-800/80 border border-emerald-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-100 mb-6 backdrop-blur-sm">
                <span>⚡ Cổng Doanh Nghiệp &amp; HR</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug mb-3">
                Chào mừng trở lại với KiemJob Recruiter
              </h1>

              {/* Subtitle */}
              <p className="text-emerald-100/80 text-sm leading-relaxed mb-6 font-normal">
                Hệ sinh thái tuyển dụng thông minh giúp bạn tìm kiếm, sàng lọc và kết nối với các ứng viên hàng đầu chỉ trong vài phút.
              </p>

              {/* Value Proposition Feature Items */}
              <div className="space-y-3.5 mb-6">
                {/* Value Item 1 */}
                <div className="flex items-start gap-3.5 bg-emerald-900/35 border border-white/10 rounded-2xl p-3.5 hover:bg-emerald-900/50 transition">
                  <div className="p-2.5 rounded-xl bg-white/10 text-emerald-200 shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white mb-0.5 leading-snug">Quản lý chiến dịch tuyển dụng tập trung</h2>
                    <p className="text-xs text-emerald-100/75 leading-relaxed">
                      Theo dõi số lượng CV mới, trạng thái phỏng vấn và lịch hẹn ứng viên trực quan.
                    </p>
                  </div>
                </div>

                {/* Value Item 2 */}
                <div className="flex items-start gap-3.5 bg-emerald-900/35 border border-white/10 rounded-2xl p-3.5 hover:bg-emerald-900/50 transition">
                  <div className="p-2.5 rounded-xl bg-white/10 text-emerald-200 shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white mb-0.5 leading-snug">KiemJob AI Candidate Matching</h2>
                    <p className="text-xs text-emerald-100/75 leading-relaxed">
                      Tự động chấm điểm độ phù hợp của CV với vị trí đăng tuyển theo thang điểm 100%.
                    </p>
                  </div>
                </div>

                {/* Value Item 3 */}
                <div className="flex items-start gap-3.5 bg-emerald-900/35 border border-white/10 rounded-2xl p-3.5 hover:bg-emerald-900/50 transition">
                  <div className="p-2.5 rounded-xl bg-white/10 text-emerald-200 shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white mb-0.5 leading-snug">Bảo mật thông tin doanh nghiệp cấp cao</h2>
                    <p className="text-xs text-emerald-100/75 leading-relaxed">
                      Dữ liệu ứng viên và pháp nhân được mã hóa đạt tiêu chuẩn quốc tế ISO/IEC 27001.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Photo Showcase and Activity Badge */}
            <div className="space-y-3.5 pt-2">
              {/* Workplace Collaborative Image Card */}
              <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-md group">
                <img
                  alt="Đội ngũ tuyển dụng chuyên nghiệp"
                  className="w-full h-32 object-cover object-center group-hover:scale-105 transition duration-500"
                  src="https://lh3.googleusercontent.com/aida/AEtjO1W8m2rXexqIInA5j2mh6DUkbLgnLWl-1tqBrdX0IMS88SePzQ5lx1U7AZgdzcDqFxGPydZo-RY6H_dKlmed3eGsz7svx3uAg3S1ex6d1UJ9ERBl2dM3Va__Q4QBiHQqqt_sXDL3hhiKUm1jwaBAAuNouGF8t5oBrbt2Vm47-_NoFnoQKH0_O5coYFoKn7hjmhniQH5NpdgG_HDf2T9CcmM6xzT402WNhJmZk-5-Z2C_lBpzF5edNRvfMmg1"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                  <span className="inline-flex items-center gap-1.5 font-medium bg-emerald-950/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Kết nối hơn 1.8 triệu lượt ứng tuyển thành công
                  </span>
                </div>
              </div>

              {/* Highlight Metric Card */}
              <div className="bg-gradient-to-r from-emerald-800/80 to-teal-800/80 border border-emerald-400/20 rounded-xl px-4 py-3 text-xs font-semibold text-emerald-100 flex items-center gap-2.5 shadow-sm">
                <span className="text-base">🌟</span>
                <span>Đang có hơn <strong className="text-white underline decoration-emerald-300 underline-offset-2">12.000 hồ sơ mới</strong> ứng tuyển hôm nay</span>
              </div>
            </div>
          </section>
          {/* END: LeftFeatureColumn */}

          {/* ================= RIGHT COLUMN: Recruiter Login Form ================= */}
          <section className="lg:col-span-7 bg-white p-7 sm:p-10 lg:p-12 flex flex-col justify-between">
            <div>
              {/* Title & Subtitle Header */}
              <div className="mb-7">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md mb-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  Dành cho Nhà Tuyển Dụng
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Đăng Nhập Nhà Tuyển Dụng
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Vui lòng nhập thông tin để truy cập Bảng điều khiển tuyển dụng
                </p>
              </div>

              {/* SSO Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {/* Google SSO */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition text-sm font-semibold text-slate-700 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  <span>{loading ? 'Đang xác thực...' : 'Google'}</span>
                </button>

                {/* Microsoft 365 Enterprise SSO */}
                <button
                  type="button"
                  onClick={() => alert('Đang kết nối cổng Microsoft 365 Enterprise...')}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition text-sm font-semibold text-slate-700 shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 23 23">
                    <path d="M1 1h10v10H1z" fill="#f35325" />
                    <path d="M12 1h10v10H12z" fill="#81bc06" />
                    <path d="M1 12h10v10H1z" fill="#05a6f0" />
                    <path d="M12 12h10v10H12z" fill="#ffba08" />
                  </svg>
                  <span>Microsoft 365</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400 font-medium absolute">
                  hoặc đăng nhập bằng tài khoản
                </span>
              </div>

              {/* Feedback Alerts */}
              {errorMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                  {isUnverified && (
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendingOtp}
                        className="text-xs font-bold text-teal-800 bg-teal-100 hover:bg-teal-200 px-3 py-1.5 rounded-lg transition"
                      >
                        {resendingOtp ? 'Đang gửi mã...' : 'Gửi lại mã OTP qua email'}
                      </button>
                      <Link
                        to="/recruiter/register"
                        state={{ email: email.trim(), step: 2 }}
                        className="text-xs font-bold text-teal-800 underline hover:text-teal-900"
                      >
                        Sang trang xác thực OTP
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {otpNotice && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span>{otpNotice}</span>
                </div>
              )}

              {loginSuccess && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 font-semibold">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span>Đăng nhập thành công! Đang chuyển hướng vào Bảng điều khiển...</span>
                </div>
              )}

              {/* Login Form Elements */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Email / Gmail Input Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="recruiter-email">
                    Email công ty / Gmail đăng ký <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <input
                      className="block w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm text-slate-900 border border-slate-200 rounded-xl bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition"
                      id="recruiter-email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hr@congtycuaban.vn hoặc gmail.com"
                    />
                  </div>
                </div>

                {/* Password Input Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider" htmlFor="recruiter-password">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <input
                      className="block w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm text-slate-900 border border-slate-200 rounded-xl bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition"
                      id="recruiter-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu của bạn"
                    />
                    {/* Eye Toggle Password Visibility Button */}
                    <button
                      aria-label="Ẩn/Hiện mật khẩu"
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Utility Row: Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-brand-700 focus:ring-brand-600 h-4 w-4 border-slate-300 accent-teal-700 cursor-pointer"
                      type="checkbox"
                    />
                    <span className="text-slate-600 text-xs sm:text-sm">Ghi nhớ đăng nhập</span>
                  </label>
                  <Link
                    className="text-xs sm:text-sm font-semibold text-brand-700 hover:text-brand-800 transition"
                    to="/forgot-password?from=recruiter"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                {/* Primary Login CTA Button */}
                <button
                  className="w-full mt-3 bg-[#0f766e] hover:bg-[#0c5953] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-teal-900/15 hover:shadow-teal-900/25 transition duration-200 flex items-center justify-center gap-2 text-base group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng Nhập Tuyển Dụng</span>
                      <svg className="w-4 h-4 transform group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Register Prompt Box */}
              <div className="mt-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs sm:text-sm text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🎁</span>
                  <span>Doanh nghiệp chưa có tài khoản?</span>
                </div>
                <Link to="/recruiter/register" className="font-bold text-teal-800 hover:text-teal-900 underline whitespace-nowrap">
                  Đăng ký nhận 01 tin miễn phí
                </Link>
              </div>
            </div>

            {/* Helpline Support Badge */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center text-xs text-slate-500">
              <div className="inline-flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
                <svg className="w-3.5 h-3.5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                <span>Hỗ trợ kỹ thuật Doanh nghiệp: <strong className="text-slate-800">1900 6868 (Nhánh 2)</strong></span>
              </div>
            </div>
          </section>
          {/* END: RightLoginForm */}
        </div>
    </div>
  );
}
