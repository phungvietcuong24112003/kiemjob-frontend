/**
 * Tiện ích quản lý lịch sử tìm kiếm cho KiemJob:
 * - Giới hạn tối đa 5 lịch sử tìm kiếm (MAX_SEARCH_HISTORY = 5).
 * - Đến từ khóa thứ 6 tự động đẩy và xóa từ khóa cũ nhất.
 * - Tự động xóa / loại bỏ các từ khóa đã lưu quá 7 ngày (1 tuần).
 */

const STORAGE_KEY = 'kiemjob_search_history';
export const MAX_SEARCH_HISTORY = 5;
export const SEARCH_HISTORY_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày (1 tuần)

/**
 * Lấy danh sách lịch sử tìm kiếm hợp lệ từ localStorage
 * (Tự động lọc bỏ các mục đã quá 7 ngày và giữ tối đa 5 mục gần nhất)
 */
export function getLocalSearchHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    const valid = parsed
      .filter((item) => {
        if (!item) return false;
        const ts = typeof item === 'object' ? item.timestamp : null;
        // Nếu có timestamp thì kiểm tra chưa quá 7 ngày, nếu dữ liệu cũ chưa có timestamp thì vẫn giữ
        return !ts || (now - ts <= SEARCH_HISTORY_EXPIRY_MS);
      })
      .slice(0, MAX_SEARCH_HISTORY);

    // Chuẩn hóa định dạng danh sách [{ id, keyword, timestamp }]
    return valid.map((item, idx) => ({
      id: typeof item === 'object' && item.id ? item.id : `local_${idx}`,
      keyword: typeof item === 'object' ? item.keyword : item,
      timestamp: typeof item === 'object' && item.timestamp ? item.timestamp : now,
    }));
  } catch {
    return [];
  }
}

/**
 * Lưu từ khóa vừa tìm kiếm vào localStorage:
 * - Tự động loại bỏ từ khóa trùng lặp
 * - Thêm từ khóa mới lên đầu danh sách kèm timestamp hiện tại
 * - Giới hạn tối đa 5 mục, đến mục thứ 6 sẽ tự động loại bỏ mục cũ nhất
 */
export function saveLocalSearchKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string' || !keyword.trim()) return [];
  const trimmed = keyword.trim();
  const now = Date.now();

  try {
    const current = getLocalSearchHistory();
    // Lọc bỏ trùng lặp và loại bỏ các mục đã quá 7 ngày
    const filtered = current.filter(
      (h) => h.keyword.toLowerCase() !== trimmed.toLowerCase() && (now - h.timestamp <= SEARCH_HISTORY_EXPIRY_MS)
    );

    // Thêm mục mới lên đầu và giới hạn tối đa 5 mục
    const updated = [
      { id: `local_${now}`, keyword: trimmed, timestamp: now },
      ...filtered
    ].slice(0, MAX_SEARCH_HISTORY);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Xóa một mục từ khóa khỏi localStorage
 */
export function deleteLocalSearchKeyword(target) {
  try {
    const current = getLocalSearchHistory();
    const updated = current.filter(
      (h) => h.id !== target && h.keyword.toLowerCase() !== String(target).toLowerCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Xóa toàn bộ lịch sử tìm kiếm trong localStorage
 */
export function clearLocalSearchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
