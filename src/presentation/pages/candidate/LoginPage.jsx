import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login, loginWithGoogle, profileApi } from '../../../infrastructure/api';
import { triggerGoogleLogin } from '../../../infrastructure/utils/googleAuth';
import { setCookie } from '../../../infrastructure/utils/cookieUtils';
import { USER } from '../../../config/storageKeys';
import { ROLES } from '../../../domain/constants/roles';

/**
 * Trang Đăng Nhập Tài Khoản
 * 
 * Các điểm kết nối Backend:
 * - Gọi API: POST /api/auth/login với thông tin { email: identifier, password }.
 * - Nhận JWT token và thông tin tài khoản Account từ máy chủ Spring Boot.
 * - Lưu trữ trạng thái vào localStorage ('kiemjob_user') và phát sự kiện 'authChange'.
 * - Tự động điều hướng: Ứng viên về trang trước đó (hoặc '/'), Nhà tuyển dụng về trang quản lý ('/recruiter').
 * - Hiển thị thông báo lỗi rõ ràng nếu sai mật khẩu hoặc tài khoản chưa tồn tại.
 */
export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const completeLogin = async (data) => {
    // Lấy thông tin tài khoản từ response (hỗ trợ cả data.account lẫn data trực tiếp)
    const account = data.account || data || {};

    // KIỂM TRA ROLE: Cổng đăng nhập này chỉ dành riêng cho Ứng viên!
    if (account.role === ROLES.RECRUITER) {
      localStorage.removeItem(USER);
      throw new Error('Email này thuộc tài khoản Nhà tuyển dụng. Vui lòng chuyển sang cổng dành cho Nhà tuyển dụng.');
    }

    let user = {
      id: account.id,
      email: account.email || identifier.trim(),
      phone: account.phone || '',
      role: account.role || ROLES.CANDIDATE,
      fullName: account.fullName || account.fullname || (account.email ? account.email.split('@')[0] : 'Ứng viên'),
      fullname: account.fullName || account.fullname || (account.email ? account.email.split('@')[0] : 'Ứng viên'),
      title: account.headline || '',
      avatar: account.avatarUrl || ''
    };

    // Thiết lập cookie xác thực trên trình duyệt
    setCookie('logged_in', 'true', rememberMe ? 14 : 1);

    // Tải thông tin hồ sơ ứng viên để lấy chính xác họ tên và ảnh đại diện
    if (user.role === ROLES.CANDIDATE) {
      try {
        const candidateResponse = await profileApi.getCandidateProfile();
        const candidate = candidateResponse?.data ?? candidateResponse;
        if (candidate?.fullname || candidate?.fullName) {
          user.fullName = candidate.fullname || candidate.fullName;
          user.fullname = user.fullName;
        }
        if (candidate?.avatarUrl) {
          user.avatar = candidate.avatarUrl;
        }
        if (candidate?.headline) {
          user.title = candidate.headline;
        }
        if (candidate?.phone) {
          user.phone = candidate.phone;
        }
      } catch (profileErr) {
        console.warn('Không thể tải profile ứng viên lúc đăng nhập:', profileErr);
      }
    }

    // Lưu trữ phiên đăng nhập vào trình duyệt
    localStorage.setItem(USER, JSON.stringify(user));

    // Kích hoạt sự kiện để Header/Navbar cập nhật ngay lập tức
    window.dispatchEvent(new Event('authChange'));

    // Chuyển hướng: Nếu là Admin, chuyển tới trang Admin
    if (account.role === ROLES.ADMIN) {
      navigate('/admin');
      return;
    }

    // Chuyển hướng về trang trước đó hoặc trang chủ ứng viên
    const redirectUrl = location.state?.from || '/';
    navigate(redirectUrl);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập Email hoặc Số điện thoại!');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu!');
      return;
    }

    setLoading(true);
    try {
      // Gọi API Backend: POST /api/auth/login
      const data = await login({
        email: identifier.trim(),
        password: password
      });

      await completeLogin(data);
    } catch (err) {
      setErrorMessage(err.message || 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setErrorMessage('');
    triggerGoogleLogin({
      role: 'candidate',
      onSuccess: async (payload) => {
        setLoading(true);
        try {
          const data = await loginWithGoogle(payload);
          await completeLogin(data);
        } catch (err) {
          setErrorMessage(err.message || 'Đăng nhập nhanh với Google thất bại. Vui lòng thử lại!');
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
    <div className="w-full flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-[#faf8ff]">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px] border border-[#eaedff]">
        {/* Left Column: Branding, Inspiration */}
        <div className="relative lg:col-span-5 bg-[#005c55] text-white p-6 sm:p-10 flex flex-col justify-between overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Chào mừng bạn trở lại với KiemJob
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Mở khóa hàng ngàn cơ hội nghề nghiệp chất lượng cao, nhận thông báo phỏng vấn tức thì và kết nối với hơn 12.000 doanh nghiệp hàng đầu.
              </p>
            </div>

            {/* 3 Feature Highlight Badges */}
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-3 bg-white/10 p-3 rounded-xl border border-white/10">
                <div className="w-9 h-9 rounded-lg bg-[#97f5cc] text-[#00513a] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">recommend</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">Gợi ý việc làm chuẩn xác</p>
                  <p className="text-[11px] text-white/75">Đề xuất công việc phù hợp dựa trên kinh nghiệm và kỹ năng của bạn</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-[#97f5cc] text-[#00513a] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">Minh bạch mức lương 100%</p>
                  <p className="text-[11px] text-white/75">Thông tin đãi ngộ rõ ràng, không lo đàm phán mơ hồ</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-[#97f5cc] text-[#00513a] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">shield</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">Bảo mật hồ sơ chủ động</p>
                  <p className="text-[11px] text-white/75">Linh hoạt bật tắt trạng thái tìm việc với nhà tuyển dụng hiện tại</p>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial Card */}
          <div className="relative z-10 pt-4 mt-4 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-1 text-[#97f5cc]">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-[16px] fill">star</span>
                ))}
              </div>
              <p className="text-xs italic text-white/90 leading-relaxed">
                “Nhờ tính năng AI gợi ý vị trí theo năng lực của KiemJob, mình đã nhận offer vị trí Tech Lead chỉ sau 6 ngày nộp hồ sơ.”
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                <img
                  className="w-8 h-8 rounded-full object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
                  alt="Trần Hoàng Long"
                />
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Trần Hoàng Long</p>
                  <p className="text-[10px] text-[#97f5cc] leading-tight">Tech Lead @ MoMo</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
          <div className="max-w-md w-full mx-auto space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#131b2e]">Đăng Nhập Tài Khoản</h1>
              <p className="text-xs sm:text-sm text-[#3e4947]">Tìm việc làm mơ ước chỉ với vài cú nhấp chuột</p>
            </div>

            {/* Social Quick Logins */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] text-xs font-bold transition-all border border-[#eaedff] cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" fill="#4285F4" />
                  <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853" />
                  <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05" />
                  <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335" />
                </svg>
                <span>{loading ? 'Đang xác thực...' : 'Đăng nhập nhanh với Google'}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-2">
              <div className="w-full h-px bg-[#eaedff]" />
              <span className="absolute bg-white px-3 text-[11px] font-semibold text-[#6e7977]">
                hoặc đăng nhập bằng Email / SĐT (accounts)
              </span>
            </div>

            {/* Thông báo lỗi nếu đăng nhập thất bại */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn">
                <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0 mt-0.5">error</span>
                <div className="flex-1">
                  <span>{errorMessage}</span>
                  {errorMessage.includes('Nhà tuyển dụng') && (
                    <div className="mt-2">
                      <Link
                        to="/recruiter/login"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005c55] text-white text-xs font-bold rounded-lg hover:bg-[#007952] transition-colors shadow-sm"
                      >
                        <span>Đến Cổng Đăng Nhập Nhà Tuyển Dụng</span>
                        <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#131b2e] mb-1" htmlFor="identifier">
                  Email hoặc Số điện thoại
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#6e7977] text-[18px]">
                    alternate_email
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    required
                    placeholder="vidu@gmail.com hoặc 0987xxxxxx"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] placeholder:text-[#6e7977]/60 outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:bg-white transition-all border border-[#eaedff]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#131b2e] mb-1" htmlFor="password">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#6e7977] text-[18px]">
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] placeholder:text-[#6e7977]/60 outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:bg-white transition-all border border-[#eaedff]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#6e7977] hover:text-[#131b2e] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[#131b2e]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#005c55] accent-[#005c55] cursor-pointer"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <Link to="/forgot-password" className="font-semibold text-[#005c55] hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full h-11 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md shadow-[#005c55]/20 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 ${
                  loading ? 'bg-[#005c55]/70 cursor-wait' : 'bg-[#005c55] hover:bg-[#007952]'
                }`}
              >
                <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </form>

            <div className="text-center text-xs text-[#6e7977] pt-2">
              <span>Bạn chưa có tài khoản?</span>
              <Link to="/register" className="font-bold text-[#005c55] hover:underline ml-1">
                Đăng ký ngay
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
