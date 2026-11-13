import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { logout } from '../../infrastructure/api';
import { hasAuthCookie } from '../../infrastructure/utils/cookieUtils';
import { RecruiterChatProvider } from '../../application/context/RecruiterChatContext';
import RecruiterChatDropdown from '../components/recruiter/RecruiterChatDropdown';
import RecruiterFloatingChat from '../components/recruiter/RecruiterFloatingChat';
import RecruiterFeedbackModal from '../components/recruiter/RecruiterFeedbackModal';

export default function RecruiterLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    if (!hasAuthCookie()) {
      localStorage.removeItem('kiemjob_user');
      localStorage.removeItem('kiemjob_token');
      return null;
    }
    try {
      const stored = localStorage.getItem('kiemjob_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAuth = () => {
      if (!hasAuthCookie()) {
        localStorage.removeItem('kiemjob_user');
        localStorage.removeItem('kiemjob_token');
        setCurrentUser(null);
        return;
      }
      try {
        const stored = localStorage.getItem('kiemjob_user');
        setCurrentUser(stored ? JSON.parse(stored) : null);
      } catch {
        setCurrentUser(null);
      }
    };
    window.addEventListener('authChange', handleAuth);
    return () => window.removeEventListener('authChange', handleAuth);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout error:', err);
    }
    navigate('/recruiter/login');
  };

  // KIỂM TRA ĐIỀU KIỆN: Khi thuộc tính công ty là null thì sẽ ở trang điền thông tin lần đầu (/recruiter/first-company-info)
  const hasCompany = Boolean(
    currentUser &&
    (currentUser.company_name || currentUser.companyId || currentUser.company) &&
    currentUser.profileCompleted !== false
  );

  // Nếu là nhà tuyển dụng nhưng thuộc tính công ty là null -> Chuyển về trang điền thông tin lần đầu
  if (currentUser && currentUser.role === 'recruiter' && !hasCompany) {
    return <Navigate to="/recruiter/first-company-info" replace />;
  }

  // Nếu chưa đăng nhập hoặc không phải nhà tuyển dụng -> Chuyển hướng đăng nhập
  if (!currentUser || (currentUser.role !== 'recruiter' && currentUser.role !== 'admin')) {
    return <Navigate to="/recruiter/login" replace />;
  }

  const isPending = Boolean(
    currentUser.status === 'pending' ||
    currentUser.company?.status === 'pending' ||
    !currentUser.status
  );

  const companyDisplayName =
    currentUser.company_name ||
    currentUser.company?.name ||
    'Doanh nghiệp chưa cập nhật';

  const recruiterDisplayName =
    currentUser.fullName ||
    currentUser.email?.split('@')[0] ||
    'Nhà tuyển dụng';

  const companyLogoUrl =
    currentUser.logo ||
    currentUser.avatar ||
    currentUser.company?.logoUrl ||
    null;

  const recruiterNav = [
    { label: 'Tổng Quan', to: '/recruiter', icon: 'grid_view' },
    { label: 'Thông Tin Công Ty', to: '/recruiter/company', icon: 'domain', matchPrefix: '/recruiter/company' },
    { label: 'Quản Lý Tin Tuyển Dụng', to: '/recruiter/jobs', icon: 'work_outline', matchPrefix: '/recruiter/jobs' },
    { label: 'Quản Lý Ứng Viên (ATS)', to: '/recruiter/candidates', icon: 'view_kanban' },
    { label: 'Tìm Kiếm Ứng Viên (AI)', to: '/recruiter/cv-search', icon: 'person_search', matchPrefix: '/recruiter/cv-search' },
    { label: 'Đơn Hàng & Giao Dịch', to: '/recruiter/orders', icon: 'receipt_long', matchPrefix: '/recruiter/orders' },
  ];

  return (
    <RecruiterChatProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Top Header for Recruiter */}
        <header className="fixed top-0 left-0 right-0 h-15 z-50 bg-white border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="h-15 w-full px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
              </button>

              <Link to="/recruiter" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#005c55] flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base text-[#005c55] leading-none">KiemJob</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cổng Tuyển Dụng</span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Facebook Messenger-style Chat Dropdown */}
              <RecruiterChatDropdown />

              {/* Feedback Button */}
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors hidden sm:inline-flex items-center gap-1 cursor-pointer"
                title="Đóng góp ý kiến cải tiến nền tảng"
              >
                <span className="material-symbols-outlined text-[16px] text-[#005c55]">rate_review</span>
                <span>Góp ý</span>
              </button>

              {/* Quick Post Button */}
              <Link
                to="/recruiter/post-job"
                className="px-3 py-1.5 bg-[#005c55] hover:bg-[#007952] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Đăng tin</span>
              </Link>

              {/* Switch back to candidate portal */}
              <Link
                to="/"
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors hidden md:inline-flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">person</span>
                <span>Trang ứng viên</span>
              </Link>

              {/* Recruiter Avatar & Company Name & Header Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                {companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt={companyDisplayName}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#005c55] text-white flex items-center justify-center text-xs font-bold">
                    {companyDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <Link
                  to="/recruiter/company"
                  className="text-xs font-semibold text-slate-800 hover:text-[#005c55] hidden xl:inline max-w-[150px] truncate transition-colors cursor-pointer"
                  title={`${companyDisplayName} (Nhấn để xem & chỉnh sửa)`}
                >
                  {companyDisplayName}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-0.5"
                  title="Đăng xuất"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Container with Sidebar */}
        <div className="flex-1 pt-[60px] flex min-h-[calc(100vh-60px)]">
          {/* Left Sidebar */}
          <aside
            className={`fixed left-0 top-[60px] bottom-0 w-60
    bg-white border-r border-slate-200 z-40
    flex flex-col transition-transform duration-200
    ${isSidebarOpen
                ? 'translate-x-0'
                : '-translate-x-full lg:translate-x-0'
              }`}
          >
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Doanh nghiệp</span>
                <span className="text-xs font-bold text-slate-900 block truncate mt-0.5" title={companyDisplayName}>
                  {companyDisplayName}
                </span>
                {isPending ? (
                  <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Chờ duyệt</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>{recruiterDisplayName} • Đã duyệt</span>
                  </span>
                )}
              </div>

              <nav className="space-y-0.5">
                {recruiterNav.map((item) => {
                  const isActive = item.matchPrefix
                    ? location.pathname.startsWith(item.matchPrefix)
                    : location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isActive
                          ? 'bg-[#005c55] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="shrink-0 p-3 pt-3 border-t border-slate-100 space-y-0.5 bg-white">
              <button
                type="button"
                onClick={() => {
                  setIsSidebarOpen(false);
                  setIsFeedbackOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-[#005c55] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px] text-[#005c55]">rate_review</span>
                  <span>Góp Ý Hệ Thống</span>
                </div>
              </button>
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-[#005c55] hover:bg-slate-50 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[17px]">arrow_back</span>
                <span>Cổng Ứng Viên</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px]">logout</span>
                  <span>Đăng Xuất</span>
                </div>
              </button>
            </div>
          </aside>

          {/* Content Area */}
          <main className="flex-1 ml-64 p-4 sm:p-6 lg:p-6 min-w-0 max-w-7xl mx-auto w-full">
            {isPending && (
              <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-amber-900">Hồ sơ doanh nghiệp đang chờ kiểm duyệt</h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-200 text-amber-900">
                      Chờ duyệt
                    </span>
                  </div>
                  <p className="text-amber-800 mt-0.5 leading-relaxed">
                    Thông tin công ty <strong>{companyDisplayName}</strong> đã được lưu và đang chờ Ban quản trị kiểm duyệt theo quy định.
                  </p>
                </div>
              </div>
            )}
            <Outlet />
          </main>
        </div>

        {/* Floating / Docked Messenger Chat for Recruiter */}
        <RecruiterFloatingChat />

        {/* Recruiter Feedback Modal */}
        <RecruiterFeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          currentUser={currentUser}
        />
      </div>
    </RecruiterChatProvider>
  );
}
