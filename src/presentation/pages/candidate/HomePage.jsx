import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jobPostApi from '../../../infrastructure/api/jobPostApi';
import jobCategoryApi from '../../../infrastructure/api/jobCategoryApi';
import companyApi from '../../../infrastructure/api/companyApi';
import provinceApi from '../../../infrastructure/api/provinceApi';
import savedJobApi from '../../../infrastructure/api/savedJobApi';
import recommendationApi from '../../../infrastructure/api/recommendationApi';
import SearchSuggestionDropdown from '../../components/common/SearchSuggestionDropdown';
import { getLocalSearchHistory, saveLocalSearchKeyword } from '../../../infrastructure/utils/searchHistoryUtils';


// Icon mapping helper theo tên ngành nghề
const getCategoryIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (
    lower.includes('thông tin') ||
    lower.includes('software') ||
    lower.includes('it') ||
    lower.includes('phần mềm') ||
    lower.includes('developer')
  ) {
    return 'fa-solid fa-laptop-code';
  }
  if (lower.includes('kế toán') || lower.includes('tài chính') || lower.includes('ngân hàng')) {
    return 'fa-solid fa-chart-pie';
  }
  if (lower.includes('marketing') || lower.includes('truyền thông') || lower.includes('quảng cáo')) {
    return 'fa-solid fa-bullhorn';
  }
  if (
    lower.includes('thiết kế') ||
    lower.includes('đồ họa') ||
    lower.includes('ui/ux') ||
    lower.includes('design')
  ) {
    return 'fa-solid fa-palette';
  }
  if (
    lower.includes('kinh doanh') ||
    lower.includes('bán hàng') ||
    lower.includes('sales')
  ) {
    return 'fa-solid fa-store';
  }
  if (
    lower.includes('nhân sự') ||
    lower.includes('hành chính') ||
    lower.includes('hr')
  ) {
    return 'fa-solid fa-users';
  }
  if (lower.includes('xây dựng') || lower.includes('kỹ sư') || lower.includes('cơ khí')) {
    return 'fa-solid fa-screwdriver-wrench';
  }
  if (lower.includes('y tế') || lower.includes('dược') || lower.includes('bác sĩ')) {
    return 'fa-solid fa-heart-pulse';
  }
  if (lower.includes('giáo dục') || lower.includes('đào tạo') || lower.includes('giảng viên')) {
    return 'fa-solid fa-graduation-cap';
  }
  if (lower.includes('du lịch') || lower.includes('khách sạn') || lower.includes('nhà hàng')) {
    return 'fa-solid fa-hotel';
  }
  if (lower.includes('vận tải') || lower.includes('logistics') || lower.includes('kho')) {
    return 'fa-solid fa-truck-fast';
  }
  return 'fa-solid fa-briefcase';
};

// Format mức lương hiển thị thân thiện
const formatSalary = (min, max) => {
  const minNum = min != null ? Number(min) : null;
  const maxNum = max != null ? Number(max) : null;

  if (minNum == null && maxNum == null) return 'Thỏa thuận';

  const toMillion = (val) => {
    if (val == null) return null;
    if (val >= 1000000) {
      const m = val / 1000000;
      return m % 1 === 0 ? m : m.toFixed(1);
    }
    return val;
  };

  const minM = toMillion(minNum);
  const maxM = toMillion(maxNum);

  if (minM != null && maxM != null) {
    return `${minM} - ${maxM} triệu`;
  }
  if (minM != null) {
    return `Từ ${minM} triệu`;
  }
  if (maxM != null) {
    return `Lên đến ${maxM} triệu`;
  }
  return 'Thỏa thuận';
};

// Chuẩn hóa dữ liệu tin tuyển dụng
const normalizeJob = (item) => {
  const companyName =
    typeof item.company === 'object'
      ? item.company?.name
      : item.companyName || item.company || 'Doanh nghiệp uy tín';

  const companyLogo =
    (typeof item.company === 'object'
      ? item.company?.logoUrl ?? item.company?.logo_url
      : item.companyLogo) || null;

  const salaryDisplay = formatSalary(
    item.salaryMin ?? item.salary_min,
    item.salaryMax ?? item.salary_max
  );

  let locationDisplay = item.location || 'Toàn quốc';
  if (Array.isArray(item.addresses) && item.addresses.length > 0) {
    const provs = item.addresses
      .map((a) => a.provinceName || a.city || a.addressDetail)
      .filter(Boolean);
    if (provs.length > 0) {
      locationDisplay = provs[0];
    }
  }

  return {
    id: item.id,
    title: item.title || 'Vị trí tuyển dụng',
    companyId: item.companyId ?? item.company?.id ?? 1,
    companyName,
    companyLogo,
    salary: salaryDisplay,
    location: locationDisplay,
    isFeatured: Boolean(item.isFeatured ?? item.is_featured),
    workingMode: item.workingMode || 'Toàn thời gian',
    deadline: item.applicationDeadline || null,
    matchScore: item.matchScore != null ? item.matchScore : null,
    matchReasons: Array.isArray(item.matchReasons) ? item.matchReasons : [],
  };

};

export default function HomePage() {
  const navigate = useNavigate();

  // Search State
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Dropdowns in Hero
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  // Search History (Tối đa 5 lịch sử, tự động xóa quá 1 tuần)
  const [searchHistory, setSearchHistory] = useState(() =>
    getLocalSearchHistory().map((item) => item.keyword)
  );
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // VIP Hero Banner active index
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // API Data State
  const [categories, setCategories] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [featuredJobsList, setFeaturedJobsList] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [provinces, setProvinces] = useState([]);

  const [savedJobIds, setSavedJobIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States for "Việc làm nổi bật"
  const [featuredJobType, setFeaturedJobType] = useState('office'); // 'office' | 'blue-collar'
  const [featuredFilterOption, setFeaturedFilterOption] = useState('cities');
  const [featuredSmartLocation, setFeaturedSmartLocation] = useState('all');
  const [featuredPage, setFeaturedPage] = useState(1);
  const featuredPageSize = 9;

  // Filter States for "Việc làm hấp dẫn"
  const [attractiveSmartLocation, setAttractiveSmartLocation] = useState('all');
  const [attractivePage, setAttractivePage] = useState(1);
  const attractivePageSize = 6;

  // Category Carousel State
  const [categoryPage, setCategoryPage] = useState(0);

  const heroSearchRef = useRef(null);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [catsRes, jobsRes, featuredRes, compsRes, provsRes, recRes] =
          await Promise.allSettled([
            jobCategoryApi.getCategories(),
            jobPostApi.getJobPosts({ status: 'open', size: 50 }),
            jobPostApi.getFeaturedJobs ? jobPostApi.getFeaturedJobs() : Promise.resolve([]),
            companyApi.getApprovedCompanies(0, 16),
            provinceApi.getProvinces(),
            recommendationApi.getRecommendedJobs({ page: 0, size: 6 }),
          ]);


        if (!isMounted) return;

        // Categories
        if (catsRes.status === 'fulfilled') {
          const catList = Array.isArray(catsRes.value) ? catsRes.value : [];
          setCategories(catList);
        }

        // All open jobs
        let openJobs = [];
        if (jobsRes.status === 'fulfilled') {
          const jData = jobsRes.value;
          const raw = Array.isArray(jData)
            ? jData
            : Array.isArray(jData?.content)
              ? jData.content
              : Array.isArray(jData?.data)
                ? jData.data
                : [];
          openJobs = raw.filter((j) => j.status === 'open');
          setAllJobs(openJobs.map(normalizeJob));
        }

        // Featured jobs
        let fJobs = [];
        if (featuredRes.status === 'fulfilled' && Array.isArray(featuredRes.value) && featuredRes.value.length > 0) {
          fJobs = featuredRes.value.filter((j) => j.status === 'open').map(normalizeJob);
        } else {
          // Lọc từ open jobs có isFeatured = true
          fJobs = openJobs.filter((j) => j.isFeatured || j.is_featured).map(normalizeJob);
        }

        // Nếu số tin nổi bật ít, ưu tiên tin có isFeatured rồi bổ sung các tin tốt nhất
        if (fJobs.length === 0 && openJobs.length > 0) {
          fJobs = openJobs.map(normalizeJob);
        }
        setFeaturedJobsList(fJobs);

        // Companies
        if (compsRes.status === 'fulfilled') {
          const compData = compsRes.value;
          const comps = Array.isArray(compData)
            ? compData
            : Array.isArray(compData?.content)
              ? compData.content
              : Array.isArray(compData?.data)
                ? compData.data
                : [];
          setCompanies(comps);
        }

        // Provinces
        if (provsRes.status === 'fulfilled') {
          const pData = provsRes.value;
          const provList = Array.isArray(pData)
            ? pData
            : Array.isArray(pData?.data)
              ? pData.data
              : [];
          setProvinces(provList);
        }

        // Recommended jobs
        if (recRes && recRes.status === 'fulfilled') {
          const rData = recRes.value;
          const rawRec = Array.isArray(rData)
            ? rData
            : Array.isArray(rData?.content)
              ? rData.content
              : Array.isArray(rData?.data)
                ? rData.data
                : [];
          setRecommendedJobs(rawRec.map(normalizeJob));
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu trang chủ:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingRecommended(false);
        }
      }

    };

    loadData();

    // Tải danh sách đã lưu
    savedJobApi
      .getSavedJobs()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setSavedJobIds(list.map((item) => String(item.jobId ?? item.id)));
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, []);

  // Xử lý click ngoài để đóng dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (heroSearchRef.current && !heroSearchRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
        setShowLocationDropdown(false);
        setShowSearchHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý tìm kiếm
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed) {
      recommendationApi.saveSearchKeyword(trimmed);
      const updatedList = saveLocalSearchKeyword(trimmed);
      setSearchHistory(updatedList.map((item) => item.keyword));
    }
    setShowSearchDropdown(false);
    setShowCategoryDropdown(false);
    setShowLocationDropdown(false);
    setShowSearchHistory(false);

    const params = new URLSearchParams();
    if (trimmed) params.append('q', trimmed);
    if (selectedCategory && selectedCategory !== 'all') {
      params.append('category', selectedCategory);
    }
    if (selectedLocation && selectedLocation !== 'all') {
      params.append('location', selectedLocation);
    }
    navigate(`/jobs?${params.toString()}`);
  };

  // Lưu hoặc bỏ lưu tin tuyển dụng
  const toggleSave = async (jobId) => {
    const idStr = String(jobId);
    const isSaved = savedJobIds.includes(idStr);
    try {
      if (isSaved) {
        await savedJobApi.removeSavedJob(jobId);
        setSavedJobIds((prev) => prev.filter((x) => x !== idStr));
      } else {
        await savedJobApi.saveJob(jobId);
        setSavedJobIds((prev) => [...prev, idStr]);
      }
    } catch (err) {
      if (err?.status === 401 || err?.statusCode === 401) {
        navigate('/login');
      }
    }
  };

  // Danh sách tin việc làm nổi bật được lọc theo tab địa điểm / loại công việc
  const filteredFeaturedJobs = useMemo(() => {
    let list = [...featuredJobsList];
    if (list.length === 0) list = [...allJobs];

    if (featuredSmartLocation !== 'all' && featuredSmartLocation !== 'random') {
      const locLower = featuredSmartLocation.toLowerCase();
      list = list.filter((j) => {
        const jLoc = (j.location || '').toLowerCase();
        if (locLower === 'miền bắc') {
          return ['hà nội', 'hải phòng', 'quảng ninh', 'bắc ninh', 'hải dương', 'vĩnh phúc'].some((c) =>
            jLoc.includes(c)
          );
        }
        if (locLower === 'miền nam') {
          return ['hồ chí minh', 'sài gòn', 'bình dương', 'đồng nai', 'long an', 'cần thơ', 'vũng tàu'].some((c) =>
            jLoc.includes(c)
          );
        }
        return jLoc.includes(locLower);
      });
    }

    return list;
  }, [featuredJobsList, allJobs, featuredSmartLocation]);

  const featuredTotalPages = Math.ceil(filteredFeaturedJobs.length / featuredPageSize) || 1;
  const pagedFeaturedJobs = useMemo(() => {
    const start = (featuredPage - 1) * featuredPageSize;
    return filteredFeaturedJobs.slice(start, start + featuredPageSize);
  }, [filteredFeaturedJobs, featuredPage, featuredPageSize]);

  // Danh sách việc làm hấp dẫn
  const filteredAttractiveJobs = useMemo(() => {
    let list = [...allJobs];
    if (attractiveSmartLocation !== 'all') {
      const locLower = attractiveSmartLocation.toLowerCase();
      list = list.filter((j) => (j.location || '').toLowerCase().includes(locLower));
    }
    return list;
  }, [allJobs, attractiveSmartLocation]);

  const attractiveTotalPages = Math.ceil(filteredAttractiveJobs.length / attractivePageSize) || 1;
  const pagedAttractiveJobs = useMemo(() => {
    const start = (attractivePage - 1) * attractivePageSize;
    return filteredAttractiveJobs.slice(start, start + attractivePageSize);
  }, [filteredAttractiveJobs, attractivePage, attractivePageSize]);

  // Categories hiển thị chia thành nhóm cho carousel
  const categoriesPerPage = 8;
  const maxCategoryPages = Math.ceil(categories.length / categoriesPerPage) || 1;
  const displayedCategories = useMemo(() => {
    const start = categoryPage * categoriesPerPage;
    return categories.slice(start, start + categoriesPerPage);
  }, [categories, categoryPage]);

  // Tên danh mục đang chọn hiển thị trên hero
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return 'Danh mục Nghề';
    const found = categories.find((c) => String(c.id) === String(selectedCategory));
    return found ? found.name : 'Danh mục Nghề';
  }, [selectedCategory, categories]);

  // Tên tỉnh thành đang chọn hiển thị trên hero
  const selectedLocationName = useMemo(() => {
    if (!selectedLocation || selectedLocation === 'all') return 'Địa điểm';
    return selectedLocation;
  }, [selectedLocation]);

  // Interactive Hero Slides (Theo giaodien/home.html)
  const heroSlides = [
    {
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBtV06ablM645qdavrpV1ZhgSwt5D1qh4HPcQJtjKPipHMgNeaVSsCDrDtERt4h0DcCCyeYRs_TErDJXyLjkicaOStmihkHB1Bd91PzU6lXXu5lb8bFwEm21LheCSg61qsArXUE-hnEyIf4h4Joc2WQuEKTOXA4YGWI6IjpJVq_DovO00IlrygBSzpcZa59I_wiXRAZ-TXbMCYR7N3fJ5U4SQ3B2AA1sAoj93-hIr29',
      badge: 'Phỏng vấn 1:1',
      title: 'Gặp gỡ Nhà tuyển dụng hàng đầu',
    },
    {
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-Sh70R-vuyw6mSfzMYgbRph2yZ-htRgIs7NzIgEiB1hmZxnngmhz1p7EwfyQ1fhO6yfs8BUu2UnL7c50yaXCjZif-h88kDEopX4TPEPp3-6-Gx-hmRBMcRgJ9f5d3Wz5bqBOz8DVvbm39VVNcu1AQfWjnRAMLRetFU22XqiESLiD3V2sO6H1EN4pQNcXJjw-sHNNuiTN2lTxSKj0GpEGRNNCgFua5KF8RZvj0oGOJ',
      badge: 'Văn hóa công ty',
      title: 'Đội ngũ năng động & bứt phá thành công',
    },
  ];

  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      {/* ========================================================= */}
      {/* 1. HERO SECTION (Chuẩn giao diện giaodien/home.html)       */}
      {/* ========================================================= */}
      <section className="relative bg-gradient-to-b from-[#f0fdfa] via-white to-[#faf8ff] text-[#131b2e] pt-10 pb-20 lg:pt-14 lg:pb-24 border-b border-emerald-100 z-30">
        {/* Khối decor bo viền cô lập overflow-hidden để không cắt ngang dropdown */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-20 w-[36rem] h-[36rem] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-1/3 -right-20 w-[38rem] h-[38rem] rounded-full bg-[#97f5cc]/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[42rem] h-[18rem] rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#6ee7b7_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline, Description, Quick Search, Rating */}
            <div className="lg:col-span-6 flex flex-col items-start">
              {/* Display Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight mb-5 leading-[1.12] font-extrabold">
                Mở Cánh Cửa<br />
                Tới <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005c55] via-[#0f766e] to-[#006c4e]">Sự Nghiệp</span><br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Bứt Phá</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-700 max-w-xl mb-8 leading-relaxed">
                KiemJob kết hợp công nghệ AI tuyển dụng thông minh giúp bạn kết nối việc làm mơ ước, tự động tối ưu hóa CV chuẩn ATS và bứt phá thu nhập mỗi ngày.
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <Link
                  to="/jobs"
                  className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-[#005c55] hover:bg-[#007952] text-white text-sm font-semibold shadow-xl shadow-[#005c55]/20 transition-all active:scale-[0.98]"
                >
                  <span className="font-bold">Bắt Đầu Tìm Việc Ngay</span>
                  <span className="w-10 h-10 rounded-full bg-[#97f5cc] text-[#005c55] flex items-center justify-center group-hover:translate-x-0.5 transition-transform shadow-md">
                    <span className="material-symbols-outlined text-[20px] font-bold">arrow_forward</span>
                  </span>
                </Link>
              </div>

              {/* Search Form Box */}
              <div className="w-full max-w-xl bg-white rounded-2xl p-2.5 shadow-xl border border-emerald-100 text-[#131b2e] mb-8 relative z-50">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2">

                  <div className="flex-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#f2f3ff] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#005c55] transition-all">
                    <span className="material-symbols-outlined text-[#005c55] text-[20px] shrink-0">search</span>
                    <input
                      type="text"
                      value={keyword}
                      onFocus={() => setShowSearchDropdown(true)}
                      onChange={(e) => {
                        setKeyword(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      placeholder="Vị trí, kỹ năng, chức danh..."
                      className="w-full bg-transparent border-0 outline-none text-[#131b2e] placeholder:text-[#6e7977] text-sm"
                    />
                  </div>

                  <div className="w-full sm:w-auto flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#f2f3ff] shrink-0">
                    <span className="material-symbols-outlined text-[#005c55] text-[18px] shrink-0">location_on</span>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="bg-transparent border-0 outline-none text-[#131b2e] text-sm cursor-pointer pr-2 font-medium"
                    >
                      <option value="all">Toàn quốc</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#005c55]/20 transition-all shrink-0 active:scale-95 cursor-pointer"
                  >
                    <span>Tìm kiếm</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </form>

                <SearchSuggestionDropdown
                  isOpen={showSearchDropdown}
                  onClose={() => setShowSearchDropdown(false)}
                  query={keyword}
                  onSelect={(selected) => {
                    setKeyword(selected);
                    setShowSearchDropdown(false);
                    recommendationApi.saveSearchKeyword(selected);
                    saveLocalSearchKeyword(selected);
                    const params = new URLSearchParams();
                    params.append('q', selected);
                    if (selectedLocation && selectedLocation !== 'all') {
                      params.append('location', selectedLocation);
                    }
                    navigate(`/jobs?${params.toString()}`);
                  }}
                />
              </div>

            </div>

            {/* Right Column: Hero Showcase Slider & Floating Glass Badges */}
            <div className="lg:col-span-6 relative flex flex-col items-center justify-center">
              <div className="relative w-full max-w-[500px] mx-auto">
                {/* Main Slider Container */}
                <div className="relative rounded-[2.5rem] p-2 bg-gradient-to-b from-white via-white to-emerald-50/50 shadow-2xl border border-emerald-100">
                  <div className="relative rounded-[2rem] overflow-hidden bg-[#eaedff] aspect-[4/5] sm:aspect-square flex items-center justify-center group">
                    {heroSlides.map((slide, idx) => (
                      <div
                        key={idx}
                        className={`hero-slide absolute inset-0 transition-opacity duration-500 ${activeHeroSlide === idx ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                          }`}
                      >
                        <img
                          alt={slide.title}
                          src={slide.img}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent p-6 text-white">
                          <span className="px-2.5 py-1 rounded-full bg-[#97f5cc] text-[#00513a] text-[11px] font-bold inline-block mb-1 shadow-xs">
                            {slide.badge}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-white">
                            {slide.title}
                          </h4>
                        </div>
                      </div>
                    ))}

                    {/* Previous Button */}
                    <div className="absolute inset-y-0 left-3 flex items-center z-20">
                      <button
                        type="button"
                        aria-label="Ảnh trước"
                        onClick={() => setActiveHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                        className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md border border-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                      </button>
                    </div>

                    {/* Next Button */}
                    <div className="absolute inset-y-0 right-3 flex items-center z-20">
                      <button
                        type="button"
                        aria-label="Ảnh tiếp"
                        onClick={() => setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length)}
                        className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md border border-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dots Pagination */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  {heroSlides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setActiveHeroSlide(i)}
                      className={`hero-dot transition-all cursor-pointer ${activeHeroSlide === i
                          ? 'w-6 h-2 rounded-full bg-emerald-600'
                          : 'w-2 h-2 rounded-full bg-slate-300 hover:bg-slate-400'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className='flex justify-center p-6'>
        <img src='https://hanaminikata.com/image/757235976086093915/1308bf1caa4ba2b5.webp'>
        </img>
      </div>

      {/* ========================================================= */}
      {/* 2. VIỆC LÀM GỢI Ý & VIỆC LÀM NỔI BẬT                      */}
      {/* ========================================================= */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 relative z-10">
        {/* --- 2.0 VIỆC LÀM DÀNH RIÊNG CHO BẠN (#recommended-jobs-section) --- */}

        {recommendedJobs.length > 0 && (
          <section id="recommended-jobs-section" className="scroll-mt-6">
            <div className="bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 rounded-3xl border border-emerald-100 p-6 sm:p-8 shadow-sm">
              {/* Box Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-emerald-100/60">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-[#131b2e] tracking-tight">
                        Việc Làm Dành Riêng Cho Bạn
                      </h2>
                      <span className="hidden sm:inline-flex items-center gap-1 bg-[#005c55] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        AI Match
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gợi ý tự động dựa trên CV và hành vi quan tâm của bạn
                    </p>
                  </div>
                </div>

                <Link
                  to="/jobs"
                  className="text-sm font-bold text-[#005c55] hover:text-[#008060] flex items-center gap-1 hover:underline"
                >
                  Xem tất cả việc làm
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {/* Grid 3 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
                {recommendedJobs.map((job) => {
                  const isSaved = savedJobIds.includes(String(job.id));
                  return (
                    <div
                      key={job.id}
                      className="group bg-white rounded-2xl border border-emerald-100/80 hover:border-[#005c55] hover:shadow-xl transition-all duration-300 p-4 flex flex-col justify-between relative"
                    >
                      {/* Top Part: Logo & Info */}
                      <div>
                        <div className="flex items-start gap-3">
                          <Link
                            to={`/jobs/${job.id}`}
                            onClick={() => {
                              recommendationApi.recordInteraction({ jobId: job.id, actionType: 'SEARCH_CLICK' });
                            }}
                            className="w-13 h-13 rounded-xl border border-gray-100 p-1 flex items-center justify-center shrink-0 bg-white group-hover:scale-105 transition-transform overflow-hidden shadow-xs"
                          >
                            {job.companyLogo ? (
                              <img
                                src={job.companyLogo}
                                alt={job.companyName}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/60?text=Job';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-emerald-50 text-[#005c55] flex items-center justify-center font-bold text-base rounded-lg">
                                {job.companyName?.charAt(0) || 'K'}
                              </div>
                            )}
                          </Link>

                          <div className="flex-1 min-w-0">
                            {/* Badges line: Match Score badge */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              {job.matchScore != null && (
                                <span className="bg-emerald-50 text-[#005c55] text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                                  <span className="material-symbols-outlined text-[12px]">verified</span>
                                  {job.matchScore}% Phù hợp
                                </span>
                              )}
                              {job.isFeatured && (
                                <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                  Nổi bật
                                </span>
                              )}
                            </div>

                            <Link
                              to={`/jobs/${job.id}`}
                              onClick={() => {
                                recommendationApi.recordInteraction({ jobId: job.id, actionType: 'SEARCH_CLICK' });
                              }}
                              className="font-bold text-sm text-[#131b2e] group-hover:text-[#005c55] line-clamp-1 leading-snug transition-colors"
                              title={job.title}
                            >
                              {job.title}
                            </Link>

                            <Link
                              to={`/companies/${job.companyId}`}
                              className="text-xs text-gray-500 hover:text-[#005c55] line-clamp-1 mt-0.5"
                              title={job.companyName}
                            >
                              {job.companyName}
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Part: Salary, Location & Save Button */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-[#005c55] bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            {job.salary}
                          </span>
                          <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-[11px] truncate">
                            {job.location}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSave(job.id);
                          }}
                          className={`p-1.5 rounded-lg border transition-colors ${isSaved
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                              : 'border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/30'
                            }`}
                          title={isSaved ? 'Bỏ lưu tin' : 'Lưu tin tuyển dụng'}
                        >
                          <i className={`fa-${isSaved ? 'solid' : 'regular'} fa-bookmark text-xs`}></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* --- 2.1 VIỆC LÀM NỔI BẬT (#box-feature-jobs) --- */}
        <section id="list-feature-jobs" className="scroll-mt-6">

          <div className="bg-white rounded-2xl border border-[#eaedff] p-5 sm:p-6 shadow-sm">
            {/* Box Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#131b2e] uppercase tracking-tight">
                    Việc làm nổi bật
                  </h2>
                </div>
              </div>

              {/* Navigation Tools: Xem tất cả & Arrow buttons */}
              <div className="flex items-center gap-3">
                <Link
                  to="/jobs?filter=featured"
                  className="text-sm font-bold text-[#005c55] hover:text-[#008060] hover:underline flex items-center gap-1"
                >
                  Xem tất cả
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={featuredPage <= 1}
                    onClick={() => setFeaturedPage((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#005c55] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <button
                    type="button"
                    disabled={featuredPage >= featuredTotalPages}
                    onClick={() => setFeaturedPage((prev) => Math.min(featuredTotalPages, prev + 1))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#005c55] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Box Smart Filter: Chọn địa điểm thông minh */}
            <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
              <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
                <i className="fa-solid fa-filter text-xs text-[#005c55]"></i> Lọc theo:
              </span>
              {[
                { id: 'all', label: 'Ngẫu nhiên' },
                { id: 'Hà Nội', label: 'Hà Nội' },
                { id: 'Hồ Chí Minh', label: 'TP. Hồ Chí Minh' },
                { id: 'Miền Bắc', label: 'Miền Bắc' },
                { id: 'Miền Nam', label: 'Miền Nam' },
                { id: 'Đà Nẵng', label: 'Đà Nẵng' },
              ].map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setFeaturedSmartLocation(loc.id);
                    setFeaturedPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${featuredSmartLocation === loc.id
                    ? 'bg-[#005c55] text-white font-bold shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>

            {/* Hint message (TopCV style) */}
            <div className="bg-[#f0fdf4] border border-[#dcfce7] text-[#166534] text-xs px-3 py-2 rounded-xl flex items-center justify-between my-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-lightbulb text-amber-500"></i>
                <span>
                  <b>Gợi ý</b>: Các tin tuyển dụng có huy hiệu <b>TOP</b> được nhà tuyển dụng bảo đảm phản hồi hồ sơ trong 24h.
                </span>
              </div>
            </div>

            {/* Job Grid 3 Columns */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : pagedFeaturedJobs.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-box-open text-4xl text-gray-300 mb-2"></i>
                <p className="text-sm text-gray-500">Chưa có việc làm nổi bật phù hợp với tiêu chí lọc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {pagedFeaturedJobs.map((job) => {
                  const isSaved = savedJobIds.includes(String(job.id));
                  return (
                    <div
                      key={job.id}
                      className="group bg-white rounded-xl border border-[#eaedff] hover:border-[#005c55] hover:shadow-lg transition-all duration-200 p-4 flex flex-col justify-between relative"
                    >
                      {/* Top Part: Logo & Info */}
                      <div className="flex items-start gap-3">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="w-14 h-14 rounded-xl border border-gray-100 p-1 flex items-center justify-center shrink-0 bg-white group-hover:scale-105 transition-transform overflow-hidden shadow-xs"
                        >
                          {job.companyLogo ? (
                            <img
                              src={job.companyLogo}
                              alt={job.companyName}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/60?text=Job';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-emerald-50 text-[#005c55] flex items-center justify-center font-bold text-lg rounded-lg">
                              {job.companyName.charAt(0)}
                            </div>
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          {/* Badges line */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="bg-[#e8f7ee] text-[#00b14f] text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 border border-[#a3e635]/30">
                              <i className="fa-solid fa-gem text-[9px]"></i> TOP
                            </span>
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                              Nổi bật
                            </span>
                          </div>

                          <Link
                            to={`/jobs/${job.id}`}
                            className="font-bold text-sm text-[#131b2e] group-hover:text-[#005c55] line-clamp-1 leading-snug transition-colors"
                            title={job.title}
                          >
                            {job.title}
                          </Link>

                          <Link
                            to={`/companies/${job.companyId}`}
                            className="text-xs text-gray-500 hover:text-[#005c55] line-clamp-1 mt-0.5"
                            title={job.companyName}
                          >
                            {job.companyName}
                          </Link>
                        </div>
                      </div>

                      {/* Bottom Part: Salary, Location & Save Button */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-[#005c55] bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            {job.salary}
                          </span>
                          <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-[11px] truncate">
                            {job.location}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSave(job.id);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition shrink-0 ${isSaved
                            ? 'text-red-500 bg-red-50 hover:bg-red-100'
                            : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
                            }`}
                          title={isSaved ? 'Đã lưu việc làm' : 'Lưu tin tuyển dụng'}
                        >
                          <i className={`${isSaved ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} text-xs`}></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* --- 2.2 VIỆC LÀM HẤP DẪN (#box-attractive-jobs) --- */}
        <section id="box-attractive-jobs" className="scroll-mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col (8 cols): Attractive Jobs List */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#eaedff] p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#131b2e] uppercase tracking-tight">
                      Việc làm hấp dẫn
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to="/jobs"
                    className="text-sm font-bold text-[#005c55] hover:text-[#008060] hover:underline flex items-center gap-1"
                  >
                    Xem tất cả
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={attractivePage <= 1}
                      onClick={() => setAttractivePage((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#005c55] disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <i className="fa-solid fa-chevron-left text-xs"></i>
                    </button>
                    <button
                      type="button"
                      disabled={attractivePage >= attractiveTotalPages}
                      onClick={() => setAttractivePage((prev) => Math.min(attractiveTotalPages, prev + 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#005c55] disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <i className="fa-solid fa-chevron-right text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Location pills */}
              <div className="flex flex-wrap items-center gap-2 pt-4 pb-3">
                {['Tất cả', 'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Bình Dương'].map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setAttractiveSmartLocation(city === 'Tất cả' ? 'all' : city);
                      setAttractivePage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${(attractiveSmartLocation === 'all' && city === 'Tất cả') ||
                      attractiveSmartLocation === city
                      ? 'bg-[#005c55] text-white font-bold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* Grid 2 Columns for attractive jobs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {pagedAttractiveJobs.map((job) => {
                  const isSaved = savedJobIds.includes(String(job.id));
                  return (
                    <div
                      key={job.id}
                      className="group p-3.5 rounded-xl border border-gray-100 hover:border-[#005c55] bg-gray-50/50 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="w-12 h-12 rounded-lg border border-gray-200 p-1 bg-white flex items-center justify-center shrink-0 overflow-hidden"
                        >
                          {job.companyLogo ? (
                            <img
                              src={job.companyLogo}
                              alt={job.companyName}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/60?text=Job';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-emerald-50 text-[#005c55] flex items-center justify-center font-bold text-sm">
                              {job.companyName.charAt(0)}
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="font-bold text-sm text-[#131b2e] group-hover:text-[#005c55] line-clamp-1 leading-snug transition-colors"
                            title={job.title}
                          >
                            {job.title}
                          </Link>
                          <Link
                            to={`/companies/${job.companyId}`}
                            className="text-xs text-gray-500 hover:text-[#005c55] line-clamp-1 mt-0.5 block"
                            title={job.companyName}
                          >
                            {job.companyName}
                          </Link>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-extrabold text-[#005c55] text-xs">
                              {job.salary}
                            </span>
                            <span className="text-[11px] text-gray-400">•</span>
                            <span className="text-[11px] text-gray-500 truncate">
                              {job.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-gray-100 text-[11px]">
                        <span className="text-gray-400 flex items-center gap-1">
                          <i className="fa-regular fa-clock"></i> Ứng tuyển nhanh
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSave(job.id);
                          }}
                          className={`text-xs ${isSaved ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                            }`}
                        >
                          <i className={isSaved ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col (4 cols): Promotional Image & Banner */}
            <div className="lg:col-span-4 space-y-6">
              {/* Thẻ img bên cạnh Việc làm hấp dẫn (người dùng sẽ thêm src sau) */}
              <div className="rounded-2xl overflow-hidden border border-[#eaedff] shadow-sm bg-white">
                <img
                  src="https://hanaminikata.com/image/757235976086093915/e0d8111697fc3d0e.webp"
                  alt="Banner Việc làm hấp dẫn"
                  className="w-full h-auto min-h-[160px] object-cover rounded-2xl block bg-slate-50"
                />
              </div>

              {/* Side promotional banner: Chống lừa đảo */}
              <div className="rounded-2xl p-5 bg-gradient-to-br from-[#002b33] to-[#005c55] text-white shadow-md relative overflow-hidden">
                <div className="relative z-10">
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    An toàn lao động
                  </span>
                  <h4 className="font-bold text-base mt-2 text-[#2fff8c]">
                    Tìm việc an toàn - Chống lừa đảo cùng KiemJob
                  </h4>
                  <p className="text-xs text-white/80 mt-1 leading-relaxed">
                    100% doanh nghiệp và tin tuyển dụng được kiểm duyệt chặt chẽ, bảo vệ thông tin ứng viên tối đa.
                  </p>
                  <Link
                    to="/jobs"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#005c55] rounded-xl font-bold text-xs hover:bg-[#2fff8c] transition shadow"
                  >
                    Khám phá ngay <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 2.3 THƯƠNG HIỆU TIÊU BIỂU (#box-featured-brands) --- */}
        <section id="box-featured-brands" className="scroll-mt-6 bg-white rounded-2xl border border-[#eaedff] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#131b2e] uppercase tracking-tight">
                  Thương hiệu tiêu biểu
                </h2>
              </div>
            </div>

            <Link
              to="/companies"
              className="text-sm font-bold text-[#005c55] hover:text-[#008060] hover:underline flex items-center gap-1"
            >
              Xem tất cả thương hiệu
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </Link>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 pt-3 pb-4">
            Khám phá các doanh nghiệp và tập đoàn hàng đầu đang tuyển dụng nhân tài cùng chế độ đãi ngộ hấp dẫn.
          </p>

          {/* Grid hiển thị các thương hiệu tiêu biểu từ API (hoàn toàn không hardcode) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {companies.slice(0, 12).map((comp) => (
              <Link
                key={comp.id}
                to={`/companies/${comp.id}`}
                className="group p-3.5 rounded-xl border border-gray-100 hover:border-[#005c55] bg-gray-50/50 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col items-center text-center justify-between min-h-[145px]"
              >
                <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 p-1.5 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
                  {comp.logoUrl ? (
                    <img
                      src={comp.logoUrl}
                      alt={comp.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/60?text=Brand';
                      }}
                    />
                  ) : (
                    <span className="text-lg font-bold text-[#005c55]">
                      {comp.name ? comp.name.charAt(0).toUpperCase() : 'B'}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 w-full">
                  <h4 className="font-bold text-xs text-[#131b2e] group-hover:text-[#005c55] line-clamp-1 transition-colors" title={comp.name}>
                    {comp.name}
                  </h4>
                  <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
                    {comp.companyType === 'big' ? 'Tập đoàn lớn' : 'Doanh nghiệp uy tín'}
                  </span>
                </div>

                <span className="mt-2 text-[10px] font-semibold text-[#005c55] bg-emerald-50 px-2 py-0.5 rounded-full group-hover:bg-[#005c55] group-hover:text-white transition-colors">
                  Khám phá
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ========================================================= */}
      {/* 3. NGÀNH NGHỀ NỔI BẬT (Top ngành nghề)                     */}
      {/* ========================================================= */}
      <section className="bg-white py-14 border-t border-[#eaedff]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight">
                Top ngành nghề nổi bật
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Tiếp cận cơ hội nghề nghiệp đa dạng với chế độ đãi ngộ hấp dẫn nhất
              </p>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={categoryPage <= 0}
                onClick={() => setCategoryPage((prev) => Math.max(0, prev - 1))}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-[#005c55] disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <i className="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <span className="text-xs text-gray-400 font-medium px-1">
                {categoryPage + 1} / {maxCategoryPages}
              </span>
              <button
                type="button"
                disabled={categoryPage >= maxCategoryPages - 1}
                onClick={() => setCategoryPage((prev) => Math.min(maxCategoryPages - 1, prev + 1))}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-[#005c55] disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>

          {/* Categories Grid 4 Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedCategories.map((cat) => {
              const iconClass = getCategoryIcon(cat.name);
              return (
                <Link
                  key={cat.id}
                  to={`/jobs?category=${cat.id}`}
                  className="group bg-[#faf8ff] hover:bg-white border border-[#eaedff] hover:border-[#005c55] p-5 rounded-2xl shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#e8f7ee] to-[#ccfbf1] text-[#005c55] flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-[#005c55] group-hover:text-white transition-all duration-300 mb-3 shadow-xs">
                    <i className={iconClass}></i>
                  </div>
                  <h3 className="font-bold text-sm text-[#131b2e] group-hover:text-[#005c55] line-clamp-1 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 font-medium">
                    1.200+ việc làm mở
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. NHÀ TUYỂN DỤNG NỔI BẬT (Diamond & VIP Employers)        */}
      {/* ========================================================= */}
      <section className="bg-[#faf8ff] py-14 border-t border-[#eaedff]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight">
                Nhà tuyển dụng nổi bật
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Khám phá môi trường làm việc lý tưởng từ các thương hiệu uy tín bậc nhất
              </p>
            </div>

            <Link
              to="/companies"
              className="text-sm font-bold text-[#005c55] hover:text-[#008060] hover:underline flex items-center gap-1"
            >
              Xem tất cả nhà tuyển dụng
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </Link>
          </div>

          {/* Employers Grid 4 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {companies.slice(0, 8).map((comp) => (
              <Link
                key={comp.id}
                to={`/companies/${comp.id}`}
                className="group bg-white rounded-2xl border border-[#eaedff] hover:border-[#005c55] hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                {/* Banner Header */}
                <div className="h-20 bg-gradient-to-r from-[#005c55]/10 via-[#008060]/20 to-emerald-100 relative">
                  <div className="absolute top-2 right-2">
                    <span className="bg-white/90 backdrop-blur-sm text-amber-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 border border-amber-200">
                      <i className="fa-solid fa-gem text-[9px]"></i> TOP
                    </span>
                  </div>
                </div>

                {/* Company Content */}
                <div className="px-4 pb-4 -mt-8 flex flex-col items-center text-center flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-md p-1.5 overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {comp.logoUrl ? (
                      <img
                        src={comp.logoUrl}
                        alt={comp.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/60?text=Logo';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-emerald-50 text-[#005c55] flex items-center justify-center font-bold text-xl rounded-xl">
                        {comp.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-[#131b2e] group-hover:text-[#005c55] line-clamp-1 mt-3 transition-colors">
                    {comp.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {comp.description || 'Doanh nghiệp uy tín hàng đầu trong lĩnh vực hoạt động.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-100 w-full flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold text-[#005c55] bg-emerald-50 px-2 py-0.5 rounded">
                      Đang tuyển dụng
                    </span>
                    <span className="group-hover:translate-x-1 transition-transform text-[#005c55] font-bold flex items-center gap-1">
                      Chi tiết <i className="fa-solid fa-arrow-right text-[10px]"></i>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom Brand Carousel / Partner Logos Strip */}
          <div className="mt-12 pt-8 border-t border-gray-200/60">
            <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
              Đồng hành cùng 10.000+ doanh nghiệp hàng đầu Việt Nam
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
              {companies.slice(0, 8).map((comp) => (
                <Link
                  key={comp.id}
                  to={`/companies/${comp.id}`}
                  className="text-sm font-extrabold text-gray-600 hover:text-[#005c55] tracking-tight transition-colors"
                >
                  {comp.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
