import React, { useState, useEffect, useRef } from 'react';
import { jobSpecializationApi } from '../../../../infrastructure/api';

/**
 * SpecializationModal - Modal thêm mới hoặc chỉnh sửa / xóa chuyên môn thuộc danh mục nghề nghiệp.
 *
 * Props:
 * - isOpen: boolean
 * - mode: 'add' | 'edit'
 * - category: { id: number, name: string } | null
 * - specialization: { id: number, name: string, jobCategoryId: number } | null (cho mode 'edit')
 * - existingSpecs: Array<{ id: number, name: string }> (danh sách chuyên môn hiện tại thuộc danh mục để kiểm tra trùng)
 * - onClose: () => void
 * - onSuccess: (message: string, actionType: 'add' | 'edit' | 'delete', item?: any) => void
 */
export default function SpecializationModal({
  isOpen,
  mode = 'add',
  category,
  specialization = null,
  existingSpecs = [],
  onClose,
  onSuccess,
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const nameInputRef = useRef(null);

  const isEdit = mode === 'edit';

  // Khởi tạo form khi mở modal
  useEffect(() => {
    if (isOpen) {
      if (isEdit && specialization) {
        setName(specialization.name || '');
      } else {
        setName('');
      }
      setError('');
      setIsConfirmingDelete(false);
      setIsSubmitting(false);
      setIsDeleting(false);

      const timer = setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
          nameInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isEdit, specialization]);

  // Đóng bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting && !isDeleting) {
        if (isConfirmingDelete) {
          setIsConfirmingDelete(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isDeleting, isConfirmingDelete, onClose]);

  if (!isOpen || !category) return null;

  // Validation
  const validate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Tên chuyên môn không được để trống');
      return false;
    }
    if (trimmed.length > 100) {
      setError('Tên chuyên môn tối đa 100 ký tự');
      return false;
    }

    // Kiểm tra trùng tên trong cùng danh mục cha (case-insensitive)
    const isDuplicate = existingSpecs.some(
      (s) =>
        s.name.trim().toLowerCase() === trimmed.toLowerCase() &&
        s.id !== specialization?.id
    );

    if (isDuplicate) {
      setError('Chuyên môn này đã tồn tại trong danh mục');
      return false;
    }

    setError('');
    return true;
  };

  // Submit Lưu (Thêm mới / Cập nhật)
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate() || isSubmitting || isDeleting) return;

    setIsSubmitting(true);
    const trimmedName = name.trim();

    try {
      if (isEdit && specialization?.id) {
        const updated = await jobSpecializationApi.updateSpecialization(
          specialization.id,
          {
            jobCategoryId: category.id,
            name: trimmedName,
          }
        );
        onSuccess(
          `Đã cập nhật chuyên môn "${trimmedName}" thành công!`,
          'edit',
          updated
        );
      } else {
        const created = await jobSpecializationApi.createSpecialization({
          jobCategoryId: category.id,
          name: trimmedName,
        });
        onSuccess(
          `Đã thêm chuyên môn "${trimmedName}" vào "${category.name}"!`,
          'add',
          created
        );
      }
      onClose();
    } catch (err) {
      console.error('[SpecializationModal] Lỗi lưu chuyên môn:', err);
      let errMsg = 'Không thể lưu chuyên môn.';
      if (
        err.message?.includes('409') ||
        err.message?.toLowerCase().includes('tồn tại')
      ) {
        errMsg = 'Tên chuyên môn này đã tồn tại trong danh mục.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xác nhận Xóa chuyên môn
  const handleDelete = async () => {
    if (!specialization?.id || isDeleting) return;

    setIsDeleting(true);
    try {
      await jobSpecializationApi.deleteSpecialization(specialization.id);
      onSuccess(
        `Đã xóa chuyên môn "${specialization.name}" thành công!`,
        'delete',
        specialization
      );
      onClose();
    } catch (err) {
      console.error('[SpecializationModal] Lỗi xóa chuyên môn:', err);
      let errMsg = 'Không thể xóa chuyên môn này.';
      if (err.message) errMsg = err.message;
      setError(errMsg);
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      style={{ animation: 'catFadeIn .15s ease' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md shadow-xl border border-[#eaedff] overflow-hidden flex flex-col"
        style={{ animation: 'catModalScale .2s cubic-bezier(.22,1,.36,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-[#eaedff] flex items-center justify-between bg-gradient-to-r from-white to-[#faf8ff]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 ${
                isEdit ? 'bg-[#005c55]' : 'bg-[#005c55]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isEdit ? 'edit' : 'add_circle'}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-[#131b2e] leading-snug truncate">
                {isEdit ? 'Chỉnh Sửa Chuyên Môn' : 'Thêm Chuyên Môn Mới'}
              </h2>
              <p className="text-[12px] text-[#6e7977] truncate">
                Danh mục:{' '}
                <strong className="text-[#005c55] font-semibold">
                  {category.name}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6e7977] hover:bg-[#f2f3ff] hover:text-[#131b2e] transition-colors disabled:opacity-50 shrink-0"
            title="Đóng (Esc)"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="p-6 space-y-4">
          {/* Cảnh báo xác nhận xóa (khi nhấn nút Xóa) */}
          {isConfirmingDelete ? (
            <div className="p-4 rounded-lg bg-[#ffdad6]/40 border border-[#ffb4ab] text-[13px] space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#ba1a1a] text-[20px] shrink-0 mt-0.5">
                  warning
                </span>
                <div>
                  <p className="font-bold text-[#93000a]">
                    Xác nhận xóa chuyên môn này?
                  </p>
                  <p className="text-[#6e7977] text-[12px] mt-1 leading-relaxed">
                    Bạn sắp xóa chuyên môn{' '}
                    <strong className="text-[#131b2e]">
                      "{specialization?.name}"
                    </strong>
                    . Chuyên môn này sẽ bị gỡ khỏi các tin tuyển dụng liên quan
                    và không thể phục hồi.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-white hover:bg-[#f2f3ff] text-[#3e4947] rounded-lg text-[12px] font-semibold transition-colors border border-[#eaedff] disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 active:scale-[.98]"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">
                        delete
                      </span>
                      <span>Xác nhận xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="spec-name"
                    className="text-[12px] font-bold text-[#131b2e] flex items-center gap-1"
                  >
                    Tên chuyên môn <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-medium ${
                      name.length > 100 ? 'text-[#ba1a1a]' : 'text-[#6e7977]'
                    }`}
                  >
                    {name.length}/100
                  </span>
                </div>
                <input
                  ref={nameInputRef}
                  id="spec-name"
                  type="text"
                  placeholder="Ví dụ: Backend, Frontend, Full Stack, Digital Marketing..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={isSubmitting || isDeleting}
                  className={`w-full px-3.5 py-2.5 bg-[#f2f3ff] text-[#131b2e] text-[13px] rounded-lg outline-none border transition-colors ${
                    error
                      ? 'border-[#ba1a1a] bg-[#ffdad6]/20 focus:border-[#ba1a1a]'
                      : 'border-transparent focus:border-[#005c55] focus:bg-white'
                  }`}
                />
                {error && (
                  <p className="text-[11px] text-[#ba1a1a] font-semibold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      error
                    </span>
                    {error}
                  </p>
                )}
                <p className="text-[11px] text-[#6e7977] mt-1.5">
                  Chuyên môn sẽ thuộc danh mục{' '}
                  <strong className="text-[#131b2e] font-semibold">
                    {category.name}
                  </strong>
                  .
                </p>
              </div>

              {/* ── Modal Actions ── */}
              <div className="flex items-center justify-between pt-3 border-t border-[#eaedff]">
                {/* Nút xóa bên trái (chỉ hiện khi sửa) */}
                {isEdit ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    disabled={isSubmitting || isDeleting}
                    className="flex items-center gap-1 px-3 py-2 text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      delete
                    </span>
                    <span>Xóa</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting || isDeleting}
                    className="px-4 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#3e4947] rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isDeleting}
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
                          {isEdit ? 'save' : 'add'}
                        </span>
                        <span>{isEdit ? 'Lưu thay đổi' : 'Thêm chuyên môn'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
