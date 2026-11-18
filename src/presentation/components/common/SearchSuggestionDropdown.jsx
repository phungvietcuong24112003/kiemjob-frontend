import React, { useState, useEffect, useRef } from 'react';
import {
  getSearchSuggestions,
  deleteSearchHistoryItem,
  clearSearchHistory,
  getAutocompleteSuggestions,
} from '../../../infrastructure/api/recommendationApi';
import {
  getLocalSearchHistory,
  deleteLocalSearchKeyword,
  clearLocalSearchHistory,
} from '../../../infrastructure/utils/searchHistoryUtils';

/**
 * Component Dropdown gợi ý tìm kiếm đa năng cho KiemJob:
 * - Khi chưa gõ: Hiển thị Lịch sử gần đây, Từ khóa đề xuất theo CV, và Xu hướng tìm kiếm phổ biến
 * - Khi đang gõ (>= 2 ký tự): Hiển thị danh sách Autocomplete gợi ý tức thì
 * - Hỗ trợ bàn phím: Mũi tên lên/xuống, Enter, Escape
 */
export default function SearchSuggestionDropdown({
  isOpen,
  onClose,
  query = '',
  onSelect,
  className = '',
}) {
  const [recentSearches, setRecentSearches] = useState([]);
  const [personalizedKeywords, setPersonalizedKeywords] = useState([]);
  const [trendingKeywords, setTrendingKeywords] = useState([]);
  const [autocompleteItems, setAutocompleteItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);

  // Tải danh sách gợi ý khi mở Dropdown
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    getSearchSuggestions()
      .then((data) => {
        if (!isMounted || !data) return;
        let recent = (data.recentSearches || []).slice(0, 5);
        if (recent.length === 0) {
          // Lấy lịch sử local cho khách truy cập (tự động loại bỏ > 7 ngày, tối đa 5)
          recent = getLocalSearchHistory();
        }
        setRecentSearches(recent);
        setPersonalizedKeywords(data.personalizedKeywords || []);
        setTrendingKeywords(data.trendingKeywords || []);
      })
      .catch(() => {
        if (isMounted) {
          setRecentSearches(getLocalSearchHistory());
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Debounce gọi Autocomplete khi người dùng gõ phím
  useEffect(() => {
    if (!isOpen || !query || query.trim().length < 2) {
      setAutocompleteItems([]);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      getAutocompleteSuggestions(query)
        .then((items) => {
          setAutocompleteItems(Array.isArray(items) ? items : []);
          setSelectedIndex(-1);
        })
        .catch(() => setAutocompleteItems([]));
    }, 180);

    return () => clearTimeout(timer);
  }, [isOpen, query]);

  // Xử lý Click Outside để đóng dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Xóa một mục trong lịch sử
  const handleDeleteItem = async (e, id, keyword) => {
    e.stopPropagation();
    setRecentSearches((prev) => prev.filter((item) => item.id !== id));
    deleteLocalSearchKeyword(id);
    if (keyword) deleteLocalSearchKeyword(keyword);
    if (typeof id === 'number') {
      await deleteSearchHistoryItem(id);
    }
  };

  // Xóa toàn bộ lịch sử
  const handleClearAll = async (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    clearLocalSearchHistory();
    await clearSearchHistory();
  };

  // Bấm chọn từ khóa
  const handleItemClick = (keyword) => {
    if (onSelect) {
      onSelect(keyword);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isSearching = Boolean(query && query.trim().length >= 2);

  // Hàm highlight ký tự trùng khớp trong Autocomplete
  const renderHighlightedText = (text, highlight) => {
    if (!highlight || !highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} className="text-[#005c55] font-bold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div
      ref={containerRef}
      className={`absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/10 border border-slate-100 z-[100] overflow-hidden divide-y divide-slate-100 transition-all duration-200 text-left ${className}`}
      style={{ maxHeight: '420px', overflowY: 'auto' }}
    >

      {/* TRƯỜNG HỢP 1: ĐANG GÕ TÌM KIẾM (AUTOCOMPLETE) */}
      {isSearching ? (
        <div className="p-3">
          <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Gợi ý cho &quot;{query}&quot;</span>
            <span className="text-[10px] text-slate-400 font-normal">Nhấn để tìm</span>
          </div>

          {autocompleteItems.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {autocompleteItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <li
                    key={index}
                    onClick={() => handleItemClick(item)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-[#005c55]'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">
                      search
                    </span>
                    <span className="flex-1 truncate">
                      {renderHighlightedText(item, query)}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-slate-300 shrink-0">
                      north_west
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              Không tìm thấy gợi ý phù hợp, nhấn <span className="font-semibold text-slate-600">Tìm kiếm</span> để xem kết quả đầy đủ
            </div>
          )}
        </div>
      ) : (
        /* TRƯỜNG HỢP 2: KHI MỚI CLICK VÀO Ô TÌM KIẾM (3 KHỐI DỮ LIỆU) */
        <div className="divide-y divide-slate-100">
          {/* KHỐI 1: LỊCH SỬ TÌM KIẾM GẦN ĐÂY */}
          {recentSearches.length > 0 && (
            <div className="p-3">
              <div className="px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">history</span>
                  Tìm kiếm gần đây
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Xóa tất cả
                </button>
              </div>

              <ul className="mt-1 space-y-0.5">
                {recentSearches.slice(0, 5).map((item) => (
                  <li
                    key={item.id}
                    onClick={() => handleItemClick(item.keyword)}
                    className="group flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">
                        schedule
                      </span>
                      <span className="truncate">{item.keyword}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item.id, item.keyword)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-all"
                      title="Xóa khỏi lịch sử"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* KHỐI 2: TỪ KHÓA ĐỀ XUẤT CHO BẠN (CV MATCHING) */}
          {personalizedKeywords.length > 0 && (
            <div className="p-3.5 bg-gradient-to-b from-emerald-50/40 to-transparent">
              <div className="px-2 py-1 text-xs font-semibold text-emerald-800 flex items-center gap-1.5 mb-2.5">
                <span className="material-symbols-outlined text-[16px] text-[#005c55]">auto_awesome</span>
                Đề xuất dựa trên hồ sơ của bạn
              </div>

              <div className="flex flex-wrap gap-2 px-1">
                {personalizedKeywords.map((kw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleItemClick(kw)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/70 hover:bg-[#005c55] hover:text-white hover:border-[#005c55] transition-all cursor-pointer shadow-xs"
                  >
                    <span>{kw}</span>
                    <span className="material-symbols-outlined text-[12px] opacity-60">add</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KHỐI 3: XU HƯỚNG TÌM KIẾM (TRENDING KEYWORDS) */}
          {trendingKeywords.length > 0 && (
            <div className="p-3">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-500">local_fire_department</span>
                Tìm kiếm phổ biến
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-1">
                {trendingKeywords.map((trend, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleItemClick(trend)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 hover:text-[#005c55] transition-colors text-left"
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        idx === 0
                          ? 'bg-rose-100 text-rose-600'
                          : idx === 1
                          ? 'bg-amber-100 text-amber-700'
                          : idx === 2
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium">{trend}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
