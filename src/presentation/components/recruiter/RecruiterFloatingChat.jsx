import React, { useState, useEffect, useRef } from 'react';
import { useRecruiterChat } from '../../../application/context/RecruiterChatContext';
import { ROLES } from '../../../domain/constants/roles';

export default function RecruiterFloatingChat() {
  const {
    isLoggedIn,
    conversations,
    activeConversationId,
    activeConversation,
    isChatOpen,
    isMinimized,
    messages,
    loadingMessages,
    wsConnected,
    openChat,
    closeChat,
    minimizeChat,
    restoreChat,
    sendMessage,
    enableNotifications,
    notificationPermission,
  } = useRecruiterChat();

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update or chat opens
  useEffect(() => {
    if (isChatOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen, isMinimized]);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text);
    setInputText('');
  };

  const handleQuickTemplate = (tpl) => {
    setInputText(tpl);
  };

  if (!isLoggedIn) return null;

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. CHAT HEAD KHI ĐANG THU NHỎ (Minimized)                                 */}
      {/* ========================================================================= */}
      {isChatOpen && isMinimized && (
        <div className="fixed bottom-6 right-6 z-50 group flex items-center justify-center animate-in zoom-in-75 duration-200">
          <button
            type="button"
            onClick={restoreChat}
            aria-label="Mở lại đoạn chat ứng viên"
            className="relative w-14 h-14 sm:w-15 sm:h-15 rounded-full p-0.5 bg-white shadow-2xl ring-3 ring-[#005c55] hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none cursor-pointer overflow-hidden flex items-center justify-center"
            title={`Mở lại chat: ${activeConversation?.candidateName || 'Ứng viên'}`}
          >
            {activeConversation?.candidateAvatar ? (
              <img
                src={activeConversation.candidateAvatar}
                alt={activeConversation.candidateName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-lg">
                {(activeConversation?.candidateName || 'U').charAt(0).toUpperCase()}
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
            Bấm để mở chat với {activeConversation?.candidateName || 'Ứng viên'}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DOCKED MESSENGER CHAT WINDOW (Góc dưới bên phải)                       */}
      {/* ========================================================================= */}
      {isChatOpen && !isMinimized && (
        <div
          id="docked-recruiter-messenger-window"
          className="fixed bottom-4 right-4 sm:right-6 z-50 w-[95vw] sm:w-[380px] max-w-[400px] h-[520px] max-h-[82vh] bg-white rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.2)] border border-slate-200/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-[#005c55] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {activeConversation?.candidateAvatar ? (
                  <img
                    src={activeConversation.candidateAvatar}
                    alt={activeConversation.candidateName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-sm border-2 border-white/30">
                    {(activeConversation?.candidateName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                {activeConversation?.online !== false && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#005c55]" />
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm truncate">
                    {activeConversation?.candidateName || 'Ứng Viên'}
                  </span>
                  {wsConnected ? (
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-300"
                      title="Đã kết nối trực tiếp (WebSocket)"
                    />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                      title="Đang kết nối / Polling 10s"
                    />
                  )}
                </div>
                <span className="text-[11px] text-teal-100 truncate">
                  {activeConversation?.candidateHeadline || 'Ứng viên tiềm năng'} • {activeConversation?.online !== false ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </span>
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Nút bật/tắt thông báo desktop cho nhà tuyển dụng */}
              <button
                type="button"
                onClick={enableNotifications}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  notificationPermission === 'granted'
                    ? 'text-emerald-300 hover:text-white hover:bg-white/15'
                    : notificationPermission === 'denied'
                    ? 'text-red-300 hover:text-white hover:bg-white/15'
                    : 'text-amber-300 hover:text-white hover:bg-white/15 animate-pulse'
                }`}
                title={
                  notificationPermission === 'granted'
                    ? 'Thông báo màn hình đang bật'
                    : notificationPermission === 'denied'
                    ? 'Thông báo bị chặn trong cài đặt trình duyệt'
                    : 'Bấm để bật thông báo tin nhắn trên màn hình'
                }
              >
                <span className="material-symbols-outlined text-[18px]">
                  {notificationPermission === 'granted'
                    ? 'notifications_active'
                    : notificationPermission === 'denied'
                    ? 'notifications_off'
                    : 'notifications'}
                </span>
              </button>
              <button
                type="button"
                onClick={minimizeChat}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Thu nhỏ xuống góc"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <button
                id="btn-close-recruiter-docked-chat"
                type="button"
                onClick={closeChat}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Đóng tin nhắn"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Quick Switch Candidate Tabs (chuyển nhanh qua lại giữa các ứng viên) */}
          {conversations.length > 1 && (
            <div className="flex items-center bg-[#f2f3ff] border-b border-[#eaedff] px-2.5 py-1.5 gap-1.5 overflow-x-auto no-scrollbar text-xs">
              {conversations.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openChat(c.id)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-semibold flex items-center gap-1.5 cursor-pointer text-xs ${
                      isActive
                        ? 'bg-[#005c55] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-[#eaedff] hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate max-w-[110px]">
                      {c.candidateName?.split(' ').slice(-2).join(' ') || c.candidateName || 'Ứng viên'}
                    </span>
                    {(c.unreadCount || 0) > 0 && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#faf8ff]">
            {/* Safety & Channel Badge */}
            <div className="p-2.5 bg-white rounded-2xl border border-[#eaedff] shadow-xs flex items-center gap-2.5 text-xs">
              <div className="w-7 h-7 rounded-lg bg-[#e6f7f5] text-[#005c55] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">verified</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-800 block truncate text-[11px]">
                  Kênh trao đổi trực tiếp với ứng viên
                </span>
                <span className="text-slate-500 text-[10px]">
                  Tin nhắn được đồng bộ và lưu trữ bảo mật
                </span>
              </div>
            </div>

            {/* Date divider */}
            <div className="flex items-center justify-center my-1">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-[10px] font-semibold text-slate-600">
                Hôm nay
              </span>
            </div>

            {/* Loading indicator */}
            {loadingMessages && messages.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin" />
                <span>Đang tải tin nhắn...</span>
              </div>
            )}

            {/* Empty Messages */}
            {!loadingMessages && messages.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-slate-300">chat</span>
                <p className="font-semibold text-slate-700">Chưa có tin nhắn nào</p>
                <p className="text-[11px] text-slate-400">
                  Hãy gửi tin nhắn đầu tiên để bắt đầu trao đổi với ứng viên.
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              const isMe = msg.senderType === ROLES.RECRUITER;
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
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
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

          {/* Quick Template Chips for Recruiter */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-nowrap">
            {[
              'Bên mình muốn mời bạn phỏng vấn',
              'Bạn có thể gửi CV chi tiết hơn không?',
              'Hồ sơ của bạn rất ấn tượng!',
              'Cảm ơn bạn đã ứng tuyển vào vị trí này',
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

          {/* Chat Composer Form */}
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

