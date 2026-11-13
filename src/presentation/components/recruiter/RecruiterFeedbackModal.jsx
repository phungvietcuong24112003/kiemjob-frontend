import React, { useState } from 'react';
import { feedbackApi } from '../../../infrastructure/api';
import { X, Star, Check } from 'lucide-react';

/**
 * RecruiterFeedbackModal - Góp ý cho nền tảng KiemJob
 * Thiết kế cổ điển, phẳng, nghiêm túc (border 1px, bo 2px, Source Serif 4, Navy accent)
 */
export default function RecruiterFeedbackModal({ isOpen, onClose, currentUser }) {
  const [subject, setSubject] = useState('Giao diện & Trải nghiệm');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const categories = [
    'Giao diện tuyển dụng',
    'Đăng tin & Quản lý tin',
    'Quản lý ứng viên (ATS)',
    'Dịch vụ & Thanh toán',
    'Góp ý tính năng mới',
    'Khác',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError('');

    try {
      await feedbackApi.sendFeedback({
        subject: subject,
        category: subject,
        rating: Number(rating),
        content: content.trim(),
        email: currentUser?.email || '',
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setContent('');
        onClose();
      }, 2000);
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi gửi góp ý. Vui lòng thử lại sau.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-white rounded-[2px] border border-[#cfcac0] overflow-hidden flex flex-col text-[#1c1c1c]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-white border-b border-[#cfcac0] flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-[#1c1c1c]">Góp ý nền tảng KiemJob</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5a5a5a] hover:text-[#1c1c1c] p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {success ? (
          <div className="p-8 text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border border-[#2e6b3a] text-[#2e6b3a] flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base font-bold text-[#1c1c1c]">Cảm ơn Quý doanh nghiệp</h4>
            <p className="text-xs text-[#5a5a5a] max-w-xs leading-relaxed">
              Ý kiến đóng góp đã được ghi nhận để cải tiến chất lượng dịch vụ tuyển dụng.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-2.5 rounded-[2px] bg-[#f6f5f1] border border-[#cfcac0] border-l-[3px] border-l-[#9b1c1c] text-xs text-[#1c1c1c]">
                {error}
              </div>
            )}

            {/* Chủ đề */}
            <div>
              <label className="block text-xs font-semibold text-[#1c1c1c] mb-1.5">
                Chủ đề góp ý
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSubject(cat)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-[2px] border text-left transition-colors cursor-pointer ${
                      subject === cat
                        ? 'bg-[#1f3a5f] text-white border-[#1f3a5f]'
                        : 'border-[#cfcac0] text-[#1c1c1c] hover:bg-[#ecebe5]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Đánh giá sao */}
            <div>
              <label className="block text-xs font-semibold text-[#1c1c1c] mb-1">
                Mức độ hài lòng
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        s <= rating
                          ? 'fill-[#8a5a00] text-[#8a5a00]'
                          : 'fill-transparent text-[#cfcac0]'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-[#5a5a5a] ml-2 font-medium">
                  {rating === 5 ? 'Rất hài lòng' : rating >= 4 ? 'Hài lòng' : rating === 3 ? 'Bình thường' : 'Cần cải thiện'}
                </span>
              </div>
            </div>

            {/* Nội dung */}
            <div>
              <label className="block text-xs font-semibold text-[#1c1c1c] mb-1">
                Nội dung chi tiết <span className="text-[#9b1c1c]">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ ý kiến đóng góp hoặc tính năng mong muốn cải tiến..."
                className="w-full p-2.5 rounded-[2px] border border-[#cfcac0] text-xs text-[#1c1c1c] focus:outline-none focus:border-[#1f3a5f] resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#cfcac0]">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3.5 text-xs font-medium text-[#1c1c1c] border border-[#cfcac0] hover:bg-[#ecebe5] rounded-[2px] transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-8 px-4 text-xs font-semibold text-white bg-[#1f3a5f] hover:bg-[#162b47] rounded-[2px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Đang gửi...' : 'Gửi góp ý'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
