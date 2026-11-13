import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { featurePackageApi } from '../../../infrastructure/api';
import PackageModal from './components/PackageModal';
import DeletePackageModal from './components/DeletePackageModal';

export default function FeaturePackageManagementPage() {
  const [packages, setPackages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('packages'); // 'packages' | 'orders'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [durationFilter, setDurationFilter] = useState('all'); // 'all', '1', '7', '14', 'other'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Modals
  const [modalState, setModalState] = useState({ isOpen: false, data: null });
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 3200);
  };

  // Fetch all packages and orders
  const loadData = async () => {
    setLoading(true);
    try {
      const pkgs = await featurePackageApi.getAllPackages();
      setPackages(Array.isArray(pkgs) ? pkgs : []);

      try {
        const orderList = await featurePackageApi.getAllOrders();
        setOrders(Array.isArray(orderList) ? orderList : []);
      } catch (orderErr) {
        console.warn('Không tải được danh sách đơn hàng:', orderErr);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách gói mua:', err);
      showToast(err.message || 'Không thể tải danh sách gói dịch vụ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Keyword search
      const q = searchTerm.trim().toLowerCase();
      const matchName = pkg.name?.toLowerCase().includes(q);
      const matchDesc = pkg.description?.toLowerCase().includes(q);
      if (q && !matchName && !matchDesc) return false;

      // Duration filter
      if (durationFilter === '1' && pkg.durationDays !== 1) return false;
      if (durationFilter === '7' && pkg.durationDays !== 7) return false;
      if (durationFilter === '14' && pkg.durationDays !== 14) return false;
      if (durationFilter === 'other' && [1, 7, 14].includes(pkg.durationDays)) return false;

      // Status filter
      if (statusFilter === 'active' && !pkg.isActive) return false;
      if (statusFilter === 'inactive' && pkg.isActive) return false;

      return true;
    });
  }, [packages, searchTerm, durationFilter, statusFilter]);

  // KPI stats
  const stats = useMemo(() => {
    const total = packages.length;
    const active = packages.filter((p) => p.isActive).length;
    const inactive = total - active;
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    return { total, active, inactive, totalOrders, totalRevenue };
  }, [packages, orders]);

  // Toggle active status
  const handleToggleActive = async (pkg) => {
    setTogglingId(pkg.id);
    const nextStatus = !pkg.isActive;
    try {
      await featurePackageApi.updateActiveStatus(pkg.id, { isActive: nextStatus });
      setPackages((prev) =>
        prev.map((item) => (item.id === pkg.id ? { ...item, isActive: nextStatus } : item))
      );
      showToast(
        `Đã ${nextStatus ? 'kích hoạt mở bán' : 'tạm dừng kinh doanh'} gói "${pkg.name}"`,
        'success'
      );
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái:', err);
      showToast(err.message || 'Không thể cập nhật trạng thái gói', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Save (Create or Update)
  const handleSavePackage = async (formData) => {
    setIsSubmitting(true);
    try {
      if (modalState.data?.id) {
        // Update
        const updated = await featurePackageApi.updatePackage(modalState.data.id, formData);
        setPackages((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        showToast(`Đã cập nhật gói "${updated.name}" thành công!`);
      } else {
        // Create
        const created = await featurePackageApi.createPackage(formData);
        setPackages((prev) => [created, ...prev]);
        showToast(`Đã tạo mới gói "${created.name}" thành công!`);
      }
      setModalState({ isOpen: false, data: null });
    } catch (err) {
      console.error('Lỗi lưu gói:', err);
      showToast(err.message || 'Có lỗi xảy ra khi lưu gói dịch vụ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / Discontinue
  const handleDeletePackage = async () => {
    if (!deleteModalState.data) return;
    setIsDeleting(true);
    const targetId = deleteModalState.data.id;
    const targetName = deleteModalState.data.name;
    try {
      await featurePackageApi.permanentDeletePackage(targetId);
      // Reload to ensure state matches backend (in case backend soft-deleted it)
      await loadData();
      showToast(`Đã xử lý xóa / ngừng bán gói "${targetName}" thành công!`);
      setDeleteModalState({ isOpen: false, data: null });
    } catch (err) {
      console.error('Lỗi xóa gói:', err);
      showToast(err.message || 'Không thể xóa gói dịch vụ', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Seed default 1, 7, 14 days packages if empty or requested
  const handleSeedDefaults = async () => {
    const defaults = [
      {
        name: 'Gói Nổi Bật 1 Ngày',
        description: 'Tin tuyển dụng được gắn nhãn nổi bật, ưu tiên hiển thị trên trang chủ và đầu danh sách tìm kiếm trong 24 giờ.',
        price: 50000,
        durationDays: 1,
      },
      {
        name: 'Gói Nổi Bật 7 Ngày',
        description: 'Hiển thị nổi bật trong 7 ngày, gắn huy hiệu HOT, tự động gợi ý cho ứng viên tiềm năng, tiếp cận ứng viên gấp 3 lần.',
        price: 280000,
        durationDays: 7,
      },
      {
        name: 'Gói Nổi Bật 14 Ngày',
        description: 'Gói quảng bá tối ưu 14 ngày, gắn huy hiệu VIP & HOT, đẩy top tự động liên tục, xuất hiện trang chủ và đầu trang tìm kiếm.',
        price: 490000,
        durationDays: 14,
      },
    ];

    setLoading(true);
    let addedCount = 0;
    try {
      for (const item of defaults) {
        const exists = packages.some((p) => p.name.toLowerCase() === item.name.toLowerCase());
        if (!exists) {
          await featurePackageApi.createPackage(item);
          addedCount++;
        }
      }
      await loadData();
      if (addedCount > 0) {
        showToast(`Đã nạp thành công ${addedCount} gói nổi bật mẫu (1 ngày, 7 ngày, 14 ngày)!`);
      } else {
        showToast('Các gói nổi bật mặc định đã tồn tại trong hệ thống.');
      }
    } catch (err) {
      console.error('Lỗi nạp gói mặc định:', err);
      showToast(err.message || 'Không thể nạp gói mặc định', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Package Card Color Config based on duration
  const getPackageStyle = (days) => {
    if (days === 1) {
      return {
        badgeText: 'Dùng Thử 24H',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        gradientHeader: 'from-emerald-500 to-teal-600',
        borderFocus: 'hover:border-emerald-500',
        icon: 'timer',
        tagColor: 'text-emerald-700 bg-emerald-50',
      };
    }
    if (days === 7) {
      return {
        badgeText: 'Phổ Biến Nhất',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        gradientHeader: 'from-indigo-600 to-blue-600',
        borderFocus: 'hover:border-indigo-500',
        icon: 'local_fire_department',
        tagColor: 'text-indigo-700 bg-indigo-50',
      };
    }
    if (days === 14) {
      return {
        badgeText: 'VIP Hiệu Quả Cao',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
        gradientHeader: 'from-amber-500 to-orange-600',
        borderFocus: 'hover:border-amber-500',
        icon: 'workspace_premium',
        tagColor: 'text-amber-800 bg-amber-50',
      };
    }
    return {
      badgeText: `${days} Ngày`,
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
      gradientHeader: 'from-[#283044] to-[#131b2e]',
      borderFocus: 'hover:border-slate-400',
      icon: 'auto_awesome',
      tagColor: 'text-slate-700 bg-slate-50',
    };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-semibold transition-all transform animate-bounce-short ${
            toast.type === 'error'
              ? 'bg-red-600 text-white shadow-red-500/30'
              : 'bg-[#0f766e] text-white shadow-[#0f766e]/30'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-[#eaedff] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-[18px] font-bold text-[#131b2e] tracking-tight">
            Quản Lý Các Gói Mua Nổi Bật
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setModalState({ isOpen: true, data: null })}
            className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d635c] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Tạo Gói Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Packages */}
        <div className="bg-white p-5 rounded-xl border border-[#eaedff] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">view_agenda</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Tổng số gói</p>
            <p className="text-[20px] font-bold text-[#131b2e]">{stats.total}</p>
          </div>
        </div>

        {/* Active Packages */}
        <div className="bg-white p-5 rounded-xl border border-[#eaedff] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Đang mở bán</p>
            <p className="text-[20px] font-bold text-emerald-600">{stats.active}</p>
          </div>
        </div>

        {/* Inactive Packages */}
        <div className="bg-white p-5 rounded-xl border border-[#eaedff] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">pause_circle</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Tạm dừng bán</p>
            <p className="text-[20px] font-bold text-slate-600">{stats.inactive}</p>
          </div>
        </div>

        {/* Revenue / Orders */}
        <div className="bg-white p-5 rounded-xl border border-[#eaedff] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">payments</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Doanh thu mua gói</p>
            <p className="text-base sm:text-lg font-black text-amber-700">
              {stats.totalRevenue.toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-[#eaedff]">
        <button
          onClick={() => setActiveTab('packages')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'packages'
              ? 'border-[#0f766e] text-[#0f766e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
          <span>Danh Sách Gói Nổi Bật ({packages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'border-[#0f766e] text-[#0f766e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Lịch Sử Đơn Mua ({orders.length})</span>
        </button>
      </div>

      {/* TAB 1: Gói Nổi Bật */}
      {activeTab === 'packages' && (
        <div className="space-y-5">
          {/* Controls bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#eaedff] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm theo tên gói, mô tả quyền lợi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Filter buttons & View toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Duration filter */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: '1', label: '1 Ngày' },
                  { key: '7', label: '7 Ngày' },
                  { key: '14', label: '14 Ngày' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setDurationFilter(item.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      durationFilter === item.key
                        ? 'bg-white text-[#131b2e] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="active">Đang mở bán</option>
                <option value="inactive">Đã tạm dừng</option>
              </select>

              {/* View Switcher */}
              <div className="flex items-center rounded-xl border border-slate-200 p-0.5 bg-slate-50">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white text-[#0f766e] shadow-sm'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Dạng thẻ gói"
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-[#0f766e] shadow-sm'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Dạng bảng chi tiết"
                >
                  <span className="material-symbols-outlined text-[18px]">table_rows</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#eaedff]">
              <div className="w-10 h-10 border-4 border-[#0f766e]/20 border-t-[#0f766e] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500">Đang tải danh sách gói dịch vụ...</p>
            </div>
          ) : filteredPackages.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center bg-white rounded-3xl border border-[#eaedff] space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-[32px]">folder_off</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#131b2e]">Không tìm thấy gói nào phù hợp</h4>
                <p className="text-xs text-slate-500">
                  Hãy thử đổi bộ lọc hoặc bấm nút "Nạp 3 Gói Mẫu" để khởi tạo gói 1 ngày, 7 ngày và 14 ngày.
                </p>
              </div>
              <button
                onClick={handleSeedDefaults}
                className="px-4 py-2 rounded-xl bg-[#0f766e] text-white text-xs font-bold hover:bg-[#0d635c] transition-colors"
              >
                Nạp 3 Gói Mặc Định
              </button>
            </div>
          ) : viewMode === 'cards' ? (
            /* CARDS GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPackages.map((pkg) => {
                const style = getPackageStyle(pkg.durationDays);
                const dailyPrice = Math.round(pkg.price / pkg.durationDays);

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl ${
                      pkg.isActive
                        ? `border-[#eaedff] ${style.borderFocus}`
                        : 'border-slate-200 opacity-75 grayscale-20'
                    }`}
                  >
                    {/* Header Strip with Color Gradient */}
                    <div className={`p-5 bg-gradient-to-r ${style.gradientHeader} text-white flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[22px]">{style.icon}</span>
                        <span className="text-xs font-black uppercase tracking-wider">
                          {style.badgeText}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold">
                        #{pkg.id}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                      <div>
                        {/* Name & Active Badge */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-extrabold text-lg text-[#131b2e] leading-snug">
                            {pkg.name}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                              pkg.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {pkg.isActive ? 'Đang Bán' : 'Tạm Dừng'}
                          </span>
                        </div>

                        {/* Price & Duration */}
                        <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[20px] font-bold text-[#005c55]">
                              {Number(pkg.price).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs font-bold text-slate-500">VNĐ</span>
                            <span className="text-xs text-slate-400 font-medium ml-1">
                              / {pkg.durationDays} ngày
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-teal-600">
                              savings
                            </span>
                            <span>Khoảng {dailyPrice.toLocaleString('vi-VN')} đ / ngày</span>
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 leading-relaxed min-h-[48px]">
                          {pkg.description || 'Chưa có mô tả chi tiết quyền lợi cho gói này.'}
                        </p>

                        {/* Perks checklist */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-emerald-600">check</span>
                            <span>Ghim ưu tiên đầu danh sách tìm kiếm</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-emerald-600">check</span>
                            <span>Gắn nhãn nổi bật thu hút ứng viên</span>
                          </div>
                          {pkg.durationDays >= 7 && (
                            <div className="flex items-center gap-2 font-semibold text-indigo-700">
                              <span className="material-symbols-outlined text-[16px] text-indigo-600">bolt</span>
                              <span>Tự động đẩy top hàng ngày</span>
                            </div>
                          )}
                          {pkg.durationDays >= 14 && (
                            <div className="flex items-center gap-2 font-semibold text-amber-700">
                              <span className="material-symbols-outlined text-[16px] text-amber-600">star</span>
                              <span>Huy hiệu VIP xuất hiện trang chủ</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        {/* Toggle active switch */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={pkg.isActive}
                            onChange={() => handleToggleActive(pkg)}
                            disabled={togglingId === pkg.id}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0f766e]" />
                          <span className="text-[11px] font-bold text-slate-600">
                            {pkg.isActive ? 'Mở bán' : 'Tắt'}
                          </span>
                        </label>

                        {/* Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModalState({ isOpen: true, data: pkg })}
                            className="p-2 rounded-xl text-slate-600 hover:text-[#0f766e] hover:bg-teal-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa gói"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteModalState({ isOpen: true, data: pkg })}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa / Ngừng bán"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-white rounded-3xl border border-[#eaedff] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-[#eaedff] text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-6">ID</th>
                      <th className="py-4 px-6">Tên Gói</th>
                      <th className="py-4 px-6">Thời Hạn</th>
                      <th className="py-4 px-6">Giá Niêm Yết</th>
                      <th className="py-4 px-6">Giá / Ngày</th>
                      <th className="py-4 px-6">Trạng Thái</th>
                      <th className="py-4 px-6 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-[#131b2e]">
                    {filteredPackages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-400">#{pkg.id}</td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-sm text-[#131b2e]">{pkg.name}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {pkg.description || 'Không có mô tả'}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
                            {pkg.durationDays} ngày
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-base text-[#005c55]">
                          {Number(pkg.price).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {Math.round(pkg.price / pkg.durationDays).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleActive(pkg)}
                            disabled={togglingId === pkg.id}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                              pkg.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {pkg.isActive ? 'Đang mở bán' : 'Tạm dừng'}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setModalState({ isOpen: true, data: pkg })}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-[#0f766e] hover:bg-teal-50 transition-colors"
                              title="Sửa gói"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteModalState({ isOpen: true, data: pkg })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Xóa gói"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Lịch Sử Đơn Mua Gói */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-[#eaedff] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#eaedff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-[#131b2e]">
                Danh Sách Đơn Hàng Mua Gói Nổi Bật
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ giao dịch mua gói quảng bá tin tuyển dụng từ các nhà tuyển dụng
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-full">
                {orders.length} đơn hàng
              </span>
              <Link
                to="/admin/invoices"
                className="px-4 py-2 rounded-xl bg-[#005c55] hover:bg-[#0f766e] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Mở Trang Quản Lý Hóa Đơn & Đẩy Top</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-[32px]">receipt_long</span>
              </div>
              <p className="text-sm font-bold text-[#131b2e]">Chưa có đơn hàng mua gói nào</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Khi các nhà tuyển dụng tiến hành thanh toán mua các gói nổi bật 1 ngày, 7 ngày hoặc 14 ngày, thông tin hóa đơn sẽ hiển thị chi tiết tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-[#eaedff] text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Mã Đơn</th>
                    <th className="py-4 px-6">Gói Mua</th>
                    <th className="py-4 px-6">Mã Recruiter</th>
                    <th className="py-4 px-6">Số Tiền</th>
                    <th className="py-4 px-6">Trạng Thái</th>
                    <th className="py-4 px-6">Ngày Tạo</th>
                    <th className="py-4 px-6">Ngày Thanh Toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-[#131b2e]">
                  {orders.map((ord) => {
                    const isPaid = ord.status === 'paid';
                    const isPending = ord.status === 'pending';

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-600">#{ord.id}</td>
                        <td className="py-4 px-6 font-bold text-[#131b2e]">{ord.planName}</td>
                        <td className="py-4 px-6 text-slate-500">Recruiter #{ord.recruiterId}</td>
                        <td className="py-4 px-6 font-bold text-sm text-[#005c55]">
                          {Number(ord.amount).toLocaleString('vi-VN')} {ord.currency || 'VND'}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isPaid ? 'Đã Thanh Toán' : isPending ? 'Chờ Xử Lý' : ord.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {ord.paidAt ? new Date(ord.paidAt).toLocaleString('vi-VN') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Tạo / Sửa gói */}
      <PackageModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, data: null })}
        onSave={handleSavePackage}
        packageData={modalState.data}
        isSubmitting={isSubmitting}
      />

      {/* Modal Xóa gói */}
      <DeletePackageModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, data: null })}
        onConfirm={handleDeletePackage}
        packageData={deleteModalState.data}
        isDeleting={isDeleting}
      />
    </div>
  );
}

