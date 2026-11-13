import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApprovedCompanies } from '../../../infrastructure/api/companyApi';

export default function CompanyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('q') || '';
  const initialIndustry = searchParams.get('industry') || 'all';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedIndustry, setSelectedIndustry] = useState(initialIndustry);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getApprovedCompanies(0, 100);
      const list = Array.isArray(res) ? res : res?.content ?? res?.items ?? [];
      const formatted = list.map((c) => ({
        id: c.id,
        name: c.name || 'Công ty chưa đặt tên',
        industry: c.companyType || 'Doanh nghiệp',
        tagline: c.description || 'Doanh nghiệp uy tín trên nền tảng KiemJob',
        logo: c.logoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=150&q=80',
        banner: c.bannerUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        size: '50-150 nhân viên',
        rating: 4.8,
        reviewsCount: 120,
        verified: c.status === 'approved',
        openJobs: 0,
        membershipTier: c.membershipTier || 'bronze',
        perks: ['Môi trường chuyên nghiệp', 'Đãi ngộ cạnh tranh', 'Cơ hội thăng tiến'],
      }));
      setCompanies(formatted);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách công ty');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Danh sách các lĩnh vực/ngành nghề độc nhất
  const industries = useMemo(() => {
    const set = new Set();
    companies.forEach((comp) => {
      if (comp.industry) set.add(comp.industry);
    });
    return Array.from(set);
  }, [companies]);

  // Đếm số lượng công ty theo từng ngành
  const industryCounts = useMemo(() => {
    const map = {};
    companies.forEach((comp) => {
      if (comp.industry) {
        map[comp.industry] = (map[comp.industry] || 0) + 1;
      }
    });
    return map;
  }, [companies]);

  const handleIndustryChange = (ind) => {
    setSelectedIndustry(ind);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!ind || ind === 'all') {
        next.delete('industry');
      } else {
        next.set('industry', ind);
      }
      return next;
    }, { replace: true });
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter((comp) => {
      const matchSearch =
        !searchTerm.trim() ||
        comp.name?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        comp.industry?.toLowerCase().includes(searchTerm.toLowerCase().trim());

      const matchIndustry =
        selectedIndustry === 'all' ||
        comp.industry?.toLowerCase() === selectedIndustry.toLowerCase();

      return matchSearch && matchIndustry;
    });
  }, [companies, searchTerm, selectedIndustry]);

  return (
    <div className="w-full bg-[#faf8ff] min-h-screen pb-16">
      {/* Header Banner */}
      <div className="w-full bg-gradient-to-r from-[#005c55] via-[#0f766e] to-[#007952] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
            Top 100 Doanh nghiệp uy tín
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Khám Phá Các Công Ty Công Nghệ Hàng Đầu
          </h1>
          <p className="text-white/80 text-sm text-[14px] max-w-2xl leading-relaxed">
            Tìm hiểu văn hóa doanh nghiệp, chế độ đãi ngộ vượt trội và cơ hội phát triển sự nghiệp tại các kỳ lân công nghệ và tập đoàn lớn nhất Việt Nam.
          </p>

          {/* Search bar inside banner */}
          <div className="max-w-2xl bg-white rounded-2xl p-2 flex flex-col sm:flex-row items-center gap-2 shadow-lg">
            <div className="flex items-center gap-2 flex-1 w-full px-2">
              <span className="material-symbols-outlined text-[#005c55] text-[22px]">search</span>
              <input
                type="text"
                placeholder="Tìm theo tên công ty, lĩnh vực..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (e.target.value.trim()) {
                      next.set('q', e.target.value.trim());
                    } else {
                      next.delete('q');
                    }
                    return next;
                  }, { replace: true });
                }}
                className="w-full bg-transparent text-sm text-[#131b2e] outline-none placeholder:text-[#6e7977] font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.delete('q');
                      return next;
                    }, { replace: true });
                  }}
                  className="text-[#6e7977] hover:text-[#ba1a1a]"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {/* Industry Select Dropdown */}
            <div className="flex items-center gap-1 w-full sm:w-auto px-3 py-2 bg-[#f2f3ff] rounded-xl text-xs">
              <span className="material-symbols-outlined text-[#005c55] text-[18px]">category</span>
              <select
                value={selectedIndustry}
                onChange={(e) => handleIndustryChange(e.target.value)}
                className="bg-transparent text-[#131b2e] font-semibold outline-none cursor-pointer"
              >
                <option value="all">Tất cả ngành nghề</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind} ({industryCounts[ind] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Companies Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-6">
        {/* Industry Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => handleIndustryChange('all')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedIndustry === 'all'
                ? 'bg-[#005c55] text-white shadow-sm ring-2 ring-[#005c55]/20'
                : 'bg-white hover:bg-[#eaedff] text-[#3e4947] border border-[#eaedff]'
            }`}
          >
            <span>Tất cả ngành</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              selectedIndustry === 'all' ? 'bg-white/20 text-white' : 'bg-[#f2f3ff] text-[#6e7977]'
            }`}>
              {companies.length}
            </span>
          </button>

          {industries.map((ind) => {
            const isSelected = selectedIndustry.toLowerCase() === ind.toLowerCase();
            return (
              <button
                key={ind}
                type="button"
                onClick={() => handleIndustryChange(isSelected ? 'all' : ind)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#005c55] text-white shadow-sm ring-2 ring-[#005c55]/20'
                    : 'bg-white hover:bg-[#eaedff] text-[#3e4947] border border-[#eaedff]'
                }`}
              >
                <span>{ind}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#f2f3ff] text-[#005c55]'
                }`}>
                  {industryCounts[ind] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#131b2e] flex items-center gap-2">
            <span>{filteredCompanies.length} Doanh nghiệp tiêu biểu</span>
            {selectedIndustry !== 'all' && (
              <span className="text-xs font-medium text-[#005c55] bg-[#e6f7f5] px-2.5 py-0.5 rounded-full">
                Ngành: {selectedIndustry}
              </span>
            )}
          </h2>

          {(selectedIndustry !== 'all' || searchTerm.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                handleIndustryChange('all');
                setSearchParams({}, { replace: true });
              }}
              className="text-xs font-bold text-[#ba1a1a] hover:underline cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        {error ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-rose-200 space-y-3">
            <span className="material-symbols-outlined text-[48px] text-rose-500">error</span>
            <p className="text-base font-bold text-[#131b2e]">{error}</p>
            <button
              type="button"
              onClick={fetchCompanies}
              className="px-4 py-2 bg-[#005c55] text-white text-xs font-bold rounded-xl hover:bg-[#007952] transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#eaedff]">
            <p className="text-sm text-[#6e7977]">Đang tải danh sách doanh nghiệp...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#eaedff] space-y-3">
            <span className="material-symbols-outlined text-[48px] text-[#6e7977]">domain_disabled</span>
            <p className="text-base font-bold text-[#131b2e]">Không tìm thấy doanh nghiệp phù hợp</p>
            <p className="text-xs text-[#6e7977]">Thử chọn ngành nghề khác hoặc xóa từ khóa tìm kiếm</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                handleIndustryChange('all');
                setSearchParams({}, { replace: true });
              }}
              className="px-4 py-2 bg-[#005c55] text-white text-xs font-bold rounded-xl"
            >
              Xem tất cả doanh nghiệp
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((comp) => (
              <div
                key={comp.id}
                className="bg-white rounded-3xl overflow-hidden border border-[#eaedff] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="h-32 overflow-hidden relative">
                    <img
                      src={comp.banner}
                      alt={comp.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>

                  <div className="p-5 pt-0 relative">
                    <img
                      src={comp.logo}
                      alt={comp.name}
                      className="w-16 h-16 rounded-2xl object-contain bg-white p-1.5 border-2 border-white shadow-md -mt-8 relative z-10"
                    />

                    <div className="mt-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#131b2e] group-hover:text-[#005c55] transition-colors">
                        {comp.name}
                      </h3>
                      {comp.verified && (
                        <span className="material-symbols-outlined text-[#005c55] text-[20px] fill" title="Doanh nghiệp đã xác minh">
                          verified
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleIndustryChange(comp.industry)}
                      className="text-xs text-[#006c4e] hover:text-[#005c55] font-semibold mt-1 inline-flex items-center gap-1 hover:underline cursor-pointer"
                      title="Lọc các công ty cùng ngành"
                    >
                      <span className="material-symbols-outlined text-[13px]">category</span>
                      <span>{comp.industry}</span>
                    </button>
                    <p className="text-sm text-[14px] text-[#3e4947] mt-2 line-clamp-2 leading-relaxed">{comp.tagline}</p>

                    <div className="mt-4 flex items-center gap-3 text-xs text-[#6e7977]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">group</span>
                        {comp.size}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold text-[#131b2e]">
                        <span className="material-symbols-outlined text-[15px] text-amber-500 fill">star</span>
                        {comp.rating} ({comp.reviewsCount})
                      </span>
                    </div>

                    {/* Highlights */}
                    <div className="mt-3 pt-3 border-t border-[#f2f3ff] space-y-1">
                      {comp.perks?.slice(0, 2).map((perk, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-[#3e4947]">
                          <span className="material-symbols-outlined text-[#006c4e] text-[14px]">check</span>
                          <span className="truncate">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 mt-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#005c55]">{comp.openJobs} việc làm đang mở</span>
                  <Link
                    to={`/companies/${comp.id}`}
                    className="px-3 py-1.5 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-xs font-bold rounded-xl transition-colors"
                  >
                    Xem trang công ty
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-[#eaedff] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <img
                  src={selectedCompany.logo}
                  alt={selectedCompany.name}
                  className="w-16 h-16 rounded-2xl object-contain bg-[#f2f3ff] p-2 border border-[#eaedff]"
                />
                <div>
                  <h3 className="text-xl font-bold text-[#131b2e]">{selectedCompany.name}</h3>
                  <p className="text-xs text-[#005c55] font-semibold">{selectedCompany.industry}</p>
                  <p className="text-xs text-[#6e7977] mt-1">{selectedCompany.location}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="p-1 rounded-lg text-[#6e7977] hover:text-[#ba1a1a]"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div>
              <h4 className="text-sm font-bold text-[#131b2e] mb-1">Giới thiệu tổng quan</h4>
              <p className="text-sm text-[14px] text-[#3e4947] leading-relaxed">{selectedCompany.about}</p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-[#131b2e] mb-2">Chế độ đãi ngộ nổi bật</h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-[#3e4947]">
                {selectedCompany.perks.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#006c4e] text-[16px] shrink-0 mt-0.5">check_circle</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-[#eaedff] flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-bold text-[#005c55]">{selectedCompany.openJobs} vị trí đang tuyển</span>
              <div className="flex items-center gap-2">
                <Link
                  to={`/companies/${selectedCompany.id}`}
                  onClick={() => setSelectedCompany(null)}
                  className="px-4 py-2.5 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-xs font-bold rounded-xl transition-all"
                >
                  Xem trang công ty
                </Link>
                <Link
                  to={`/jobs?q=${encodeURIComponent(selectedCompany.name)}`}
                  onClick={() => setSelectedCompany(null)}
                  className="px-5 py-2.5 bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Xem các việc làm
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
