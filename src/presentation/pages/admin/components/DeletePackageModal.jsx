import React from 'react';

export default function DeletePackageModal({ isOpen, onClose, onConfirm, packageData, isDeleting }) {
  if (!isOpen || !packageData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#eaedff] overflow-hidden flex flex-col">
        {/* Header Warning */}
        <div className="p-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-inner">
            <span className="material-symbols-outlined text-[32px]">delete_forever</span>
          </div>

          <h3 className="text-lg font-bold text-[#131b2e]">
            Xác nhận xóa gói dịch vụ?
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed">
            Bạn đang chuẩn bị xóa hoặc ngừng bán gói{' '}
            <span className="font-bold text-[#131b2e]">"{packageData.name}"</span> (
            {packageData.durationDays} ngày - {Number(packageData.price).toLocaleString('vi-VN')} đ).
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-left text-[11px] text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1 text-amber-900">
              <span className="material-symbols-outlined text-[15px]">info</span>
              Lưu ý an toàn hệ thống:
            </div>
            <p>
              Nếu gói này đã từng có nhà tuyển dụng thanh toán đơn hàng, hệ thống sẽ tự động chuyển sang trạng thái <strong>Ngừng bán</strong> để đảm bảo tính toàn vẹn dữ liệu kế toán và hóa đơn.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-[#eaedff] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý...</span>
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
  );
}

