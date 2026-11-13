import React, { useState, useEffect, useRef } from 'react';
import { chatApi, feedbackApi } from '../../../infrastructure/api';
import { useChat } from '../../../application/context/ChatContext';

export default function FloatingWidgets() {
  // Use centralized chat context
  const {
    currentUser,
    isLoggedIn,
    conversations,
    activeConversationId,
    activeConversation,
    isChatOpen,
    isMinimized,
    messages,
    unreadTotal,
    wsConnected,
    openChat,
    closeChat,
    minimizeChat,
    restoreChat,
    sendMessage,
  } = useChat();

  // Feedback modal states
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('Giao diện & Trải nghiệm');
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // Chat local input
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update or chat opens
  useEffect(() => {
    if (isChatOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen, isMinimized]);

  // Send message
  const handleSendMessage = (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text);
    setInputText('');
  };

  // Quick message template click
  const handleQuickTemplate = (tpl) => {
    setInputText(tpl);
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setFeedbackLoading(true);
    setFeedbackError('');
    try {
      await feedbackApi.sendFeedback({
        subject: feedbackCategory,
        category: feedbackCategory,
        rating,
        content: feedbackText.trim(),
        email: contactEmail.trim() || currentUser?.email || '',
      });
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setFeedbackSubmitted(false);
        setFeedbackText('');
        setFeedbackError('');
      }, 2000);
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi gửi góp ý. Vui lòng đăng nhập để tiếp tục.';
      setFeedbackError(errMsg);
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING ACTION BUTTONS (Góc dưới bên phải - Góp ý & Chat Messenger)   */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3 print:hidden">
        {/* Nút 1: Góp ý phản hồi (luôn hiển thị để người dùng đóng góp ý kiến) */}
        <div className="group relative flex items-center justify-center">
          <button
            id="btn-open-feedback"
            type="button"
            onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
            aria-label="Góp ý phản hồi"
            className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white text-[#131b2e] border border-slate-200/90 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 hover:text-[#005c55] hover:border-[#005c55]/40 focus:outline-none cursor-pointer"
            title="Đóng góp ý kiến"
          >
            <span className="material-symbols-outlined text-[24px]">rate_review</span>
          </button>
          {/* Tooltip */}
          <span className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white font-medium text-xs whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
            Đóng góp ý kiến
          </span>
        </div>

        {/* Nút 2: Chat Facebook style (CHỈ HIỂN THỊ KHI ĐÃ ĐĂNG NHẬP và chat chưa mở) */}
        {isLoggedIn && !isChatOpen && (
          <div className="group relative flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            <button
              id="btn-open-chat"
              type="button"
              onClick={() => openChat()}
              aria-label="Đoạn chat KiemJob"
              className="relative w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-[#005c55] text-white shadow-xl shadow-[#005c55]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 hover:bg-[#007952] focus:outline-none border-2 border-white/30 cursor-pointer"
              title="Đoạn chat (Messenger)"
            >
              {/* Facebook Messenger SVG Icon */}
              <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.735 7.205V22l3.39-1.86c.928.257 1.916.396 2.875.396 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.443l-2.58-2.753-5.034 2.753 5.539-5.88 2.65 2.753 4.965-2.753-5.54 5.88z" />
              </svg>

              {/* Online pulse indicator */}
              <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-[#005c55]" />
              </span>

              {/* Unread badge */}
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -left-1 px-1.5 min-w-[20px] h-[20px] bg-[#ba1a1a] text-white text-[10px] rounded-full flex items-center justify-center font-bold ring-2 ring-white shadow-sm">
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </button>
            {/* Tooltip */}
            <span className="pointer-events-none absolute right-18 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 text-white font-medium text-xs whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
              Đoạn chat ({conversations.length} cuộc trò chuyện)
            </span>
          </div>
        )}

        {/* Nút 3: Facebook Chat Head khi đang thu nhỏ (Minimized) */}
        {isLoggedIn && isChatOpen && isMinimized && (
          <div className="group relative flex items-center justify-center animate-in zoom-in-75 duration-200">
            <button
              type="button"
              onClick={restoreChat}
              aria-label="Mở lại đoạn chat"
              className="relative w-14 h-14 sm:w-15 sm:h-15 rounded-full p-0.5 bg-white shadow-2xl ring-3 ring-[#005c55] hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none cursor-pointer overflow-hidden"
              title={`Mở lại chat: ${activeConversation?.recruiterName || 'Nhà tuyển dụng'}`}
            >
              {activeConversation?.companyLogo || activeConversation?.avatar ? (
                <img
                  src={activeConversation.companyLogo || activeConversation.avatar}
                  alt={activeConversation?.recruiterName || activeConversation?.companyName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-sm">
                  {(activeConversation?.companyName || activeConversation?.recruiterName || 'N').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </button>

            {/* Quick close button on hover */}
            <button
              type="button"
              onClick={closeChat}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs hover:bg-red-600 shadow-md transition-colors cursor-pointer"
              title="Đóng đoạn chat"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>

            {/* Tooltip */}
            <span className="pointer-events-none absolute right-18 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 text-white font-medium text-xs whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
              Bấm để mở chat với {activeConversation?.recruiterName}
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. MODAL GÓP Ý PHẢN HỒI (Feedback Dialog)                                 */}
      {/* ========================================================================= */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150 print:hidden">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-[#005c55] to-[#007952] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[24px]">rate_review</span>
                <h3 className="font-bold text-base sm:text-lg">Đóng góp ý kiến cho KiemJob</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content Form */}
            {feedbackSubmitted ? (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>
                <h4 className="font-bold text-lg text-[#131b2e]">Cảm ơn bạn rất nhiều!</h4>
                <p className="text-sm text-slate-500">
                  Ý kiến của bạn đã được gửi tới đội ngũ phát triển để không ngừng hoàn thiện trải nghiệm KiemJob.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="p-5 space-y-4">
                {feedbackError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                    <span>{feedbackError}</span>
                  </div>
                )}
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Chủ đề phản hồi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Giao diện & Trải nghiệm',
                      'Báo lỗi tính năng',
                      'Đề xuất tính năng mới',
                      'Khiếu nại & Khác',
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFeedbackCategory(cat)}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                          feedbackCategory === cat
                            ? 'bg-[#005c55]/10 border-[#005c55] text-[#005c55] shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Stars */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Đánh giá mức độ hài lòng
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="p-1 hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                      >
                        <span
                          className={`material-symbols-outlined text-[28px] ${
                            s <= rating ? 'text-amber-400' : 'text-slate-300'
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                    <span className="text-xs text-slate-500 ml-2 font-medium">
                      {rating === 5 ? 'Rất hài lòng' : rating >= 3 ? 'Hài lòng' : 'Cần cải thiện'}
                    </span>
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Nội dung đóng góp ý kiến <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Mô tả chi tiết ý kiến, trải nghiệm hoặc lỗi bạn gặp phải..."
                    className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55] resize-none"
                  />
                </div>

                {/* Contact info (optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Email nhận phản hồi (tùy chọn)
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={currentUser?.email || 'email@example.com'}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55]"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFeedbackOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={feedbackLoading}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#005c55] hover:bg-[#007952] rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {feedbackLoading ? (
                      <span>Đang gửi...</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        <span>Gửi phản hồi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FACEBOOK-STYLE DOCKED CHAT WINDOW (Góc dưới bên phải)                  */}
      {/* ========================================================================= */}
      {isLoggedIn && isChatOpen && !isMinimized && (
        <div
          id="docked-messenger-window"
          className="fixed bottom-4 right-4 sm:right-6 z-50 w-[95vw] sm:w-[380px] max-w-[400px] h-[520px] max-h-[82vh] bg-white rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.2)] border border-slate-200/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 print:hidden"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-[#005c55] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {activeConversation?.companyLogo || activeConversation?.avatar ? (
                  <img
                    src={activeConversation.companyLogo || activeConversation.avatar}
                    alt={activeConversation?.recruiterName || activeConversation?.companyName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-sm border-2 border-white/30">
                    {(activeConversation?.companyName || activeConversation?.recruiterName || 'N').charAt(0).toUpperCase()}
                  </div>
                )}
                {activeConversation?.online !== false && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#005c55]" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm truncate">
                    {activeConversation?.recruiterName || 'Nhà Tuyển Dụng'}
                  </span>
                  {wsConnected ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-300" title="Đã kết nối trực tiếp (WebSocket)" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Đang kết nối / Polling 10s" />
                  )}
                </div>
                <span className="text-[11px] text-teal-100 truncate">
                  {activeConversation?.companyName || 'Doanh nghiệp'} • {activeConversation?.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </span>
              </div>
            </div>

            {/* Header Action Controls: Minimize & Close */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={minimizeChat}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Thu nhỏ xuống góc"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <button
                id="btn-close-docked-chat"
                type="button"
                onClick={closeChat}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Đóng tin nhắn"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#faf8ff]">
            {/* Channel safety badge */}
            <div className="p-2.5 bg-white rounded-2xl border border-[#eaedff] shadow-xs flex items-center gap-2.5 text-xs">
              <div className="w-7 h-7 rounded-lg bg-[#e6f7f5] text-[#005c55] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">verified</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-800 block truncate text-[11px]">
                  Kênh trao đổi tuyển dụng trực tiếp
                </span>
                <span className="text-slate-500 text-[10px]">Tin nhắn được đồng bộ và lưu trữ bảo mật</span>
              </div>
            </div>

            {/* Date divider */}
            <div className="flex items-center justify-center my-1">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-[10px] font-semibold text-slate-600">
                Hôm nay
              </span>
            </div>

            {/* Empty messages state */}
            {messages.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-slate-300">chat</span>
                <p className="font-semibold text-slate-700">Chưa có tin nhắn nào</p>
                <p className="text-[11px] text-slate-400">
                  Hãy gửi tin nhắn đầu tiên để bắt đầu trao đổi với nhà tuyển dụng.
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              const isMe = msg.senderType === 'candidate';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-[#005c55] text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 rounded-tl-xs border border-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                    <span>
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Vừa xong'}
                    </span>
                    {isMe && (
                      <span className="material-symbols-outlined text-[12px] text-[#005c55]">
                        done_all
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Response Chips */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-nowrap">
            {[
              'Dạ em đã nhận được lịch hẹn ạ!',
              'Em xin phép gửi thêm portfolio ạ',
              'Anh/chị cho em hỏi thời gian phỏng vấn nhé',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleQuickTemplate(chip)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#e6f7f5] hover:text-[#005c55] text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Composer */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập tin nhắn... (Enter để gửi)"
              className="flex-1 bg-slate-100 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 rounded-full bg-[#005c55] hover:bg-[#007952] disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer"
              title="Gửi tin nhắn"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
