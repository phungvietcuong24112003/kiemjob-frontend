import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../infrastructure/api';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const rawUser = typeof localStorage !== 'undefined' ? localStorage.getItem('kiemjob_user') : null;
      if (!rawUser) return null;
      const user = JSON.parse(rawUser);
      return user.role === 'admin' ? user : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const rawUser = localStorage.getItem('kiemjob_user');
    if (!rawUser) {
      navigate('/admin/login', { replace: true });
      return;
    }
    try {
      const user = JSON.parse(rawUser);
      if (user.role !== 'admin') {
        // Ứng viên hoặc tài khoản không có quyền Admin sẽ bị chuyển hướng ngay lập tức
        navigate('/', { replace: true });
        return;
      }
      setAdminUser(user);
    } catch {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  if (!adminUser) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout error in admin:', err);
    }
    localStorage.removeItem('kiemjob_user');
    localStorage.removeItem('kiemjob_token');
    window.dispatchEvent(new Event('authChange'));
    navigate('/admin/login');
  };

  const adminNav = [
    { label: 'Tổng quan hệ thống', to: '/admin', icon: 'dashboard', aliases: [] },
    { label: 'Quản lý Tài khoản', to: '/admin/accounts', icon: 'manage_accounts', aliases: [] },
    { label: 'Quản lý Công ty', to: '/admin/companies', icon: 'apartment', aliases: [] },
    { label: 'Kiểm duyệt Tin đăng', to: '/admin/posts', icon: 'verified', aliases: ['/admin/jobs'] },
    { label: 'Quản lý Tỉnh Thành', to: '/admin/provinces', icon: 'location_city', aliases: [] },
    { label: 'Danh mục Nghề nghiệp', to: '/admin/categories', icon: 'category', aliases: [] },
    { label: 'Quản lý Gói Mua', to: '/admin/packages', icon: 'workspace_premium', aliases: ['/admin/feature-packages'] },
    { label: 'Quản lý Hóa Đơn', to: '/admin/invoices', icon: 'receipt_long', aliases: ['/admin/orders'] },
    { label: 'Góp ý người dùng', to: '/admin/feedbacks', icon: 'rate_review', aliases: [] },
  ];

  const isNavActive = (item) => {
    if (location.pathname === item.to) return true;
    if (item.aliases && item.aliases.includes(location.pathname)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      {/* ── Fixed Top Header ── */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-white border-b border-[#eaedff] shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
        <div className="h-14 w-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-1.5 text-[#3e4947] hover:bg-[#f2f3ff] rounded-lg cursor-pointer"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            <Link to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e2536] to-[#0f766e] flex items-center justify-center text-white shadow-xs">
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[15px] sm:text-[16px] text-[#131b2e] leading-tight">KiemJob Admin</span>
                <span className="text-[10px] text-[#005c55] font-bold uppercase tracking-wider">Hệ Thống Quản Trị</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">

            <Link
              to="/"
              className="px-2.5 py-1 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              <span className="hidden md:inline">Trang Ứng Viên</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-[#eaedff]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1e2536] to-[#0f766e] text-white flex items-center justify-center text-[10px] font-bold">
                AD
              </div>
              <span className="text-[12px] font-bold text-[#131b2e] hidden md:inline truncate max-w-[160px]">
                {adminUser?.email || 'Admin'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Overlay for mobile sidebar ── */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      {/* ── Fixed Sidebar ── */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-60 bg-[#1e2536] text-white z-40 p-3 flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-xl lg:shadow-none overflow-y-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-3">
          <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
            DANH MỤC QUẢN TRỊ
          </p>

          <nav className="space-y-0.5">
            {adminNav.map((item) => {
              const active = isNavActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    active
                      ? 'bg-[#0f766e] text-white font-semibold shadow-xs'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="lg:ml-60 pt-14 min-h-screen p-4 sm:p-5 lg:p-6 min-w-0">
        <div className="max-w-7xl mx-auto space-y-5 mt-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
