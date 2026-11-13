import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useChat, formatChatTime } from '../../../application/context/ChatContext';
import { logout } from '../../../infrastructure/api';
import { hasAuthCookie, checkAuthSession } from '../../../infrastructure/utils/cookieUtils';
import { jobCategoryApi } from '../../../infrastructure/api/jobCategoryApi';

const DEFAULT_JOB_CATEGORIES = [
  { id: 1, name: 'Công nghệ thông tin / Phần mềm', icon: 'fa-laptop-code', count: '1.500+ việc làm' },
  { id: 2, name: 'Marketing / Truyền thông', icon: 'fa-bullhorn', count: '850+ việc làm' },
  { id: 3, name: 'Kinh doanh / Bán hàng', icon: 'fa-store', count: '1.200+ việc làm' },
  { id: 4, name: 'Tài chính / Kế toán / Kiểm toán', icon: 'fa-chart-pie', count: '640+ việc làm' },
  { id: 5, name: 'Hành chính / Nhân sự', icon: 'fa-users-gear', count: '520+ việc làm' },
  { id: 6, name: 'Thiết kế / Sáng tạo / UI-UX', icon: 'fa-palette', count: '430+ việc làm' },
  { id: 7, name: 'Chăm sóc khách hàng / Telesales', icon: 'fa-headset', count: '760+ việc làm' },
  { id: 8, name: 'Ngân hàng / Bảo hiểm', icon: 'fa-landmark', count: '390+ việc làm' },
];

const getCategoryIconName = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('thông tin') || lower.includes('software') || lower.includes('it') || lower.includes('phần mềm') || lower.includes('developer')) {
    return 'fa-laptop-code';
  }
  if (lower.includes('kế toán') || lower.includes('tài chính') || lower.includes('ngân hàng')) {
    return 'fa-chart-pie';
  }
  if (lower.includes('marketing') || lower.includes('truyền thông') || lower.includes('quảng cáo')) {
    return 'fa-bullhorn';
  }
  if (lower.includes('thiết kế') || lower.includes('đồ họa') || lower.includes('ui/ux') || lower.includes('design')) {
    return 'fa-palette';
  }
  if (lower.includes('kinh doanh') || lower.includes('bán hàng') || lower.includes('sales')) {
    return 'fa-store';
  }
  if (lower.includes('nhân sự') || lower.includes('hành chính') || lower.includes('hr')) {
    return 'fa-users-gear';
  }
  if (lower.includes('chăm sóc') || lower.includes('cskh') || lower.includes('telesale')) {
    return 'fa-headset';
  }
  if (lower.includes('giáo dục') || lower.includes('đào tạo') || lower.includes('teacher')) {
    return 'fa-graduation-cap';
  }
  return 'fa-briefcase';
};

export default function CandidateHeader() {
  const [quickKeyword, setQuickKeyword] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileJobsOpen, setIsMobileJobsOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [jobCategories, setJobCategories] = useState(DEFAULT_JOB_CATEGORIES);
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const jobDropdownTimeoutRef = useRef(null);

  const handleJobDropdownEnter = () => {
    if (jobDropdownTimeoutRef.current) {
      clearTimeout(jobDropdownTimeoutRef.current);
      jobDropdownTimeoutRef.current = null;
    }
    setIsJobDropdownOpen(true);
  };

  const handleJobDropdownLeave = () => {
    if (jobDropdownTimeoutRef.current) {
      clearTimeout(jobDropdownTimeoutRef.current);
    }
    jobDropdownTimeoutRef.current = setTimeout(() => {
      setIsJobDropdownOpen(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (jobDropdownTimeoutRef.current) {
        clearTimeout(jobDropdownTimeoutRef.current);
      }
    };
  }, []);

  // Chat context state & controls
  const {
    conversations,
    openChat,
    unreadTotal,
    markAllAsRead,
  } = useChat();

  const [isChatDropdownOpen, setIsChatDropdownOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatFilterTab, setChatFilterTab] = useState('all'); // 'all' | 'unread'

  // Load user from localStorage or keep guest based on cookie status
  useEffect(() => {
    const loadUser = () => {
      // 1. Kiểm tra cookie trước: Nếu web không có cookie xác thực, chắc chắn ở trạng thái khách!
      if (!hasAuthCookie()) {
        localStorage.removeItem('kiemjob_user');
        localStorage.removeItem('kiemjob_token');
        setCurrentUser(null);
        return;
      }

      // 2. Nếu có cookie, lấy thông tin tài khoản từ localStorage
      const stored = localStorage.getItem('kiemjob_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };

    loadUser();

    // 3. Nếu có cookie, xác minh phiên với backend qua /api/auth/me
    if (hasAuthCookie()) {
      checkAuthSession().then((user) => {
        if (!user) {
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
      });
    }

    window.addEventListener('authChange', loadUser);
    return () => window.removeEventListener('authChange', loadUser);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout error:', err);
    }
    setCurrentUser(null);
    setIsUserDropdownOpen(false);
    setIsChatDropdownOpen(false);
    navigate('/');
  };

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (quickKeyword.trim()) {
      navigate(`/jobs?q=${encodeURIComponent(quickKeyword.trim())}`);
      setQuickKeyword('');
    } else {
      navigate('/jobs');
    }
  };

  // Job categories for the dropdown (aligned with categoriesData in HomePage)
  useEffect(() => {
    let isMounted = true;
    const fetchJobCategories = async () => {
      try {
        const categories = await jobCategoryApi.getCategories();
        if (isMounted) {
          if (Array.isArray(categories) && categories.length > 0) {
            const enriched = categories.map((c) => ({
              ...c,
              icon: c.icon || getCategoryIconName(c.name),
              count: c.count || 'Việc làm mở',
            }));
            setJobCategories(enriched);
          } else {
            setJobCategories(DEFAULT_JOB_CATEGORIES);
          }
        }
      } catch (error) {
        console.warn('Không thể tải danh mục nghề nghiệp, dùng danh mục mặc định:', error);
        if (isMounted) {
          setJobCategories(DEFAULT_JOB_CATEGORIES);
        }
      }
    };

    fetchJobCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = [
    { label: 'Việc làm', to: '/jobs', hasDropdown: true },
    { label: 'Công ty hàng đầu', to: '/companies' },
    { label: 'Cẩm nang nghề nghiệp', to: '/career-guide' },
  ];

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      (c.recruiterName || '').toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
      (c.companyName || '').toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(chatSearchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (chatFilterTab === 'unread') {
      return (c.unreadCount || 0) > 0;
    }
    return true;
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#faf8ff]/95 backdrop-blur-xl border-b border-[#eaedff] shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 lg:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#005c55] to-[#007952] flex items-center justify-center text-white shadow-md shadow-[#005c55]/20 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">work</span>
            </div>
            <span className="font-bold text-xl sm:text-2xl text-[#005c55] tracking-tight">KiemJob</span>
          </Link>
        </div>

        {/* Unified Single-Row Center: Navigation items + Inline Quick Search */}
        <div className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-4xl mx-2">
          <nav className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;

              // Special handling for "Việc làm" with hover dropdown
              if (link.hasDropdown) {
                return (
                  <div
                    key={link.to}
                    className="relative"
                    onMouseEnter={handleJobDropdownEnter}
                    onMouseLeave={handleJobDropdownLeave}
                  >
                    <NavLink
                      to={link.to}
                      className={`px-2.5 xl:px-3 py-1.5 rounded-xl text-xs xl:text-sm font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1 ${isActive
                        ? 'bg-[#005c55] text-white shadow-sm'
                        : 'text-[#3e4947] hover:text-[#131b2e] hover:bg-[#eaedff]'
                        }`}
                    >
                      {link.label}
                      <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isJobDropdownOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </NavLink>

                    {/* Rich Mega Dropdown for Việc làm */}
                    {isJobDropdownOpen && (
                      <div
                        className="absolute top-full left-0 mt-1 w-[560px] bg-white rounded-2xl shadow-2xl border border-[#eaedff] p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
                        onMouseEnter={handleJobDropdownEnter}
                        onMouseLeave={handleJobDropdownLeave}
                      >
                        <div className="grid grid-cols-5 gap-3.5">
                          {/* Cột trái (2/5): Lối tắt tính năng */}
                          <div className="col-span-2 space-y-1.5 border-r border-[#eaedff] pr-3">
                            <p className="text-[11px] font-bold text-[#005c55] uppercase tracking-wider px-2.5 pb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">explore</span>
                              Lối tắt việc làm
                            </p>
                            <Link
                              to="/jobs"
                              onClick={() => setIsJobDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#e6f7f5] text-[#131b2e] hover:text-[#005c55] font-semibold text-xs transition-colors group"
                            >
                              <span className="material-symbols-outlined text-[18px] text-[#005c55] group-hover:scale-110 transition-transform">
                                travel_explore
                              </span>
                              <span className="flex-1">Tất cả việc làm</span>
                              <span className="text-[10px] bg-[#97f5cc] text-[#00513a] font-bold px-1.5 py-0.5 rounded-full">
                                Hot
                              </span>
                            </Link>
                            <Link
                              to="/jobs?sort=latest"
                              onClick={() => setIsJobDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#e6f7f5] text-[#131b2e] hover:text-[#005c55] font-semibold text-xs transition-colors group"
                            >
                              <span className="material-symbols-outlined text-[18px] text-[#005c55] group-hover:scale-110 transition-transform">
                                schedule
                              </span>
                              <span>Việc làm mới nhất</span>
                            </Link>
                            <Link
                              to="/jobs?sort=salary_desc"
                              onClick={() => setIsJobDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#e6f7f5] text-[#131b2e] hover:text-[#005c55] font-semibold text-xs transition-colors group"
                            >
                              <span className="material-symbols-outlined text-[18px] text-[#005c55] group-hover:scale-110 transition-transform">
                                payments
                              </span>
                              <span>Việc làm lương cao</span>
                            </Link>
                            <div className="pt-2 border-t border-[#eaedff] space-y-1">
                              <Link
                                to="/saved-jobs"
                                onClick={() => setIsJobDropdownOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#e6f7f5] text-[#131b2e] hover:text-[#005c55] font-semibold text-xs transition-colors group"
                              >
                                <span className="material-symbols-outlined text-[18px] text-[#005c55] group-hover:scale-110 transition-transform">
                                  bookmark
                                </span>
                                <span>Việc làm đã lưu</span>
                              </Link>
                              <Link
                                to="/applications"
                                onClick={() => setIsJobDropdownOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#e6f7f5] text-[#131b2e] hover:text-[#005c55] font-semibold text-xs transition-colors group"
                              >
                                <span className="material-symbols-outlined text-[18px] text-[#005c55] group-hover:scale-110 transition-transform">
                                  assignment_turned_in
                                </span>
                                <span>Việc đã ứng tuyển</span>
                              </Link>
                            </div>
                          </div>

                          {/* Cột phải (3/5): Ngành nghề phổ biến */}
                          <div className="col-span-3 space-y-1">
                            <div className="flex items-center justify-between px-1 pb-1">
                              <p className="text-[11px] font-bold text-[#005c55] uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">category</span>
                                Ngành nghề nổi bật
                              </p>
                              <Link
                                to="/jobs"
                                onClick={() => setIsJobDropdownOpen(false)}
                                className="text-[11px] font-bold text-[#005c55] hover:underline"
                              >
                                Xem tất cả
                              </Link>
                            </div>
                            <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1">
                              {jobCategories.slice(0, 8).map((cat) => (
                                <Link
                                  key={cat.id}
                                  to={`/jobs?category=${encodeURIComponent(cat.id)}`}
                                  onClick={() => setIsJobDropdownOpen(false)}
                                  className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#f2f3ff] text-[#131b2e] hover:text-[#005c55] transition-colors group text-xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-[#e6f7f5] text-[#005c55] flex items-center justify-center shrink-0 text-xs group-hover:bg-[#005c55] group-hover:text-white transition-colors">
                                      <i className={`fa-solid ${cat.icon || 'fa-briefcase'} text-[11px]`}></i>
                                    </span>
                                    <span className="font-semibold truncate">{cat.name}</span>
                                  </div>
                                  <span className="text-[10px] text-[#6e7977] shrink-0 font-medium ml-2">
                                    {cat.count || 'Việc làm'}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Dropdown Footer */}
                        <div className="mt-3 pt-2.5 border-t border-[#eaedff] flex items-center justify-between px-2 text-xs">
                          <span className="text-[#6e7977] flex items-center gap-1.5 text-[11px]">
                            <span className="material-symbols-outlined text-[#005c55] text-[15px]">verified</span>
                            Hơn 10,000+ tin tuyển dụng chất lượng cao đã xác thực
                          </span>
                          <Link
                            to="/jobs"
                            onClick={() => setIsJobDropdownOpen(false)}
                            className="font-bold text-[#005c55] hover:text-[#007952] hover:underline flex items-center gap-0.5 text-xs"
                          >
                            <span>Khám phá ngay</span>
                            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`px-2.5 xl:px-3 py-1.5 rounded-xl text-xs xl:text-sm font-semibold transition-all whitespace-nowrap ${isActive
                    ? 'bg-[#005c55] text-white shadow-sm'
                    : 'text-[#3e4947] hover:text-[#131b2e] hover:bg-[#eaedff]'
                    }`}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right side Actions: Bookmark, Notifications, Guest / User Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Saved Jobs & Notifications (Chỉ hiển thị khi đã đăng nhập) */}
          {currentUser && (
            <>
              {/* Notifications */}
              <div className="relative">
                <button
                  aria-label="Thông báo"
                  onClick={() => {
                    setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
                    setIsChatDropdownOpen(false);
                    setIsUserDropdownOpen(false);
                  }}
                  className={`relative p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                    isNotificationDropdownOpen
                      ? 'bg-[#005c55] text-white shadow-md'
                      : 'text-[#3e4947] hover:bg-[#eaedff] hover:text-[#005c55]'
                  }`}
                  title="Thông báo"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[22px]">notifications</span>
                </button>

                {isNotificationDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#dae2fd] p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-[#f2f3ff]">
                      <h3 className="font-bold text-[#131b2e] text-[14px]">Thông báo</h3>
                      <span className="text-[11px] text-[#6e7977] font-medium">Hệ thống</span>
                    </div>
                    <div className="py-6 text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#6e7977] mb-2.5">
                        <span className="material-symbols-outlined text-[24px]">notifications_none</span>
                      </div>
                      <p className="text-[13px] font-semibold text-[#131b2e]">Chưa có thông báo mới</p>
                      <p className="text-[11px] text-[#6e7977] mt-1 max-w-[220px] mx-auto leading-relaxed">
                        Các cập nhật về trạng thái ứng tuyển và tin tuyển dụng sẽ xuất hiện tại đây.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Facebook-style Messenger Chat Dropdown Trigger (CHỈ HIỂN THỊ KHI ĐÃ ĐĂNG NHẬP) */}
          {currentUser && (
            <div className="relative">
              <button
                id="btn-header-messenger"
                type="button"
                onClick={() => {
                  setIsChatDropdownOpen(!isChatDropdownOpen);
                  setIsUserDropdownOpen(false);
                }}
                aria-label="Đoạn chat Messenger"
                className={`relative p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${isChatDropdownOpen
                  ? 'bg-[#005c55] text-white shadow-md'
                  : 'text-[#3e4947] hover:bg-[#eaedff] hover:text-[#005c55]'
                  }`}
                title="Đoạn chat (Messenger)"
              >
                {/* Facebook Messenger Icon */}
                <svg
                  className="w-[22px] h-[22px] fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.735 7.205V22l3.39-1.86c.928.257 1.916.396 2.875.396 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.443l-2.58-2.753-5.034 2.753 5.539-5.88 2.65 2.753 4.965-2.753-5.54 5.88z" />
                </svg>

                {unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] bg-[#ba1a1a] text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">
                    {unreadTotal > 9 ? '9+' : unreadTotal}
                  </span>
                )}
              </button>

              {/* Facebook-style Messenger Dropdown Menu */}
              {isChatDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsChatDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-[340px] sm:w-[390px] max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-[#eaedff] py-3 z-50 flex flex-col overflow-hidden animate-in fade-in duration-150">
                    {/* Header */}
                    <div className="px-4 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-xl text-[#131b2e] tracking-tight">Đoạn chat</h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#e6f7f5] text-[#005c55] text-xs font-bold">
                          {conversations.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadTotal > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="p-1.5 text-xs text-[#005c55] hover:bg-[#f2f3ff] rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Đánh dấu tất cả là đã đọc"
                          >
                            <span className="material-symbols-outlined text-[16px]">done_all</span>
                            <span className="hidden sm:inline">Đã đọc</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsChatDropdownOpen(false)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#6e7977] hover:bg-[#f2f3ff] hover:text-[#131b2e] transition-colors cursor-pointer"
                          title="Đóng menu"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="px-4 pb-2">
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-[#6e7977] text-[18px] pointer-events-none">
                          search
                        </span>
                        <input
                          type="text"
                          placeholder="Tìm kiếm trên Messenger..."
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                          className="w-full bg-[#f2f3ff] hover:bg-[#eaedff]/70 focus:bg-white border border-transparent focus:border-[#005c55]/30 focus:ring-2 focus:ring-[#005c55]/15 pl-9 pr-8 py-2 rounded-2xl text-xs sm:text-sm text-[#131b2e] placeholder:text-[#6e7977] transition-all outline-none"
                        />
                        {chatSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setChatSearchQuery('')}
                            className="absolute right-2.5 w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-400 text-xs transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="px-4 pb-2 flex items-center gap-1.5 border-b border-[#eaedff]">
                      <button
                        type="button"
                        onClick={() => setChatFilterTab('all')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${chatFilterTab === 'all'
                          ? 'bg-[#005c55] text-white shadow-xs'
                          : 'bg-[#f2f3ff] text-[#3e4947] hover:bg-[#eaedff]'
                          }`}
                      >
                        Hộp thư
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatFilterTab('unread')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${chatFilterTab === 'unread'
                          ? 'bg-[#005c55] text-white shadow-xs'
                          : 'bg-[#f2f3ff] text-[#3e4947] hover:bg-[#eaedff]'
                          }`}
                      >
                        <span>Chưa đọc</span>
                        {unreadTotal > 0 && (
                          <span
                            className={`w-2 h-2 rounded-full ${chatFilterTab === 'unread' ? 'bg-white' : 'bg-[#ba1a1a]'
                              }`}
                          />
                        )}
                      </button>
                    </div>

                    {/* Conversation List */}
                    <div className="py-1 max-h-[340px] overflow-y-auto divide-y divide-slate-50">
                      {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center gap-2 text-[#6e7977]">
                          <span className="material-symbols-outlined text-[36px] text-slate-300">forum</span>
                          <p className="text-xs font-semibold">
                            {chatSearchQuery ? 'Không tìm thấy cuộc trò chuyện phù hợp' : 'Chưa có tin nhắn nào'}
                          </p>
                        </div>
                      ) : (
                        filteredConversations.map((conv) => {
                          const isUnread = (conv.unreadCount || 0) > 0;
                          return (
                            <div
                              key={conv.id}
                              onClick={() => {
                                openChat(conv.id);
                                setIsChatDropdownOpen(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f2f3ff] transition-all cursor-pointer group"
                            >
                              {/* Avatar with online dot */}
                              <div className="relative shrink-0">
                                {conv.avatar || conv.companyLogo ? (
                                  <img
                                    src={conv.avatar || conv.companyLogo}
                                    alt={conv.recruiterName || conv.companyName}
                                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                    {(conv.companyName || conv.recruiterName || 'N').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {conv.online !== false && (
                                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                                )}
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <h4
                                    className={`text-sm truncate ${isUnread ? 'font-bold text-[#131b2e]' : 'font-semibold text-slate-800'
                                      }`}
                                  >
                                    {conv.recruiterName || conv.companyName || 'Nhà tuyển dụng'}
                                  </h4>
                                  <span
                                    className={`text-[11px] whitespace-nowrap ${isUnread ? 'font-bold text-[#005c55]' : 'text-[#6e7977]'
                                      }`}
                                  >
                                    {formatChatTime(conv.lastMessageTime)}
                                  </span>
                                </div>

                                <p className="text-[11px] text-[#005c55] font-medium truncate mb-0.5">
                                  {conv.companyName}
                                </p>

                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className={`text-xs truncate ${isUnread ? 'font-bold text-[#131b2e]' : 'text-[#6e7977]'
                                      }`}
                                  >
                                    {conv.lastMessage || 'Bắt đầu cuộc trò chuyện...'}
                                  </p>
                                  {isUnread && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#005c55] shrink-0" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 pt-2.5 pb-1 border-t border-[#eaedff] flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          openChat(conversations[0]?.id || 1);
                          setIsChatDropdownOpen(false);
                        }}
                        className="font-bold text-[#005c55] hover:text-[#007952] transition-colors flex items-center gap-1 py-1 cursor-pointer"
                      >
                        <span>Mở cửa sổ chat</span>
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </button>
                      <span className="text-[11px] text-[#6e7977] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Trực tuyến
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* User Profile / Guest State Dropdown */}
          <div className="relative">
            {currentUser ? (
              /* LOGGED IN USER STATE */
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-2xl bg-[#f2f3ff] hover:bg-[#eaedff] transition-colors cursor-pointer"
              >
                {currentUser.avatar ? (
                  <img
                    alt={currentUser.fullName || currentUser.fullname || 'User'}
                    src={currentUser.avatar}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-[#80d5cb]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#80d5cb]">
                    {(currentUser.fullName || currentUser.fullname || currentUser.company_name || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#131b2e] leading-tight truncate max-w-[110px]">
                    {currentUser.fullName || currentUser.fullname || currentUser.company_name || (currentUser.email ? currentUser.email.split('@')[0] : 'Tài khoản')}
                  </span>
                  <span className="text-[11px] font-semibold text-[#005c55] leading-tight">
                    {currentUser.role === 'recruiter' ? 'Nhà tuyển dụng' : (currentUser.title || 'Ứng viên')}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#6e7977]">
                  expand_more
                </span>
              </button>
            ) : (
              /* GUEST (CHƯA ĐĂNG NHẬP) STATE */
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl bg-[#f2f3ff] hover:bg-[#eaedff] transition-colors cursor-pointer border border-[#eaedff]"
              >
                <div className="w-8 h-8 rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#131b2e] leading-tight">
                    Tài khoản
                  </span>
                  <span className="text-[11px] font-medium text-[#6e7977] leading-tight">
                    Khách
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#6e7977]">
                  expand_more
                </span>
              </button>
            )}

            {/* Dropdown Menu */}
            {isUserDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#eaedff] py-2 z-50">
                  {currentUser ? (
                    currentUser.role === 'recruiter' ? (
                      /* KHI Ở TRẠNG THÁI RECRUITER: CHỈ HIỂN THỊ TRANG QUẢN LÝ VÀ ĐĂNG XUẤT */
                      <>
                        <div className="px-4 py-3 border-b border-[#eaedff]">
                          <p className="text-sm font-bold text-[#131b2e] truncate">
                            {currentUser.fullName || currentUser.company_name || 'Nhà tuyển dụng'}
                          </p>
                          <p className="text-xs text-[#6e7977] truncate">{currentUser.email}</p>
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#e6f7f5] text-[#005c55] border border-[#80d5cb]/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#005c55]" />
                            Tài khoản Nhà tuyển dụng
                          </span>
                        </div>

                        <div className="py-1">
                          <Link
                            to="/recruiter"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#131b2e] hover:bg-[#f2f3ff] transition-colors font-semibold"
                          >
                            <span className="material-symbols-outlined text-[20px] text-[#005c55]">dashboard</span>
                            <span>Trang quản lý</span>
                          </Link>
                        </div>

                        <div className="border-t border-[#eaedff] pt-1">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer font-medium"
                          >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            <span>Đăng xuất</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      /* KHI Ở TRẠNG THÁI CANDIDATE / USER THƯỜNG */
                      <>
                        <div className="px-4 py-3 border-b border-[#eaedff]">
                          <p className="text-sm font-bold text-[#131b2e]">{currentUser.fullName || currentUser.fullname || (currentUser.email ? currentUser.email.split('@')[0] : 'Ứng viên')}</p>
                          <p className="text-xs text-[#6e7977] truncate">{currentUser.email}</p>
                        </div>

                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#131b2e] hover:bg-[#f2f3ff] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px] text-[#005c55]">person</span>
                            Hồ sơ cá nhân & CV
                          </Link>
                          <Link
                            to="/applications"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#131b2e] hover:bg-[#f2f3ff] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px] text-[#005c55]">send</span>
                            Việc đã ứng tuyển
                          </Link>
                          <Link
                            to="/saved-jobs"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#131b2e] hover:bg-[#f2f3ff] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px] text-[#005c55]">bookmark</span>
                            Việc làm đã lưu
                          </Link>
                          <Link
                            to="/cvs"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#131b2e] hover:bg-[#f2f3ff] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px] text-[#005c55]">folder_shared</span>
                            Danh sách CV của tôi
                          </Link>
                          <Link
                            to="/cvs"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#131b2e] hover:bg-[#f2f3ff] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px] text-[#005c55]">upload_file</span>
                            Tải lên CV (PDF)
                          </Link>
                        </div>

                        <div className="border-t border-[#eaedff] pt-1">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Đăng xuất
                          </button>
                        </div>
                      </>
                    )
                  ) : (
                    /* DROPDOWN KHI CHƯA ĐĂNG NHẬP */
                    <div className="p-3.5 space-y-3">
                      {/* Phần Ứng viên */}
                      <div className="px-1 text-center">
                        <p className="text-sm font-bold text-[#131b2e]">Chào mừng bạn đến với KiemJob!</p>
                        <p className="text-xs text-[#6e7977] mt-0.5">Dành cho ứng viên tìm việc</p>
                      </div>

                      <div className="space-y-2">
                        <Link
                          to="/login"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="w-full py-2.5 px-4 bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[16px]">login</span>
                          <span>Đăng nhập Ứng viên</span>
                        </Link>

                        <Link
                          to="/register"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="w-full py-2.5 px-4 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-[#eaedff]"
                        >
                          <span className="material-symbols-outlined text-[16px]">person_add</span>
                          <span>Đăng ký Ứng viên</span>
                        </Link>

                        <Link
                          to="/recruiter/login"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="w-full py-2.5 px-4 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-[#eaedff]"
                        >
                          <span className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            business_center
                          </span>
                          <span>Trang nhà tuyển dụng</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#3e4947] hover:bg-[#eaedff] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-[#eaedff] bg-[#faf8ff] px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <form onSubmit={handleQuickSearch} className="flex items-center bg-[#f2f3ff] rounded-xl px-3 py-2">
            <span className="material-symbols-outlined text-[#005c55] text-[20px] mr-2">search</span>
            <input
              type="text"
              placeholder="Tìm kiếm công việc nhanh..."
              value={quickKeyword}
              onChange={(e) => setQuickKeyword(e.target.value)}
              className="bg-transparent border-0 outline-none text-sm text-[#131b2e] w-full"
            />
          </form>

          <nav className="flex flex-col gap-1">
            {/* Việc làm with accordion in mobile */}
            <div className="rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsMobileJobsOpen(!isMobileJobsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#3e4947] hover:bg-[#eaedff] rounded-xl transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#005c55]">work</span>
                  <span>Việc làm</span>
                </span>
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isMobileJobsOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {isMobileJobsOpen && (
                <div className="pl-6 pr-2 py-1.5 space-y-1 bg-[#f2f3ff] rounded-xl mt-1 text-xs">
                  <Link
                    to="/jobs"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-1.5 px-2 rounded-lg text-[#131b2e] hover:text-[#005c55] font-semibold"
                  >
                    • Tất cả việc làm
                  </Link>
                  <Link
                    to="/saved-jobs"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-1.5 px-2 rounded-lg text-[#131b2e] hover:text-[#005c55] font-medium"
                  >
                    • Việc làm đã lưu
                  </Link>
                  <Link
                    to="/applications"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-1.5 px-2 rounded-lg text-[#131b2e] hover:text-[#005c55] font-medium"
                  >
                    • Việc làm đã ứng tuyển
                  </Link>
                  <div className="pt-1 border-t border-[#eaedff]/60">
                    <p className="text-[10px] uppercase font-bold text-[#6e7977] px-2 py-0.5">Ngành nổi bật</p>
                    {jobCategories.slice(0, 4).map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/jobs?category=${encodeURIComponent(cat.id)}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-1 px-2 rounded-lg text-[#3e4947] hover:text-[#005c55]"
                      >
                        • {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <NavLink
              to="/companies"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${isActive
                  ? 'bg-[#005c55] text-white'
                  : 'text-[#3e4947] hover:bg-[#eaedff]'
                }`
              }
            >
              Công ty hàng đầu
            </NavLink>

            <NavLink
              to="/career-guide"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${isActive
                  ? 'bg-[#005c55] text-white'
                  : 'text-[#3e4947] hover:bg-[#eaedff]'
                }`
              }
            >
              Cẩm nang nghề nghiệp
            </NavLink>
          </nav>

          <div className="pt-2 border-t border-[#eaedff] space-y-2">
            {currentUser ? (
              currentUser.role === 'recruiter' ? (
                <>
                  <div className="p-3 bg-[#e6f7f5] rounded-xl border border-[#80d5cb]/50">
                    <p className="text-xs font-bold text-[#005c55] truncate">
                      {currentUser.fullName || currentUser.company_name || 'Nhà tuyển dụng'}
                    </p>
                    <p className="text-[11px] text-[#3e4947] truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold text-[#005c55]">
                      Tài khoản Nhà tuyển dụng
                    </span>
                  </div>
                  <Link
                    to="/recruiter"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-2.5 px-3 flex items-center gap-2 text-xs font-bold text-white bg-[#005c55] rounded-xl hover:bg-[#007952] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    <span>Trang quản lý</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2 text-center text-xs font-bold text-[#ba1a1a] bg-[#ffdad6]/60 rounded-xl cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3 bg-[#e6f7f5] rounded-xl border border-[#80d5cb]/50">
                    <p className="text-xs font-bold text-[#005c55] truncate">
                      {currentUser.fullName || currentUser.fullname || (currentUser.email ? currentUser.email.split('@')[0] : 'Ứng viên')}
                    </p>
                    <p className="text-[11px] text-[#3e4947] truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold text-[#005c55]">
                      {currentUser.title || 'Ứng viên'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openChat();
                    }}
                    className="w-full py-2.5 px-3 flex items-center justify-between text-xs font-bold text-[#005c55] bg-[#e6f7f5] rounded-xl hover:bg-[#d5f3ee] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">forum</span>
                      <span>Đoạn chat Messenger</span>
                    </span>
                    {unreadTotal > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold">
                        {unreadTotal} mới
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2 text-center text-xs font-bold text-[#ba1a1a] bg-[#ffdad6]/60 rounded-xl cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </>
              )
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 py-2 text-center text-xs font-bold text-white bg-[#005c55] rounded-xl"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 py-2 text-center text-xs font-bold text-[#005c55] bg-[#eaedff] rounded-xl"
                  >
                    Đăng ký
                  </Link>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-[#e6f7f5] to-[#f2fbf9] border border-[#80d5cb]/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#005c55] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">business_center</span>
                      Dành cho Nhà tuyển dụng
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#97f5cc] text-[#002115]">
                      HR
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/recruiter/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-1.5 text-center text-xs font-bold text-white bg-[#005c55] rounded-lg shadow-sm"
                    >
                      Đăng nhập NTD
                    </Link>
                    <Link
                      to="/recruiter/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-1.5 text-center text-xs font-bold text-[#005c55] bg-white border border-[#80d5cb] rounded-lg"
                    >
                      Đăng ký NTD
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
