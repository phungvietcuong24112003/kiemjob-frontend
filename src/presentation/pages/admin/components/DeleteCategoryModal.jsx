import React, { useEffect } from 'react';

/**
 * DeleteCategoryModal - Modal xác nhận xóa danh mục nghề nghiệp
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: () => Promise<void>
 * - category: { id: number, name: string } | null
 * - isDeleting: boolean
 * - specializationCount: number — số chuyên môn thuộc danh mục (để cảnh báo CASCADE)
 */
export default function DeleteCategoryModal({
  isOpen,
  onClose,
  onConfirm,
  category,
  isDeleting = false,
  specializationCount = 0,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !category) return null;

  const hasSpecs = specializationCount > 0;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      style={{ animation: 'catFadeIn .15s ease' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md shadow-xl border border-[#eaedff] overflow-hidden"
        style={{ animation: 'catModalScale .2s cubic-bezier(.22,1,.36,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          {/* Header with warning icon */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">delete_forever</span>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#131b2e]">Xác nhận xóa danh mục</h3>
              <p className="text-[11px] text-[#6e7977]">Thao tác này sẽ xóa vĩnh viễn danh mục khỏi hệ thống</p>
            </div>
          </div>

          {/* Description content */}
          <div className="bg-[#faf8ff] p-3.5 rounded-lg border border-[#eaedff] text-[13px] text-[#3e4947] space-y-2">
            <p>
              Bạn có chắc chắn muốn xóa danh mục:
            </p>
            <div className="px-3 py-2 bg-white rounded-md border border-[#eaedff] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005c55] text-[18px]">category</span>
              <span className="font-bold text-[#131b2e] truncate">{category.name}</span>
              <span className="text-[11px] text-[#6e7977] bg-[#f2f3ff] px-2 py-0.5 rounded ml-auto shrink-0">
                ID #{category.id}
              </span>
            </div>

            {/* Cascade warning khi có chuyên môn */}
            {hasSpecs && (
              <div className="flex items-start gap-2 p-2.5 bg-[#ffdad6]/40 rounded-md border border-[#ffb4ab]/50">
                <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] mt-0.5 shrink-0">warning</span>
                <div className="text-[12px] text-[#93000a] leading-relaxed">
                  <p className="font-bold">
                    Danh mục này có {specializationCount} chuyên môn trực thuộc.
                  </p>
                  <p className="mt-0.5">
                    Việc xóa danh mục sẽ đồng thời xóa tất cả chuyên môn liên quan (ON DELETE CASCADE). Hành động này không thể hoàn tác.
                  </p>
                </div>
              </div>
            )}

            {!hasSpecs && (
              <p className="text-[11px] text-[#ba1a1a] leading-relaxed">
                * Lưu ý: Nếu danh mục này đang được tin tuyển dụng nào sử dụng, hệ thống sẽ từ chối xóa để đảm bảo toàn vẹn dữ liệu.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#3e4947] rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-lg text-[12px] font-bold transition-all shadow-sm disabled:opacity-50 active:scale-[.98]"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Xác nhận xóa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
