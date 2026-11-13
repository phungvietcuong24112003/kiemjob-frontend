import React, { useState, useRef, useEffect } from 'react';
import { useRecruiterChat, formatChatTime } from '../../../application/context/RecruiterChatContext';
import { RotateCw, CheckCheck, X, Search, MessageSquare } from 'lucide-react';

/**
 * RecruiterChatDropdown - Menu tin nhắn ứng viên
 * Thiết kế cổ điển, phẳng, nghiêm túc (border 1px, bo 2px, Source Serif 4, Navy accent)
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
      {/* Header Button */}
      <button
        id="btn-recruiter-header-messenger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Đoạn chat tin nhắn ứng viên"
        className={`relative h-8 px-2.5 rounded-[2px] border transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
          isOpen
            ? 'bg-[#1f3a5f] text-white border-[#1f3a5f]'
            : 'bg-white border-[#cfcac0] text-[#1c1c1c] hover:bg-[#ecebe5]'
        }`}
        title="Tin nhắn ứng viên"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline font-medium">Tin nhắn</span>

        {unreadTotal > 0 && (
          <span className="px-1 min-w-[16px] h-4 bg-[#9b1c1c] text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {/* Messenger Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-[340px] sm:w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-[2px] border border-[#cfcac0] py-3 z-50 flex flex-col overflow-hidden text-[#1c1c1c]">
          {/* Header */}
          <div className="px-4 pb-2.5 flex items-center justify-between border-b border-[#cfcac0]">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-sm font-bold text-[#1c1c1c]">Tin nhắn ứng viên</h3>
              <span className="text-xs text-[#5a5a5a]">({conversations.length})</span>
              {wsConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2e6b3a]" title="Kết nối trực tiếp" />
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchConversations}
                className="p-1 text-[#5a5a5a] hover:text-[#1c1c1c] cursor-pointer"
                title="Làm mới tin nhắn"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingConversations ? 'animate-spin' : ''}`} />
              </button>
              {unreadTotal > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="p-1 text-xs text-[#1f3a5f] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  title="Đánh dấu tất cả là đã đọc"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đã đọc</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#5a5a5a] hover:text-[#1c1c1c] cursor-pointer"
                title="Đóng menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-[#5a5a5a] pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm ứng viên hoặc tin nhắn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#cfcac0] focus:border-[#1f3a5f] pl-8 pr-7 py-1.5 rounded-[2px] text-xs text-[#1c1c1c] placeholder:text-[#5a5a5a] outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-[#5a5a5a] hover:text-[#1c1c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-3 pb-2 flex items-center gap-1.5 border-b border-[#cfcac0]">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`h-6 px-2.5 rounded-[2px] text-xs font-medium cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#1f3a5f] text-white'
                  : 'bg-white border border-[#cfcac0] text-[#5a5a5a] hover:bg-[#ecebe5]'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`h-6 px-2.5 rounded-[2px] text-xs font-medium cursor-pointer flex items-center gap-1 ${
                filterTab === 'unread'
                  ? 'bg-[#1f3a5f] text-white'
                  : 'bg-white border border-[#cfcac0] text-[#5a5a5a] hover:bg-[#ecebe5]'
              }`}
            >
              <span>Chưa đọc</span>
              {unreadTotal > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#9b1c1c]" />
              )}
            </button>
          </div>

          {/* Conversation List */}
          <div className="py-1 max-h-[320px] overflow-y-auto divide-y divide-[#cfcac0]/60">
            {loadingConversations && conversations.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5a5a5a]">
                <div className="w-4 h-4 border-2 border-[#1f3a5f] border-t-transparent rounded-full animate-spin inline-block mb-1" />
                <p>Đang tải cuộc trò chuyện...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-8 px-4 text-center text-[#5a5a5a]">
                <p className="text-xs font-semibold text-[#1c1c1c]">
                  {searchQuery ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có cuộc trò chuyện nào'}
                </p>
                <p className="text-xs text-[#5a5a5a] mt-0.5">
                  Tin nhắn trao đổi với ứng viên sẽ hiển thị tại đây.
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
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#ecebe5]/50 transition-colors cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      {conv.candidateAvatar ? (
                        <img
                          src={conv.candidateAvatar}
                          alt={conv.candidateName}
                          className="w-9 h-9 rounded-full object-cover border border-[#cfcac0]"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#1f3a5f] text-white flex items-center justify-center font-bold text-xs">
                          {(conv.candidateName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      {conv.online !== false && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#2e6b3a] border border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs truncate ${
                            isUnread ? 'font-bold text-[#1c1c1c]' : 'font-medium text-[#1c1c1c]'
                          }`}
                        >
                          {conv.candidateName || 'Ứng viên'}
                        </h4>
                        <span className="text-xs text-[#5a5a5a] whitespace-nowrap">
                          {formatChatTime(conv.lastMessageTime)}
                        </span>
                      </div>

                      {conv.candidateHeadline && (
                        <p className="text-xs text-[#5a5a5a] truncate mb-0.5">
                          {conv.candidateHeadline}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            isUnread ? 'font-semibold text-[#1c1c1c]' : 'text-[#5a5a5a]'
                          }`}
                        >
                          {conv.lastMessage || 'Bắt đầu cuộc trò chuyện...'}
                        </p>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1f3a5f] shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          {conversations.length > 0 && (
            <div className="px-3 pt-2 border-t border-[#cfcac0]">
              <button
                type="button"
                onClick={() => {
                  openChat();
                  setIsOpen(false);
                }}
                className="w-full h-8 bg-white hover:bg-[#ecebe5] border border-[#cfcac0] text-[#1c1c1c] text-xs font-semibold rounded-[2px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#1f3a5f]" />
                <span>Mở cửa sổ chat</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
