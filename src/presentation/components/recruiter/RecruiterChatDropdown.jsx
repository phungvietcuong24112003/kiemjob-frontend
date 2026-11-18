import React, { useState, useRef, useEffect } from 'react';
import { useRecruiterChat, formatChatTime } from '../../../application/context/RecruiterChatContext';

/**
 * RecruiterChatDropdown - Menu tin nhắn ứng viên cho Nhà tuyển dụng
 * Đồng bộ với phong cách thiết kế hiện đại của KiemJob (Emerald Teal #005c55, bo góc mềm mại, Material Symbols)
 */
export default function RecruiterChatDropdown() {
  const {
    conversations,
    loadingConversations,
    unreadTotal,
    wsConnected,
    openChat,
    markAllAsRead,
    fetchConversations,
    enableNotifications,
    notificationPermission,
  } = useRecruiterChat();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (c.candidateName || '').toLowerCase().includes(q) ||
      (c.candidateHeadline || '').toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q);

    if (!matchSearch) return false;
    if (filterTab === 'unread') return (c.unreadCount || 0) > 0;
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Header Button Trigger */}
      <button
        id="btn-recruiter-header-messenger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Đoạn chat tin nhắn ứng viên"
        className={`relative px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
          isOpen
            ? 'bg-[#005c55] text-white shadow-xs'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#005c55]'
        }`}
        title="Tin nhắn ứng viên (Messenger)"
      >
        <span className="material-symbols-outlined text-[18px]">forum</span>
        <span className="hidden sm:inline">Tin nhắn</span>

        {unreadTotal > 0 && (
          <span className="px-1.5 min-w-[18px] h-4 bg-[#ba1a1a] text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-xs">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {/* Messenger Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-[350px] sm:w-[390px] max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.18)] border border-slate-100 py-3 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 pb-2.5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">
                  Tin nhắn ứng viên
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#e6f7f5] text-[#005c55] text-xs font-bold">
                  {conversations.length}
                </span>
                {wsConnected && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500"
                    title="Đã kết nối trực tiếp (WebSocket)"
                  />
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Nút bật/tắt thông báo desktop cho nhà tuyển dụng */}
                <button
                  type="button"
                  onClick={enableNotifications}
                  className={`p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    notificationPermission === 'granted'
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : notificationPermission === 'denied'
                      ? 'text-red-500 hover:bg-red-50'
                      : 'text-amber-600 hover:bg-amber-50 animate-pulse'
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

                {/* Nút Làm mới */}
                <button
                  type="button"
                  onClick={fetchConversations}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Làm mới danh sách tin nhắn"
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      loadingConversations ? 'animate-spin' : ''
                    }`}
                  >
                    sync
                  </span>
                </button>

                {/* Nút Đánh dấu đã đọc tất cả */}
                {unreadTotal > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="p-1.5 text-xs text-[#005c55] hover:bg-[#e6f7f5] rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Đánh dấu tất cả là đã đọc"
                  >
                    <span className="material-symbols-outlined text-[16px]">done_all</span>
                    <span className="hidden sm:inline">Đã đọc</span>
                  </button>
                )}

                {/* Nút Đóng */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Đóng menu"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-2">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px] pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm ứng viên hoặc tin nhắn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-[#005c55] focus:ring-2 focus:ring-[#005c55]/15 pl-9 pr-8 py-2 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-4 pb-2 flex items-center gap-1.5 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-[#005c55] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('unread')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'unread'
                    ? 'bg-[#005c55] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Chưa đọc</span>
                {unreadTotal > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      filterTab === 'unread'
                        ? 'bg-white/25 text-white'
                        : 'bg-[#ba1a1a] text-white'
                    }`}
                  >
                    {unreadTotal}
                  </span>
                )}
              </button>
            </div>

            {/* Conversation List */}
            <div className="py-1 max-h-[340px] overflow-y-auto divide-y divide-slate-50">
              {loadingConversations && conversations.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-2 text-slate-400">
                  <div className="w-5 h-5 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-slate-500">Đang tải cuộc trò chuyện...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center gap-2 text-slate-400">
                  <span className="material-symbols-outlined text-[36px] text-slate-300">forum</span>
                  <p className="text-xs font-bold text-slate-700">
                    {searchQuery
                      ? 'Không tìm thấy cuộc trò chuyện phù hợp'
                      : 'Chưa có cuộc trò chuyện nào'}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-[240px]">
                    {searchQuery
                      ? 'Thử tìm kiếm với từ khóa khác'
                      : 'Tin nhắn trao đổi với ứng viên sẽ hiển thị tại đây.'}
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
                        setIsOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group ${
                        isUnread ? 'bg-[#f0faf8]/70 hover:bg-[#e4f5f2]' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Avatar with Online indicator */}
                      <div className="relative shrink-0">
                        {conv.candidateAvatar ? (
                          <img
                            src={conv.candidateAvatar}
                            alt={conv.candidateName}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                            {(conv.candidateName || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        {conv.online !== false && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4
                            className={`text-xs sm:text-sm truncate ${
                              isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                            }`}
                          >
                            {conv.candidateName || 'Ứng viên'}
                          </h4>
                          <span
                            className={`text-[11px] whitespace-nowrap ${
                              isUnread ? 'font-bold text-[#005c55]' : 'text-slate-400'
                            }`}
                          >
                            {formatChatTime(conv.lastMessageTime)}
                          </span>
                        </div>

                        {conv.candidateHeadline && (
                          <p className="text-[11px] text-[#005c55] font-medium truncate mb-0.5">
                            {conv.candidateHeadline}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              isUnread ? 'font-semibold text-slate-900' : 'text-slate-500'
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

            {/* Footer Action */}
            <div className="px-4 pt-2.5 pb-1 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  openChat();
                  setIsOpen(false);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#005c55] hover:text-[#007952] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                <span>Mở khung chat đầy đủ</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
