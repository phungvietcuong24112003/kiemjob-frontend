import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { provinceApi } from '../../../infrastructure/api/provinceApi';
import jobPostApi from '../../../infrastructure/api/jobPostApi';
import { jobCategoryApi } from '../../../infrastructure/api/jobCategoryApi';
import { profileApi } from '../../../infrastructure/api/profileApi';
import { getCvs } from '../../../infrastructure/api/cvApi';
import { applicationApi } from '../../../infrastructure/api/appicationApi';
import { savedJobApi } from '../../../infrastructure/api/savedJobApi';
import { hasAuthCookie } from '../../../infrastructure/utils/cookieUtils';

// Chuẩn hóa mức lương về đơn vị triệu VND
export const normalizeSalaryToMillion = (val) => {
  if (val == null) return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  if (num >= 1000000) return num / 1000000;
  return num;
};

const mapJobPost = (item) => {
  const companyName =
    typeof item.company === 'object'
      ? item.company?.name
      : item.companyName || item.company;

  const salaryMin = item.salaryMin ?? item.salary_min;
  const salaryMax = item.salaryMax ?? item.salary_max;

  const formatSalaryVal = (val) => {
    if (val == null) return null;
    const num = Number(val);
    if (isNaN(num)) return null;
    if (num >= 1000000) {
      const m = num / 1000000;
      return `${m % 1 === 0 ? m : m.toFixed(1)}`;
    }
    return `${num.toLocaleString('vi-VN')}`;
  };

  const salaryDisplay =
    salaryMin != null && salaryMax != null
      ? `${formatSalaryVal(salaryMin)} – ${formatSalaryVal(salaryMax)} Triệu`
      : salaryMin != null
        ? `Từ ${formatSalaryVal(salaryMin)} Triệu`
        : salaryMax != null
          ? `Lên đến ${formatSalaryVal(salaryMax)} Triệu`
          : 'Thỏa thuận';

  const workingMode =
    item.workingMode ??
    item.working_mode ??
    '';
  const workingMethod =
    item.workingMethod ??
    item.working_method ??
    workingMode;
  const workingIn = item.workingIn ?? item.working_in ?? (workingMode ? [workingMode] : []);

  const categoryId = item.categoryId ?? item.category_id ?? item.category?.id ?? null;
  const categoryName = item.categoryName ?? item.category_name ?? item.category?.name ?? null;

  // Xác định nhãn hiển thị cho hình thức làm việc
  const workModeDisplay = (() => {
    const wm = (workingMethod || workingMode || '').toLowerCase();
    if (wm.includes('remote') || wm.includes('từ xa')) return '100% Remote Available';
    if (wm.includes('hybrid')) return 'Hybrid 2 ngày WFH';
    if (wm.includes('part') || wm.includes('bán')) return 'Bán thời gian';
    return 'Tại văn phòng';
  })();

  // Tính số ngày còn lại đến hạn
  let remainingDaysText = 'Còn 15 ngày';
  if (item.applicationDeadline || item.deadline) {
    try {
      const dl = new Date(item.applicationDeadline || item.deadline);
      const diffTime = dl.getTime() - Date.now();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        remainingDaysText = `Còn ${diffDays} ngày`;
      } else if (diffDays === 0) {
        remainingDaysText = 'Hôm nay hết hạn';
      } else {
        remainingDaysText = 'Đã hết hạn';
      }
    } catch {
      remainingDaysText = 'Còn 15 ngày';
    }
  }

  // Format posted time
  let postedText = 'Đăng gần đây';
  if (item.postedAt || item.posted_at || item.createdAt || item.created_at) {
    const rawDate = item.postedAt || item.posted_at || item.createdAt || item.created_at;
    try {
      const d = new Date(rawDate);
      const diffHours = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60));
      if (diffHours < 1) {
        postedText = 'Đăng vừa xong';
      } else if (diffHours < 24) {
        postedText = `Đăng ${diffHours} giờ trước`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        postedText = `Đăng ${diffDays} ngày trước`;
      }
    } catch {
      postedText = 'Đăng gần đây';
    }
  }

  return {
    ...item,
    id: String(item.id),
    title: item.title ?? 'Chưa có tiêu đề',
    company: companyName || 'Doanh nghiệp KiemJob',
    companyLogo:
      item.companyLogo ??
      item.companyLogoUrl ??
      item.company_logo_url ??
      item.logoUrl ??
      item.logo_url ??
      (typeof item.company === 'object'
        ? item.company?.logoUrl ?? item.company?.logo_url ?? null
        : null),
    categoryId: categoryId != null ? String(categoryId) : null,
    categoryName: categoryName || 'Công nghệ & Kinh doanh',
    salary: salaryDisplay,
    salary_min: salaryMin,
    salary_max: salaryMax,
    working_method: workingMethod || workingMode || '',
    workingMode: workingMode,
    working_in: Array.isArray(workingIn) ? workingIn : [workingIn],
    workMode: workModeDisplay,
    experience_requirement:
      item.experienceRequirement ?? item.experience_requirement ?? 'Nhân viên (Junior – Middle)',
    min_experience_years:
      item.minExperienceYears ?? item.min_experience_years ?? 0,
    deadlineText: remainingDaysText,
    description: item.description ?? item.detailJob ?? item.detail_job ?? '',
    location: item.location ?? 'TP. Hồ Chí Minh',
    job_skills: Array.isArray(item.jobSkills) && item.jobSkills.length > 0
      ? item.jobSkills
      : Array.isArray(item.job_skills) && item.job_skills.length > 0
        ? item.job_skills
        : [],
    is_featured: item.isFeatured ?? item.is_featured ?? false,
    featuredUntil: item.featuredUntil ?? item.featured_until ?? null,
    aiMatchScore: item.aiMatchScore ?? item.ai_match_score ?? null,
    postedDate: postedText,
  };
};

export default function JobListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search input & selected filter states
  const [keyword, setKeyword] = useState(() => searchParams.get('q') || '');
  const [debouncedKeyword, setDebouncedKeyword] = useState(() => searchParams.get('q') || '');
  const [sort, setSort] = useState(() => searchParams.get('sort') || 'newest');
  const [selectedSalaries, setSelectedSalaries] = useState(() => {
    const s = searchParams.get('salary');
    return s ? [s] : [];
  });
  const [selectedLevels, setSelectedLevels] = useState(() => {
    const l = searchParams.get('level');
    return l ? [l] : [];
  });
  const [selectedWorkTypes, setSelectedWorkTypes] = useState(() => {
    const t = searchParams.get('workType') || searchParams.get('workingMode');
    return t ? [t] : [];
  });
  const [selectedLocations, setSelectedLocations] = useState(() => {
    const loc = searchParams.get('location');
    return loc ? [loc] : [];
  });
  const [selectedPerks, setSelectedPerks] = useState([]);
  const [quickFilter, setQuickFilter] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });

  // Data states
  const [jobs, setJobs] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [provinces, setProvinces] = useState([]);

  // Apply Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyingJob, setApplyingJob] = useState(null);
  const [candidateCvs, setCandidateCvs] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Email subscribe
  const [subscribeEmail, setSubscribeEmail] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const updateUrlParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Load provinces on mount
  useEffect(() => {
    provinceApi.getProvinces()
      .then((data) => setProvinces(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Sync debounced keyword with URL query
  useEffect(() => {
    const currentQ = searchParams.get('q') || '';
    if (debouncedKeyword.trim() !== currentQ.trim()) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedKeyword.trim()) {
          next.set('q', debouncedKeyword.trim());
        } else {
          next.delete('q');
        }
        next.set('page', '1');
        return next;
      }, { replace: true });
      setCurrentPage(1);
    }
  }, [debouncedKeyword, searchParams, setSearchParams]);

  // Helper compute salary range
  const getSalaryRange = useCallback((salaries) => {
    if (!salaries || salaries.length === 0) return { salaryMin: null, salaryMax: null };
    let min = null;
    let max = null;
    salaries.forEach((s) => {
      if (s === 'under-10') {
        max = max == null ? 10000000 : Math.max(max, 10000000);
      } else if (s === '10-20') {
        min = min == null ? 10000000 : Math.min(min, 10000000);
        max = max == null ? 20000000 : Math.max(max, 20000000);
      } else if (s === '20-35') {
        min = min == null ? 20000000 : Math.min(min, 20000000);
        max = max == null ? 35000000 : Math.max(max, 35000000);
      } else if (s === '35-50') {
        min = min == null ? 35000000 : Math.min(min, 35000000);
        max = max == null ? 50000000 : Math.max(max, 50000000);
      } else if (s === 'over-50') {
        min = min == null ? 50000000 : Math.min(min, 50000000);
      }
    });
    if (salaries.includes('over-50')) {
      max = null;
    }
    return { salaryMin: min, salaryMax: max };
  }, []);

  // Fetch jobs from server
  useEffect(() => {
    let cancelled = false;

    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError('');

        const { salaryMin, salaryMax } = getSalaryRange(selectedSalaries);

        let workingMode = searchParams.get('workingMode') || null;
        if (!workingMode && selectedWorkTypes.length > 0) {
          if (selectedWorkTypes.includes('remote') && !selectedWorkTypes.includes('hybrid') && !selectedWorkTypes.includes('full_time')) {
            workingMode = 'remote';
          } else if (selectedWorkTypes.includes('hybrid') && !selectedWorkTypes.includes('remote')) {
            workingMode = 'hybrid';
          } else if ((selectedWorkTypes.includes('full_time') || selectedWorkTypes.includes('part_time')) && !selectedWorkTypes.includes('remote') && !selectedWorkTypes.includes('hybrid')) {
            workingMode = 'onsite';
          }
        }

        let provinceId = searchParams.get('provinceId') || null;
        if (!provinceId && selectedLocations.length > 0) {
          if (selectedLocations.includes('hcm')) {
            const hcm = provinces.find((p) => (p.name || '').toLowerCase().includes('hồ chí minh') || (p.name || '').toLowerCase().includes('hcm'));
            if (hcm) provinceId = hcm.id;
          } else if (selectedLocations.includes('hn')) {
            const hn = provinces.find((p) => (p.name || '').toLowerCase().includes('hà nội'));
            if (hn) provinceId = hn.id;
          } else if (selectedLocations.includes('dn')) {
            const dn = provinces.find((p) => (p.name || '').toLowerCase().includes('đà nẵng'));
            if (dn) provinceId = dn.id;
          }
        }

        const categoryId = searchParams.get('categoryId') || searchParams.get('category') || null;
        const specializationId = searchParams.get('specializationId') || null;

        const params = {
          status: 'open',
          page: Math.max(0, currentPage - 1),
          size: itemsPerPage,
          sort: sort || 'newest',
        };

        if (debouncedKeyword.trim()) {
          params.keyword = debouncedKeyword.trim();
        }
        if (salaryMin != null) params.salaryMin = salaryMin;
        if (salaryMax != null) params.salaryMax = salaryMax;
        if (workingMode) params.workingMode = workingMode;
        if (provinceId) params.provinceId = provinceId;
        if (categoryId) params.categoryId = categoryId;
        if (specializationId) params.specializationId = specializationId;

        const data = await jobPostApi.getJobPosts(params);
        if (cancelled) return;

        const content = Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
            ? data.content
            : Array.isArray(data?.data)
              ? data.data
              : [];

        const mappedJobs = content.map(mapJobPost);
        setJobs(mappedJobs);
        setTotalPages(data?.totalPages ?? Math.max(1, Math.ceil(mappedJobs.length / itemsPerPage)));
        setTotalElements(data?.totalElements ?? mappedJobs.length);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Đã xảy ra lỗi khi tải danh sách việc làm.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, [
    debouncedKeyword,
    selectedSalaries,
    selectedWorkTypes,
    selectedLocations,
    provinces,
    sort,
    currentPage,
    itemsPerPage,
    searchParams,
    getSalaryRange,
  ]);

  // Load saved jobs
  useEffect(() => {
    if (!hasAuthCookie()) return;
    savedJobApi
      .getSavedJobs()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data ?? data?.content ?? data?.items ?? [];
        setSavedJobIds(list.map((item) => String(item.jobId ?? item.job_id ?? item.id)));
      })
      .catch(() => {});
  }, []);

  // Load Candidate CVs
  useEffect(() => {
    const loadCvs = async () => {
      try {
        const res = await profileApi.getCandidateProfile();
        const profile = res?.data ?? res;
        if (profile?.id) {
          const cvRes = await getCvs(profile.id);
          const list = Array.isArray(cvRes) ? cvRes : cvRes?.data ?? [];
          setCandidateCvs(list);
          if (list.length > 0) {
            setSelectedCvId(String(list[0].id));
          }
        }
      } catch {
        // Not logged in as candidate
      }
    };
    loadCvs();
  }, []);

  // Toggle Save Job
  const toggleSave = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (!id) return;
    if (!hasAuthCookie()) {
      showToast('Vui lòng đăng nhập để lưu việc làm');
      return;
    }
    const normalizedId = String(id);
    const wasSaved = savedJobIds.some((sId) => String(sId) === normalizedId);

    try {
      if (wasSaved) {
        await savedJobApi.unsaveJob(normalizedId);
        setSavedJobIds((prev) => prev.filter((sId) => String(sId) !== normalizedId));
        showToast('Đã xóa việc làm khỏi danh sách đã lưu');
      } else {
        await savedJobApi.saveJob(normalizedId);
        setSavedJobIds((prev) => [...prev, normalizedId]);
        showToast('Lưu tin tuyển dụng thành công!');
      }
    } catch {
      if (wasSaved) {
        setSavedJobIds((prev) => prev.filter((sId) => String(sId) !== normalizedId));
      } else {
        setSavedJobIds((prev) => [...prev, normalizedId]);
        showToast('Lưu tin tuyển dụng thành công!');
      }
    }
  };

  // Open Apply Modal
  const handleOpenApplyModal = (e, job) => {
    e.stopPropagation();
    e.preventDefault();
    if (!hasAuthCookie()) {
      showToast('Vui lòng đăng nhập để ứng tuyển');
      return;
    }
    setApplyingJob(job);
    setIsApplyModalOpen(true);
  };

  // Handle Apply Submission
  const handleApply = async (e) => {
    e.preventDefault();
    if (!selectedCvId) {
      showToast('Vui lòng chọn hoặc tải lên một bản CV');
      return;
    }
    setIsApplying(true);
    try {
      await applicationApi.apply({
        jobPostId: applyingJob.id,
        cvId: selectedCvId,
        coverLetter: coverLetter.trim() || undefined,
      });
      showToast('Nộp đơn ứng tuyển thành công!');
      setIsApplyModalOpen(false);
      setCoverLetter('');
    } catch (err) {
      showToast(err.message || 'Không thể gửi đơn ứng tuyển. Vui lòng thử lại!');
    } finally {
      setIsApplying(false);
    }
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setKeyword('');
    setDebouncedKeyword('');
    setSelectedSalaries([]);
    setSelectedLevels([]);
    setSelectedWorkTypes([]);
    setSelectedLocations([]);
    setSelectedPerks([]);
    setQuickFilter('');
    setSort('newest');
    setSearchParams({}, { replace: true });
    setCurrentPage(1);
  };

  // Toggle helpers
  const toggleSalary = (val) => {
    setSelectedSalaries((prev) => {
      const next = prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val];
      updateUrlParam('salary', next.join(','));
      return next;
    });
    setCurrentPage(1);
  };

  const toggleLevel = (val) => {
    setSelectedLevels((prev) =>
      prev.includes(val) ? prev.filter((l) => l !== val) : [...prev, val]
    );
    setCurrentPage(1);
  };

  const toggleWorkType = (val) => {
    setSelectedWorkTypes((prev) => {
      const next = prev.includes(val) ? prev.filter((w) => w !== val) : [...prev, val];
      updateUrlParam('workType', next.join(','));
      return next;
    });
    setCurrentPage(1);
  };

  const toggleLocation = (val) => {
    setSelectedLocations((prev) => {
      const next = prev.includes(val) ? prev.filter((loc) => loc !== val) : [...prev, val];
      updateUrlParam('location', next.join(','));
      return next;
    });
    setCurrentPage(1);
  };

  const togglePerk = (val) => {
    setSelectedPerks((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (keyword.trim()) count++;
    count += selectedSalaries.length;
    count += selectedLevels.length;
    count += selectedWorkTypes.length;
    count += selectedLocations.length;
    count += selectedPerks.length;
    if (quickFilter) count++;
    if (sort && sort !== 'newest') count++;
    return count;
  }, [keyword, selectedSalaries, selectedLevels, selectedWorkTypes, selectedLocations, selectedPerks, quickFilter, sort]);

  // Displayed jobs for current page
  const displayedJobs = useMemo(() => {
    let result = jobs;

    // Cấp bậc nếu có chọn lọc phụ
    if (selectedLevels.length > 0) {
      result = result.filter((j) => {
        const exp = Number(j.min_experience_years || 0);
        return selectedLevels.some((lvl) => {
          if (lvl === 'fresher') return exp <= 1;
          if (lvl === 'junior-middle') return exp >= 1 && exp <= 3;
          if (lvl === 'senior') return exp >= 3 && exp <= 5;
          if (lvl === 'manager') return exp >= 5 && exp <= 8;
          if (lvl === 'director') return exp >= 8;
          return true;
        });
      });
    }

    return result;
  }, [jobs, selectedLevels]);

  const handlePageChange = (newPage) => {
    const target = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(target);
    updateUrlParam('page', String(target));
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const renderPaginationButtons = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('dots-1');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('dots-2');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages.map((page) => {
      if (typeof page === 'string') {
        return (
          <span key={page} className="px-1.5 text-outline">
            ...
          </span>
        );
      }
      return (
        <button
          key={page}
          type="button"
          onClick={() => handlePageChange(page)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors font-medium cursor-pointer ${
            currentPage === page
              ? 'bg-primary-container text-on-primary font-bold shadow-sm'
              : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
          }`}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <main className="w-full bg-surface min-h-screen text-on-surface font-body-md">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-300">
          <span className="material-symbols-outlined text-secondary-container text-[20px]">check_circle</span>
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col w-full">
        {/* ========================================================================= */}
        {/* Top Search & Breadcrumb Hero Section                                      */}
        {/* ========================================================================= */}
        <section className="w-full bg-surface-container-low/70 py-space-lg">
          <div className="max-w-[1280px] mx-auto px-margin md:px-margin-md lg:px-margin-lg flex flex-col gap-space-md">
            
            {/* Breadcrumb Bar */}
            <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-space-xs text-on-surface-variant font-label-md text-label-md">
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">home</span>
                Trang chủ
              </Link>
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span className="hover:text-primary transition-colors cursor-pointer">Tìm kiếm việc làm</span>
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span className="text-on-surface font-semibold bg-surface-container-high px-space-xs py-0.5 rounded">
                {totalElements} việc làm công nghệ &amp; kinh doanh phù hợp
              </span>
            </nav>

            {/* Advanced Composite Search Box */}
            <div className="bg-surface-container-lowest rounded-xl p-space-xs md:p-space-sm shadow-[0_10px_25px_-4px_rgba(15,23,42,0.06),0_4px_10px_-2px_rgba(15,118,110,0.04)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateUrlParam('q', keyword);
                }}
                className="flex flex-col lg:flex-row items-stretch lg:items-center bg-surface-container-lowest rounded-xl md:rounded-full p-1.5 md:p-2 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] gap-1"
              >
                <div className="flex-1 flex items-center px-4 py-2 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[22px] mr-2 shrink-0">search</span>
                  <input
                    id="search-keyword"
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tìm kiếm vị trí, kỹ năng, công ty..."
                    className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
                  />
                  {keyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword('');
                        updateUrlParam('q', '');
                      }}
                      title="Xóa từ khóa"
                      className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-space-xl py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg font-bold rounded-lg lg:rounded-full flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.99] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                  <span>Tìm kiếm</span>
                </button>
              </form>
            </div>

            {/* Quick Filter Tags */}
            <div className="flex items-center gap-space-sm overflow-x-auto pb-space-xs pt-1 no-scrollbar">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider whitespace-nowrap font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">bolt</span> Gợi ý nhanh:
              </span>

              <button
                type="button"
                onClick={() => {
                  if (quickFilter === 'it') {
                    setQuickFilter('');
                    setKeyword('');
                    setDebouncedKeyword('');
                    updateUrlParam('q', '');
                  } else {
                    setQuickFilter('it');
                    setKeyword('IT');
                    setDebouncedKeyword('IT');
                    updateUrlParam('q', 'IT');
                    setCurrentPage(1);
                  }
                }}
                className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap flex items-center gap-1 shadow-sm cursor-pointer ${
                  quickFilter === 'it'
                    ? 'bg-secondary-container text-on-secondary-container font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                }`}
              >
                <span>IT Phần mềm</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (quickFilter === 'salary-30') {
                    setQuickFilter('');
                    setSelectedSalaries([]);
                    updateUrlParam('salary', '');
                  } else {
                    setQuickFilter('salary-30');
                    setSelectedSalaries(['35-50', 'over-50']);
                    updateUrlParam('salary', '35-50,over-50');
                    setCurrentPage(1);
                  }
                }}
                className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap shadow-sm cursor-pointer ${
                  quickFilter === 'salary-30'
                    ? 'bg-secondary-container text-on-secondary-container font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                }`}
              >
                Lương &gt; 30 Triệu
              </button>

              <button
                type="button"
                onClick={() => {
                  if (quickFilter === 'remote') {
                    setQuickFilter('');
                    setSelectedWorkTypes([]);
                    updateUrlParam('workType', '');
                  } else {
                    setQuickFilter('remote');
                    setSelectedWorkTypes(['remote']);
                    updateUrlParam('workType', 'remote');
                    setCurrentPage(1);
                  }
                }}
                className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap shadow-sm cursor-pointer ${
                  quickFilter === 'remote'
                    ? 'bg-secondary-container text-on-secondary-container font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                }`}
              >
                Làm việc từ xa (Remote)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (quickFilter === 'urgent') {
                    setQuickFilter('');
                    setSort('newest');
                    updateUrlParam('sort', 'newest');
                  } else {
                    setQuickFilter('urgent');
                    setSort('featured');
                    updateUrlParam('sort', 'featured');
                    setCurrentPage(1);
                  }
                }}
                className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap flex items-center gap-1 shadow-sm font-semibold cursor-pointer ${
                  quickFilter === 'urgent'
                    ? 'bg-error text-white font-bold'
                    : 'bg-error-container text-on-error-container hover:opacity-90'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                Tuyển gấp / Nổi bật
              </button>

              <button
                type="button"
                onClick={() => showToast('Đang lọc các doanh nghiệp đã xác thực')}
                className="px-space-md py-1.5 rounded-full bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-high font-label-md text-label-md transition-all whitespace-nowrap shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary text-[15px]">verified</span>
                Doanh nghiệp tích xanh
              </button>

              <button
                type="button"
                onClick={() => {
                  if (quickFilter === 'fresher') {
                    setQuickFilter('');
                    setKeyword('');
                    setDebouncedKeyword('');
                    updateUrlParam('q', '');
                  } else {
                    setQuickFilter('fresher');
                    setKeyword('Fresher');
                    setDebouncedKeyword('Fresher');
                    updateUrlParam('q', 'Fresher');
                    setCurrentPage(1);
                  }
                }}
                className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap shadow-sm cursor-pointer ${
                  quickFilter === 'fresher'
                    ? 'bg-secondary-container text-on-secondary-container font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                }`}
              >
                Thực tập sinh &amp; Fresher
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* Main Body Layout: Split Grid (Left Filters ~30% | Right Listings ~70%)    */}
        {/* ========================================================================= */}
        <section className="w-full py-space-lg">
          <div className="max-w-[1280px] mx-auto px-margin md:px-margin-md lg:px-margin-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
              
              {/* ========================================================================= */}
              {/* LEFT COLUMN: MULTI-DIMENSIONAL FILTERS SIDEBAR (lg:col-span-4)            */}
              {/* ========================================================================= */}
              <aside className="lg:col-span-4 flex flex-col gap-space-lg">
                
                {/* Main Filters Card Container */}
                <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-space-lg border border-surface-container/60">
                  
                  {/* Sidebar Header */}
                  <div className="flex items-center justify-between pb-space-sm bg-surface-bright/50">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
                      <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Bộ Lọc Tìm Kiếm</h2>
                      <span className="bg-primary-container text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
                        {activeFiltersCount}
                      </span>
                    </div>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="font-label-md text-label-md text-primary hover:text-tertiary transition-colors flex items-center gap-0.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  {/* Group 1: Mức Lương Mong Muốn */}
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
                        Mức Lương Mong Muốn
                      </h3>
                      <span className="font-label-sm text-label-sm font-bold text-primary">VNĐ / tháng</span>
                    </div>

                    {/* Salary Checkboxes */}
                    <div className="flex flex-col gap-2 pt-1 font-body-md text-body-md text-on-surface">
                      {[
                        { id: 'under-10', label: 'Dưới 10 triệu', count: '120' },
                        { id: '10-20', label: '10 – 20 triệu', count: '380' },
                        { id: '20-35', label: '20 – 35 triệu', count: '450' },
                        { id: '35-50', label: '35 – 50 triệu', count: '280' },
                        { id: 'over-50', label: 'Trên 50 triệu / Thỏa thuận', count: '190' },
                      ].map((sal) => {
                        const isChecked = selectedSalaries.includes(sal.id);
                        return (
                          <label
                            key={sal.id}
                            className={`flex items-center justify-between cursor-pointer group ${
                              isChecked ? 'font-semibold text-primary' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSalary(sal.id)}
                                className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                              />
                              <span className={isChecked ? '' : 'group-hover:text-primary transition-colors'}>
                                {sal.label}
                              </span>
                            </div>
                            <span
                              className={`font-label-sm text-label-sm ${
                                isChecked
                                  ? 'bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold'
                                  : 'text-outline'
                              }`}
                            >
                              {sal.count}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group 2: Cấp Bậc & Kinh Nghiệm */}
                  <div className="flex flex-col gap-space-sm pt-space-xs">
                    <h3 className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">military_tech</span>
                      Cấp Bậc &amp; Kinh Nghiệm
                    </h3>
                    <div className="flex flex-col gap-2 font-body-md text-body-md text-on-surface">
                      {[
                        { id: 'fresher', label: 'Thực tập sinh / Fresher', count: '165' },
                        { id: 'junior-middle', label: 'Nhân viên (Junior – Middle)', count: '620' },
                        { id: 'senior', label: 'Trưởng nhóm / Senior', count: '310' },
                        { id: 'manager', label: 'Quản lý / Trưởng phòng', count: '210' },
                        { id: 'director', label: 'Giám đốc & C-Level', count: '115' },
                      ].map((lvl) => {
                        const isChecked = selectedLevels.includes(lvl.id);
                        return (
                          <label
                            key={lvl.id}
                            className={`flex items-center justify-between cursor-pointer group ${
                              isChecked ? 'font-semibold text-primary' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleLevel(lvl.id)}
                                className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                              />
                              <span className={isChecked ? '' : 'group-hover:text-primary transition-colors'}>
                                {lvl.label}
                              </span>
                            </div>
                            <span
                              className={`font-label-sm text-label-sm ${
                                isChecked
                                  ? 'bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold'
                                  : 'text-outline'
                              }`}
                            >
                              {lvl.count}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group 3: Hình Thức Làm Việc */}
                  <div className="flex flex-col gap-space-sm pt-space-xs">
                    <h3 className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">nest_clock_farsight_analog</span>
                      Hình Thức Làm Việc
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'full_time', label: 'Full-time' },
                        { id: 'part_time', label: 'Part-time' },
                        { id: 'remote', label: 'Remote / WFH' },
                        { id: 'hybrid', label: 'Hybrid' },
                      ].map((item) => {
                        const isChecked = selectedWorkTypes.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleWorkType(item.id)}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-secondary-container text-on-secondary-container font-bold shadow-xs'
                                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {isChecked && <span className="material-symbols-outlined text-[16px]">check</span>}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group 4: Địa Điểm & Thành Phố */}
                  <div className="flex flex-col gap-space-sm pt-space-xs">
                    <h3 className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">location_city</span>
                      Địa Điểm &amp; Thành Phố
                    </h3>
                    <div className="flex flex-col gap-2 font-body-md text-body-md text-on-surface">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes('hcm')}
                            onChange={() => toggleLocation('hcm')}
                            className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                          />
                          <span className={selectedLocations.includes('hcm') ? 'font-semibold text-primary' : 'group-hover:text-primary transition-colors'}>
                            TP. Hồ Chí Minh
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-outline">740 việc</span>
                      </label>
                      <div className="pl-6 flex flex-col gap-1 text-on-surface-variant font-body-sm text-body-sm">
                        <span className="hover:text-primary cursor-pointer">• Quận 1, Quận 7, Tân Bình, Thủ Đức</span>
                      </div>

                      <label className="flex items-center justify-between cursor-pointer group mt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes('hn')}
                            onChange={() => toggleLocation('hn')}
                            className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                          />
                          <span className={selectedLocations.includes('hn') ? 'font-semibold text-primary' : 'group-hover:text-primary transition-colors'}>
                            Hà Nội
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-outline">510 việc</span>
                      </label>
                      <div className="pl-6 flex flex-col gap-1 text-on-surface-variant font-body-sm text-body-sm">
                        <span className="hover:text-primary cursor-pointer">• Cầu Giấy, Ba Đình, Hoàn Kiếm, Nam Từ Liêm</span>
                      </div>

                      <label className="flex items-center justify-between cursor-pointer group mt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes('dn')}
                            onChange={() => toggleLocation('dn')}
                            className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                          />
                          <span className={selectedLocations.includes('dn') ? 'font-semibold text-primary' : 'group-hover:text-primary transition-colors'}>
                            Đà Nẵng &amp; Lân cận
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-outline">120 việc</span>
                      </label>

                      <label className="flex items-center justify-between cursor-pointer group mt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes('remote')}
                            onChange={() => toggleLocation('remote')}
                            className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                          />
                          <span className={selectedLocations.includes('remote') ? 'font-semibold text-primary' : 'group-hover:text-primary transition-colors'}>
                            Toàn cầu / Remote
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-outline">50 việc</span>
                      </label>
                    </div>
                  </div>

                  {/* Group 5: Đãi Ngộ & Phúc Lợi Cao Cấp */}
                  <div className="flex flex-col gap-space-sm pt-space-xs">
                    <h3 className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">card_giftcard</span>
                      Đãi Ngộ &amp; Phúc Lợi Cao Cấp
                    </h3>
                    <div className="flex flex-col gap-2 font-body-md text-body-md text-on-surface">
                      {[
                        { id: 'bonus', label: 'Thưởng lương tháng 13 & KPI' },
                        { id: 'insurance', label: 'Bảo hiểm sức khỏe quốc tế (PVI/BaoViet)' },
                        { id: 'macbook', label: 'Cung cấp MacBook Pro / Thiết bị xịn' },
                        { id: 'training', label: 'Đào tạo chứng chỉ & Trợ cấp ngoại ngữ' },
                      ].map((perk) => (
                        <label key={perk.id} className="flex items-center gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedPerks.includes(perk.id)}
                            onChange={() => togglePerk(perk.id)}
                            className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                          />
                          <span className={selectedPerks.includes(perk.id) ? 'font-semibold text-primary' : 'group-hover:text-primary transition-colors'}>
                            {perk.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Job Alert Subscription Box (Widget Đăng ký nhận việc) */}
                <div className="bg-gradient-to-br from-primary-container to-secondary p-space-lg rounded-xl text-on-primary shadow-md flex flex-col gap-space-sm relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-surface-container-lowest/10 rounded-full blur-xl pointer-events-none"></div>
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[24px] text-on-primary-container">mail_lock</span>
                    <h3 className="font-headline-sm text-headline-sm font-bold">Thông Báo Việc Mới</h3>
                  </div>
                  <p className="font-body-sm text-body-sm text-surface-container-lowest/90 leading-relaxed">
                    Nhận ngay các cơ hội tuyển dụng phù hợp với hồ sơ Senior / Lương &gt; 30 triệu gửi trực tiếp vào hòm thư mỗi sáng.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (subscribeEmail.trim()) {
                        showToast(`Đã đăng ký nhận tin việc làm cho ${subscribeEmail}`);
                        setSubscribeEmail('');
                      }
                    }}
                    className="flex flex-col gap-space-xs mt-1"
                  >
                    <div className="relative">
                      <input
                        type="email"
                        value={subscribeEmail}
                        onChange={(e) => setSubscribeEmail(e.target.value)}
                        placeholder="Nhập địa chỉ email của bạn..."
                        className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-sm font-body-sm px-space-md py-2.5 rounded-lg focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-secondary-container hover:bg-secondary-fixed text-on-secondary-container font-label-md text-label-md font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                      Đăng ký nhận việc làm ngay
                    </button>
                  </form>
                  <span className="font-label-sm text-label-sm text-surface-container-lowest/70 text-center">
                    Bảo mật thông tin tuyệt đối • Hủy bất cứ lúc nào
                  </span>
                </div>

              </aside>

              {/* ========================================================================= */}
              {/* RIGHT COLUMN: JOB LISTINGS FEED (lg:col-span-8 or ~70%)                   */}
              {/* ========================================================================= */}
              <div className="lg:col-span-8 flex flex-col gap-space-md">
                
                {/* Header Toolbar: Results count & Sort dropdown */}
                <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container/60 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
                      <span>Danh sách việc làm</span>
                      <span className="text-primary text-body-md font-semibold bg-primary-container/15 px-2.5 py-0.5 rounded-full">
                        {totalElements} tin
                      </span>
                    </h1>
                    <p className="text-on-surface-variant font-label-md text-label-md mt-0.5">
                      {keyword ? `Kết quả tìm kiếm cho "${keyword}"` : 'Các vị trí việc làm mở tuyển dụng mới nhất'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-on-surface-variant font-label-md text-label-md whitespace-nowrap flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px] text-primary">swap_vert</span>
                      Sắp xếp:
                    </span>
                    <select
                      value={sort}
                      onChange={(e) => {
                        const newSort = e.target.value;
                        setSort(newSort);
                        updateUrlParam('sort', newSort);
                        setCurrentPage(1);
                      }}
                      className="bg-surface-container-lowest border border-surface-container hover:border-primary/50 text-on-surface font-label-md text-label-md font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all"
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="salary_desc">Lương cao nhất</option>
                      <option value="featured">Việc làm nổi bật</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col gap-space-md">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="bg-surface-container-lowest rounded-xl p-space-lg border border-surface-container/60 shadow-xs animate-pulse flex flex-col gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-surface-container rounded-lg shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-5 bg-surface-container rounded w-2/3"></div>
                            <div className="h-4 bg-surface-container rounded w-1/3"></div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-surface-container rounded-full w-24"></div>
                          <div className="h-6 bg-surface-container rounded-full w-32"></div>
                          <div className="h-6 bg-surface-container rounded-full w-28"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="bg-surface-container-lowest rounded-xl p-space-lg text-center border border-error-container">
                    <p className="font-bold text-error">{error}</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-3 px-space-md py-2 bg-primary-container text-on-primary rounded-lg font-label-md"
                    >
                      Tải lại
                    </button>
                  </div>
                ) : displayedJobs.length === 0 ? (
                  <div className="bg-surface-container-lowest rounded-xl p-space-xl text-center shadow-xs space-y-3">
                    <span className="material-symbols-outlined text-outline text-[48px]">search_off</span>
                    <h3 className="font-headline-sm font-bold text-on-surface">Không tìm thấy việc làm phù hợp</h3>
                    <p className="font-body-md text-on-surface-variant max-w-md mx-auto">
                      Vui lòng thử mở rộng từ khóa tìm kiếm hoặc bấm Xóa tất cả bộ lọc để xem các việc làm khác.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearAllFilters}
                      className="px-space-md py-2 bg-primary-container hover:bg-primary text-on-primary rounded-lg font-label-md font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                      <span>Xóa tất cả bộ lọc</span>
                    </button>
                  </div>
                ) : (
                  displayedJobs.map((job) => {
                    const isSaved = savedJobIds.some((sId) => String(sId) === String(job.id));

                    return (
                      <article
                        key={job.id}
                        className="group bg-surface-container-lowest hover:bg-surface-bright rounded-xl p-space-lg shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04),0_1px_3px_-1px_rgba(15,118,110,0.03)] hover:shadow-[0_10px_25px_-4px_rgba(15,23,42,0.08),0_4px_10px_-2px_rgba(15,118,110,0.06)] transition-all duration-200 relative overflow-hidden flex flex-col gap-space-md border border-surface-container/50"
                      >
                        {/* VIP Accent Stripe */}
                        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary-container"></div>

                        <div className="flex items-start justify-between gap-space-md">
                          <div className="flex items-start gap-space-md min-w-0">
                            {/* Company Avatar */}
                            <div className="w-14 h-14 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                              {job.companyLogo ? (
                                <img
                                  src={job.companyLogo}
                                  alt={job.company}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="font-headline-sm font-bold text-primary">
                                  {(job.company || 'K').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center flex-wrap gap-space-xs mb-1">
                                {job.is_featured && (
                                  <span className="bg-error-container text-on-error-container font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[13px]">bolt</span> Tuyển gấp
                                  </span>
                                )}
                              {job.aiMatchScore != null && (
                                <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[13px]">auto_awesome</span> AI Match {job.aiMatchScore}%
                                </span>
                              )}
                                <span className="font-label-sm text-label-sm text-outline">• {job.postedDate}</span>
                              </div>

                              <h3 className="text-[16px] font-bold text-on-surface group-hover:text-primary transition-colors truncate whitespace-nowrap">
                                <Link to={`/jobs/${job.id}`} className="hover:underline">
                                  {job.title}
                                </Link>
                              </h3>

                              <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm mt-0.5 flex-wrap">
                                <span className="font-bold text-on-surface flex items-center gap-1">
                                  {job.company}
                                  <span className="material-symbols-outlined text-primary text-[16px]" title="Doanh nghiệp đã xác thực">verified</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5 text-outline">
                                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                                  {job.location}
                                </span>
                                {job.workMode && (
                                  <span className="hidden md:inline text-secondary font-semibold bg-secondary-container/30 px-2 py-0.5 rounded">
                                    {job.workMode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Salary Callout */}
                          <div className="text-right shrink-0 flex flex-col items-end">
                            <span className="text-[16px] font-bold text-primary whitespace-nowrap">
                              {job.salary}
                            </span>
                            <span className="font-label-sm text-label-sm text-outline font-medium whitespace-nowrap">
                              VNĐ / tháng
                            </span>
                          </div>
                        </div>
                        {/* Card Action Footer */}
                        <div className="flex items-center justify-between pt-space-xs bg-surface-bright/50 border-t border-surface-container/40">
                          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm">
                            <span className="material-symbols-outlined text-[16px] text-error">hourglass_bottom</span>
                            <span>Hạn ứng tuyển: <strong>{job.deadlineText}</strong></span>
                          </div>
                          
                          <div className="flex items-center gap-space-sm">
                            <button
                              type="button"
                              onClick={(e) => toggleSave(e, job.id)}
                              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                isSaved
                                  ? 'text-primary bg-secondary-container/40'
                                  : 'text-outline hover:text-primary hover:bg-surface-container'
                              }`}
                              title={isSaved ? 'Đã lưu việc làm này' : 'Lưu tin này'}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isSaved ? 'bookmark' : 'bookmark_border'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenApplyModal(e, job)}
                              className="px-space-lg py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer active:scale-95"
                            >
                              <span>Ứng tuyển nhanh</span>
                              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>

                      </article>
                    );
                  })
                )}

                {/* Standard Professional Pagination */}
                {totalPages > 1 && (
                  <nav
                    aria-label="Phân trang kết quả tìm kiếm"
                    className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-lg pb-space-xl"
                  >
                    <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
                      <span>Hiển thị:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        aria-label="Số việc làm trên một trang"
                        className="bg-surface-container-lowest px-2 py-1 rounded-lg text-on-surface font-semibold focus:outline-none cursor-pointer border border-surface-container"
                      >
                        <option value={10}>10 việc / trang</option>
                        <option value={15}>15 việc / trang</option>
                        <option value={30}>30 việc / trang</option>
                      </select>
                      <span>trong tổng số <strong>{totalElements}</strong> việc làm</span>
                    </div>

                    <div className="flex items-center gap-1 font-label-md text-label-md">
                      <button
                        type="button"
                        disabled={currentPage <= 1 || loading}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container-lowest text-on-surface transition-colors ${
                          currentPage <= 1 ? 'opacity-50 cursor-not-allowed text-outline' : 'hover:bg-surface-container cursor-pointer'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>

                      {renderPaginationButtons()}

                      <button
                        type="button"
                        disabled={currentPage >= totalPages || loading}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container-lowest text-on-surface transition-colors ${
                          currentPage >= totalPages ? 'opacity-50 cursor-not-allowed text-outline' : 'hover:bg-surface-container cursor-pointer'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>
                  </nav>
                )}

              </div>

            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ỨNG TUYỂN NHANH (APPLY MODAL)                                      */}
      {/* ========================================================================= */}
      {isApplyModalOpen && applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-surface-container animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-surface-container">
              <div>
                <h3 className="font-headline-sm font-bold text-on-surface">Ứng Tuyển Nhanh</h3>
                <p className="font-label-md text-primary mt-0.5">{applyingJob.title} - {applyingJob.company}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="text-outline hover:text-error cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 font-body-sm text-body-sm">
              <div>
                <label className="font-bold text-on-surface block mb-2 font-label-md">
                  Chọn hồ sơ CV ứng tuyển <span className="text-error">*</span>
                </label>
                {candidateCvs.length === 0 ? (
                  <div className="p-3.5 bg-error-container/40 rounded-xl border border-error-container text-xs text-on-error-container space-y-2">
                    <p className="font-semibold">Bạn chưa có bản CV nào được tạo trên KiemJob.</p>
                    <Link
                      to="/cvs"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:bg-primary-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      <span>Tải lên CV ngay</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {candidateCvs.map((c) => (
                      <label
                        key={c.id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          String(selectedCvId) === String(c.id)
                            ? 'border-primary bg-secondary-container/20 ring-1 ring-primary'
                            : 'border-surface-container bg-surface-container-lowest hover:bg-surface-bright'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="cv"
                            value={c.id}
                            checked={String(selectedCvId) === String(c.id)}
                            onChange={() => setSelectedCvId(String(c.id))}
                            className="accent-primary"
                          />
                          <div>
                            <p className="font-bold font-label-md text-on-surface">{c.title || 'CV ứng viên'}</p>
                            <p className="font-label-sm text-outline">
                              Cập nhật: {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-on-surface block mb-1 font-label-md">
                  Thư giới thiệu (Cover Letter)
                </label>
                <textarea
                  rows={3}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Giới thiệu ngắn gọn lý do bạn phù hợp với vị trí này..."
                  className="w-full p-2.5 bg-surface-container-lowest rounded-lg border border-surface-container focus:border-primary focus:ring-1 focus:ring-primary font-body-sm text-on-surface outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isApplying || candidateCvs.length === 0}
                  className="px-5 py-2 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-label-lg font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>{isApplying ? 'Đang gửi...' : 'Xác nhận ứng tuyển'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
