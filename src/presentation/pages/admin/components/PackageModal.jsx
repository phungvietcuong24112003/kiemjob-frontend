import React, { useState } from 'react';

export default function PackageModal({ isOpen, onClose, onSave, packageData, isSubmitting }) {
  const isEdit = Boolean(packageData?.id);
  const [formData, setFormData] = useState({
    name: packageData?.name || '',
    durationDays: packageData?.durationDays || 7,
    price: packageData?.price || 100000,
    description: packageData?.description || '',
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên gói';
    }
    if (!formData.durationDays || Number(formData.durationDays) <= 0) {
      newErrors.durationDays = 'Thời hạn phải lớn hơn 0 ngày';
    }
    if (formData.price === '' || Number(formData.price) <= 0) {
      newErrors.price = 'Giá gói phải lớn hơn 0 VNĐ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      name: formData.name.trim(),
      durationDays: Number(formData.durationDays),
      price: Number(formData.price),
      description: formData.description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#eaedff] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#283044] to-[#131b2e] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-teal-300">
              <span className="material-symbols-outlined text-[20px]">
                {isEdit ? 'edit_note' : 'add_box'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isEdit ? 'Chỉnh sửa Gói Nổi Bật' : 'Tạo Gói Nổi Bật Mới'}
              </h3>
              <p className="text-[11px] text-white/70">
                {isEdit ? `Mã gói: #${packageData.id}` : 'Thêm gói dịch vụ quảng bá tin tuyển dụng'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tên gói */}
          <div>
            <label className="block text-xs font-bold text-[#131b2e] uppercase tracking-wider mb-1.5">
              Tên gói dịch vụ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Gói Nổi Bật 1 Ngày, Gói Nổi Bật 7 Ngày,..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
                errors.name
                  ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                  : 'border-[#cfd5e2] focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors.name}
              </p>
            )}
          </div>

          {/* Hàng 2: Thời hạn & Giá */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#131b2e] uppercase tracking-wider mb-1.5">
                Thời hạn (Số ngày) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  placeholder="1, 7, 14, 30..."
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                  className={`w-full pl-3.5 pr-14 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none transition-all ${
                    errors.durationDays
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                      : 'border-[#cfd5e2] focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10'
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  ngày
                </span>
              </div>
              {/* Quick pills */}
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFormData({ ...formData, durationDays: d })}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all ${
                      Number(formData.durationDays) === d
                        ? 'bg-[#0f766e] text-white border-[#0f766e]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {d}N
                  </button>
                ))}
              </div>
              {errors.durationDays && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.durationDays}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#131b2e] uppercase tracking-wider mb-1.5">
                Giá niêm yết (VNĐ) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  placeholder="VD: 50000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={`w-full pl-3.5 pr-12 py-2.5 rounded-xl border text-sm font-bold text-[#005c55] focus:outline-none transition-all ${
                    errors.price
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                      : 'border-[#cfd5e2] focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10'
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  đ
                </span>
              </div>
              {formData.price && (
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  ≈ {Number(formData.price).toLocaleString('vi-VN')} VNĐ
                </p>
              )}
              {errors.price && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.price}</p>
              )}
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-bold text-[#131b2e] uppercase tracking-wider mb-1.5">
              Mô tả quyền lợi & tính năng
            </label>
            <textarea
              rows={3}
              placeholder="VD: Tin tuyển dụng được gắn nhãn nổi bật, ưu tiên hiển thị trên trang chủ và đầu danh sách việc làm..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#cfd5e2] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10 transition-all resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-[#eaedff] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#0d635c] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{isEdit ? 'Lưu thay đổi' : 'Tạo gói ngay'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

