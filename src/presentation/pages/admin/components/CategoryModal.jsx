import React, { useState, useEffect, useRef } from 'react';

/**
 * CategoryModal - Modal Thêm mới hoặc Chỉnh sửa danh mục nghề nghiệp
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onSubmit: (data: { name: string, description: string }) => Promise<void>
 * - initialData: { id?: number, name?: string, description?: string } | null
 * - isSubmitting: boolean
 * - existingCategories: Array<{ id: number, name: string }>
 */
export default function CategoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
  existingCategories = [],
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);

  const isEdit = Boolean(initialData && initialData.id);

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
      } else {
        setName('');
        setDescription('');
      }
      setErrors({});

      // Auto focus after open
      const timer = setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      newErrors.name = 'Vui lòng nhập tên danh mục nghề nghiệp';
    } else if (trimmedName.length > 100) {
      newErrors.name = 'Tên danh mục không được vượt quá 100 ký tự';
    } else {
      // Check duplicate name
      const duplicate = existingCategories.some(
        (cat) =>
          cat.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
          cat.id !== initialData?.id
      );
      if (duplicate) {
        newErrors.name = 'Tên danh mục này đã tồn tại trên hệ thống';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      style={{ animation: 'catFadeIn .15s ease' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-[#eaedff] overflow-hidden flex flex-col"
        style={{ animation: 'catModalScale .2s cubic-bezier(.22,1,.36,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#eaedff] flex items-center justify-between bg-gradient-to-r from-white to-[#faf8ff]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#005c55] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">
                {isEdit ? 'edit_note' : 'add_circle'}
              </span>
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#131b2e] leading-snug">
                {isEdit ? 'Chỉnh Sửa Danh Mục Nghề Nghiệp' : 'Thêm Danh Mục Nghề Nghiệp Mới'}
              </h2>
              <p className="text-[12px] text-[#6e7977]">
                {isEdit ? `Cập nhật thông tin cho mã danh mục #${initialData.id}` : 'Nhập tên và mô tả chi tiết cho ngành nghề mới'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6e7977] hover:bg-[#f2f3ff] hover:text-[#131b2e] transition-colors disabled:opacity-50"
            title="Đóng (Esc)"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tên danh mục */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="category-name" className="text-[12px] font-bold text-[#131b2e] flex items-center gap-1">
                Tên danh mục <span className="text-[#ba1a1a]">*</span>
              </label>
              <span className={`text-[11px] font-medium ${name.length > 100 ? 'text-[#ba1a1a]' : 'text-[#6e7977]'}`}>
                {name.length}/100
              </span>
            </div>
            <input
              ref={nameInputRef}
              id="category-name"
              type="text"
              placeholder="Ví dụ: Công nghệ thông tin, Thiết kế đồ họa..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 bg-[#f2f3ff] text-[#131b2e] text-[13px] rounded-lg outline-none border transition-colors ${
                errors.name
                  ? 'border-[#ba1a1a] bg-[#ffdad6]/20 focus:border-[#ba1a1a]'
                  : 'border-transparent focus:border-[#005c55] focus:bg-white'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-[#ba1a1a] font-semibold mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors.name}
              </p>
            )}
          </div>

          {/* Mô tả */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="category-desc" className="text-[12px] font-bold text-[#131b2e]">
                Mô tả nghề nghiệp
              </label>
              <span className="text-[11px] text-[#6e7977]">(Tùy chọn)</span>
            </div>
            <textarea
              id="category-desc"
              rows={4}
              placeholder="Nhập thông tin tóm tắt hoặc các vị trí tiêu biểu thuộc danh mục này..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-[#f2f3ff] text-[#131b2e] text-[13px] rounded-lg outline-none border border-transparent focus:border-[#005c55] focus:bg-white transition-colors resize-none"
            />
            <p className="text-[11px] text-[#6e7977] mt-1">
              Gợi ý: Mô tả rõ ràng giúp nhà tuyển dụng và ứng viên dễ dàng phân loại công việc.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#eaedff]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#3e4947] rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#005c55] hover:bg-[#0f766e] text-white rounded-lg text-[12px] font-bold transition-all shadow-sm disabled:opacity-50 active:scale-[.98]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    {isEdit ? 'save' : 'check'}
                  </span>
                  <span>{isEdit ? 'Lưu thay đổi' : 'Thêm danh mục'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
