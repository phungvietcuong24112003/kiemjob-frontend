import React, { useState } from 'react';
import { searchCvs } from '../../../infrastructure/api/cvSearchApi';
import CvDetailModal from '../../components/recruiter/CvDetailModal';

const EXAMPLE_QUERIES = [
  'Kế toán tổng hợp 3 năm kinh nghiệm ở Hà Nội, biết MISA',
  'Lập trình viên Java Spring Boot tại TP.HCM',
  'Nhân viên kinh doanh B2B có tiếng Anh, kinh nghiệm 2 năm',
  'Chuyên viên Marketing số biết chạy Google Ads, SEO',
];

export default function CvSearchPage() {
  const [query, setQuery] = useState('');
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResponse, setSearchResponse] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal xem chi tiết CV
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await searchCvs(trimmed, size);
      const data = res?.data ?? res;
      setSearchResponse(data);
      setHasSearched(true);
    } catch (err) {
      console.error('Lỗi tìm kiếm CV:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể kết nối đến hệ thống tìm kiếm AI. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExample = (example) => {
    setQuery(example);
  };

  const handleOpenDetail = (result) => {
    setSelectedCandidate({
      cvId: result.cvId,
      candidateId: result.candidateId,
      fullname: result.fullName,
      headline: result.headline,
      avatarUrl: result.avatarUrl,
      title: result.headline || 'Hồ sơ ứng viên',
    });
    setIsModalOpen(true);
  };

  const getMatchScoreBadge = (score) => {
    if (score >= 80) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        bar: 'bg-emerald-500',
        label: 'Phù hợp cao',
      };
    }
    if (score >= 60) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        bar: 'bg-amber-500',
        label: 'Tương đối phù hợp',
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      bar: 'bg-slate-400',
      label: 'Cần cân nhắc',
    };
  };

  const parsedFilters = searchResponse?.parsedFilters;
  const results = searchResponse?.results || [];

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Tìm kiếm ứng viên bằng AI
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e6f7f5] text-[#005c55] border border-[#005c55]/20 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              AI Smart Search
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Nhập yêu cầu bằng ngôn ngữ tự nhiên. AI sẽ tự động phân tích tiêu chí, tra cứu dữ liệu và xếp hạng ứng viên phù hợp nhất.
          </p>
        </div>
      </div>

      {/* Khung tìm kiếm chính */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 transition-all hover:shadow-md">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[22px]">
              search
            </span>
            <textarea
              rows={2}
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 300))}
              placeholder="VD: Tuyển kế toán tổng hợp 3 năm kinh nghiệm tại Hà Nội, thành thạo MISA, báo cáo thuế..."
              className="w-full pl-11 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c55] focus:border-transparent resize-none transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {query.length}/300
              </span>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-[#005c55] hover:bg-[#007952] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang tìm...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                    <span>Tìm CV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Gợi ý mẫu */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-amber-500">lightbulb</span>
              Gợi ý:
            </span>
            {EXAMPLE_QUERIES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectExample(ex)}
                className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-[#e6f7f5] hover:text-[#005c55] text-slate-600 rounded-lg transition-colors cursor-pointer text-left"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600 text-[20px] shrink-0">error</span>
          <div className="flex-1">
            <p className="font-semibold">Tìm kiếm không thành công</p>
            <p className="mt-0.5 text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Hiển thị tiêu chí AI đã phân tích (Parsed Filters) */}
      {parsedFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005c55] text-[18px]">psychology</span>
              <span className="text-xs font-bold text-slate-800">
                AI đã nhận diện tiêu chí từ câu tìm kiếm:
              </span>
            </div>
            {searchResponse?.searchTimeMs !== undefined && (
              <span className="text-[11px] text-slate-400">
                Xử lý trong {searchResponse.searchTimeMs}ms
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {parsedFilters.industry && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                <span className="material-symbols-outlined text-[14px]">domain</span>
                Ngành: {parsedFilters.industry}
              </span>
            )}
            {parsedFilters.titles && parsedFilters.titles.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                <span className="material-symbols-outlined text-[14px]">badge</span>
                Vị trí: {parsedFilters.titles.join(', ')}
              </span>
            )}
            {(parsedFilters.minYears !== null || parsedFilters.maxYears !== null) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                <span className="material-symbols-outlined text-[14px]">history</span>
                Kinh nghiệm: {parsedFilters.minYears !== null ? `Từ ${parsedFilters.minYears} năm` : ''}
                {parsedFilters.maxYears !== null ? ` đến ${parsedFilters.maxYears} năm` : ''}
              </span>
            )}
            {parsedFilters.location && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                Địa điểm: {parsedFilters.location}
              </span>
            )}
            {parsedFilters.educationLevel && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 font-medium">
                <span className="material-symbols-outlined text-[14px]">school</span>
                Trình độ: {parsedFilters.educationLevel}
              </span>
            )}
            {parsedFilters.skills && parsedFilters.skills.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#e6f7f5] text-[#005c55] border border-[#005c55]/20 font-medium">
                <span className="material-symbols-outlined text-[14px]">star</span>
                Kỹ năng: {parsedFilters.skills.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Trạng thái Loading */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#e6f7f5] text-[#005c55]">
            <span className="material-symbols-outlined text-[28px] animate-spin">sync</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Hệ thống AI đang xử lý yêu cầu...</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Đang phân tích câu hỏi tự nhiên, đối chiếu hồ sơ ứng viên trong cơ sở dữ liệu và xếp hạng mức độ phù hợp. Quá trình này có thể mất vài giây.
            </p>
          </div>
        </div>
      )}

      {/* Danh sách kết quả */}
      {!loading && hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Kết quả tìm kiếm</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {results.length} ứng viên phù hợp
              </span>
            </h2>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[28px]">search_off</span>
              </div>
              <h3 className="text-sm font-bold text-slate-800">Không tìm thấy ứng viên phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Không có hồ sơ công khai nào khớp với toàn bộ các tiêu chí tìm kiếm. Hãy thử nới lỏng yêu cầu, bớt kỹ năng hoặc mở rộng địa điểm.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {results.map((item) => {
                const badge = getMatchScoreBadge(item.matchScore || 0);
                const matchedSet = new Set((item.matchedSkills || []).map((s) => s.toLowerCase()));

                return (
                  <div
                    key={item.cvId}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                  >
                    {/* Header thẻ: Avatar, Tên, Headline, Điểm phù hợp */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.fullName}
                            className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-base shrink-0">
                            {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {item.fullName || 'Ứng viên ẩn danh'}
                          </h3>
                          <p className="text-xs text-[#005c55] font-medium truncate mt-0.5">
                            {item.headline || 'Chưa cập nhật chức danh'}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                            {item.province && (
                              <span className="flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px]">location_on</span>
                                {item.province}
                              </span>
                            )}
                            {item.yearsExperience !== null && item.yearsExperience !== undefined && (
                              <span className="flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px]">work_history</span>
                                {item.yearsExperience} năm kinh nghiệm
                              </span>
                            )}
                            {item.seniority && item.seniority !== 'unknown' && (
                              <span className="capitalize px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {item.seniority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Điểm số */}
                      <div className="flex flex-col items-end shrink-0">
                        <div
                          className={`px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${badge.bg}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          <span>{item.matchScore ?? 0}% phù hợp</span>
                        </div>
                        {item.qualityScore !== null && item.qualityScore !== undefined && (
                          <span className="text-[11px] text-slate-400 mt-1">
                            Điểm CV: {item.qualityScore}/100
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lý do AI xếp hạng */}
                    {item.reason && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#005c55] shrink-0 mt-0.5">
                          auto_awesome
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900">Đánh giá độ phù hợp: </span>
                          <span>{item.reason}</span>
                        </div>
                      </div>
                    )}

                    {/* Tóm tắt kinh nghiệm / CV */}
                    {item.summary && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    )}

                    {/* Danh sách kỹ năng */}
                    {item.allSkills && item.allSkills.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 block">Kỹ năng:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.allSkills.map((sk, sIdx) => {
                            const isMatched = matchedSet.has(sk.toLowerCase());
                            return (
                              <span
                                key={sIdx}
                                className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                                  isMatched
                                    ? 'bg-[#e6f7f5] text-[#005c55] border border-[#005c55]/30 font-semibold'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isMatched && '✓ '}
                                {sk}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Nút hành động */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(item)}
                        className="px-3.5 py-1.5 bg-[#005c55] hover:bg-[#007952] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>Xem chi tiết hồ sơ & CV</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Màn hình giới thiệu khi chưa tìm kiếm */}
      {!loading && !hasSearched && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#e6f7f5] text-[#005c55] flex items-center justify-center mx-auto shadow-inner">
            <span className="material-symbols-outlined text-[36px]">travel_explore</span>
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-slate-900">
              Tìm kiếm ứng viên thông minh với 3 tầng lọc
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              1. <strong>Hiểu ý định</strong>: AI tự trích xuất kinh nghiệm, địa điểm, chức danh và kỹ năng từ câu nói.
              <br />
              2. <strong>Lọc dữ liệu lớn</strong>: Truy vấn PostgreSQL JSONB tốc độ cao trên toàn bộ CV công khai.
              <br />
              3. <strong>Xếp hạng thông minh</strong>: AI đối chiếu và giải thích lý do từng ứng viên phù hợp.
            </p>
          </div>
        </div>
      )}

      {/* Modal chi tiết CV */}
      {selectedCandidate && (
        <CvDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCandidate(null);
          }}
          candidate={selectedCandidate}
          jobTitle={selectedCandidate.headline || selectedCandidate.title}
        />
      )}
    </div>
  );
}

