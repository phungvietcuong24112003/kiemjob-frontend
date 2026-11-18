import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../../infrastructure/api';
import { setCookie } from '../../../infrastructure/utils/cookieUtils';
import { USER } from '../../../config/storageKeys';
import { ROLES } from '../../../domain/constants/roles';

/**
 * Trang Đăng Nhập Quản Trị Viên (Admin Portal Login)
 */
export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập Email Quản trị viên!');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu quản trị!');
      return;
    }

    setLoading(true);
    try {
      const data = await login({
        email: email.trim(),
        password: password
      });

      const account = data.account || data || {};

      // Xác minh vai trò tài khoản: Chỉ chấp nhận quyền 'admin'
      if (account.role !== ROLES.ADMIN) {
        localStorage.removeItem(USER);
        throw new Error('Tài khoản này không có quyền truy cập hệ thống Quản trị viên (Admin)!');
      }

      const adminUser = {
        id: account.id,
        email: account.email || email.trim(),
        role: ROLES.ADMIN,
        fullName: account.fullName || account.fullname || 'Quản trị viên KiemJob',
        avatar: account.avatarUrl || ''
      };

      setCookie('logged_in', 'true', rememberMe ? 14 : 1);
      localStorage.setItem(USER, JSON.stringify(adminUser));

      window.dispatchEvent(new Event('authChange'));

      // Chuyển hướng tới trang Dashboard cho Admin
      navigate('/admin');
    } catch (err) {
      setErrorMessage(err.message || 'Email hoặc mật khẩu Quản trị không chính xác. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0c121e] via-[#131b2e] to-[#002b33] text-white p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#005c55]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(#2fff8c_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Top Branding */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#005c55] flex items-center justify-center text-white shadow-lg shadow-[#005c55]/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
            </div>
            <div className="text-left">
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                KiemJob <span className="text-[#2fff8c] text-sm font-bold uppercase tracking-wider">Admin</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Hệ Thống Quản Trị Trung Tâm</p>
            </div>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Đăng nhập Quản trị</h2>
              <p className="text-xs text-slate-400 mt-0.5">Xác thực quyền kiểm soát nền tảng</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Secure Portal
            </span>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-900/30 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-red-400 shrink-0">error</span>
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Quản trị viên
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 material-symbols-outlined text-[18px]">
                  alternate_email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email quản trị"
                  required
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#005c55] focus:ring-1 focus:ring-[#005c55] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 material-symbols-outlined text-[18px]">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#005c55] focus:ring-1 focus:ring-[#005c55] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-[#005c55] focus:ring-0 focus:ring-offset-0 transition-colors"
                />
                <span className="text-xs text-slate-400 font-medium">Ghi nhớ phiên đăng nhập</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#005c55] to-[#007a70] hover:from-[#006e66] hover:to-[#008f83] text-white font-bold text-sm shadow-lg shadow-[#005c55]/30 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Đang xác thực hệ thống...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note inside card */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Cổng bảo mật cấp độ doanh nghiệp KiemJob. Mọi hành vi truy cập trái phép đều được ghi lại trong nhật ký giám sát hệ thống.
            </p>
          </div>
        </div>

        {/* Back to public link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Quay lại trang chủ người tìm việc</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
