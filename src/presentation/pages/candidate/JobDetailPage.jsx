import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  WORKING_METHODS,
  WORK_MODES,
  EXPERIENCE_LEVELS,
  JOB_STATUSES,
} from '../../../domain/constants';
import { jobPostApi } from '../../../infrastructure/api/jobPostApi';
import authApi from '../../../infrastructure/api/authApi';
import { profileApi } from '../../../infrastructure/api/profileApi';
import { getCvs } from '../../../infrastructure/api/cvApi';
import { applicationApi } from '../../../infrastructure/api/appicationApi';
import { savedJobApi } from '../../../infrastructure/api/savedJobApi';
import { hasAuthCookie } from '../../../infrastructure/utils/cookieUtils';

// Helper: ánh xạ icon cho từng danh mục nghề nghiệp
const getCategoryIcon = (categoryName) => {
  if (!categoryName) return 'work';
  const lower = categoryName.toLowerCase();
  if (lower.includes('cntt') || lower.includes('phần mềm') || lower.includes('it') || lower.includes('công nghệ') || lower.includes('tech')) {
    return 'terminal';
  }
  if (lower.includes('marketing') || lower.includes('truyền thông') || lower.includes('quảng cáo') || lower.includes('seo')) {
    return 'campaign';
  }
  if (lower.includes('tài chính') || lower.includes('ngân hàng') || lower.includes('kế toán') || lower.includes('kiểm toán')) {
    return 'payments';
  }
  if (lower.includes('kinh doanh') || lower.includes('bán hàng') || lower.includes('sales') || lower.includes('thương mại')) {
    return 'storefront';
  }
  if (lower.includes('thiết kế') || lower.includes('đồ họa') || lower.includes('ui/ux') || lower.includes('design')) {
    return 'palette';
  }
  if (lower.includes('nhân sự') || lower.includes('hành chính') || lower.includes('hr')) {
    return 'badge';
  }
  if (lower.includes('ai') || lower.includes('dữ liệu') || lower.includes('data') || lower.includes('trí tuệ')) {
    return 'smart_toy';
  }
  if (lower.includes('logistics') || lower.includes('vận tải') || lower.includes('kho') || lower.includes('chuỗi cung ứng')) {
    return 'local_shipping';
  }
  if (lower.includes('giáo dục') || lower.includes('đào tạo') || lower.includes('giảng viên')) {
    return 'school';
  }
  if (lower.includes('y tế') || lower.includes('dược') || lower.includes('bác sĩ')) {
    return 'medical_services';
  }
  return 'work';
};

// Helper: chuẩn hóa tin tuyển dụng dùng cho danh sách việc làm tương tự
const mapSimilarJob = (item) => {
  const companyName =
    typeof item.company === 'object'
      ? item.company?.name
      : item.companyName || item.company;

  const salaryMin = item.salaryMin ?? item.salary_min;
  const salaryMax = item.salaryMax ?? item.salary_max;

  const formatSalary = (val) =>
    val == null ? null : Number(val).toLocaleString('vi-VN');

  const salaryDisplay =
    salaryMin != null || salaryMax != null
      ? `${formatSalary(salaryMin) ?? 'Thỏa thuận'} - ${formatSalary(salaryMax) ?? 'Thỏa thuận'}`
      : 'Thỏa thuận';

  const workingMethod =
    item.workingMode ?? item.working_method ?? item.working_mode;
  const workingIn = item.workingIn ?? item.working_in ?? [];

  const categoryId =
    item.categoryId ?? item.category_id ?? item.category?.id ?? null;
  const categoryName =
    item.categoryName ?? item.category_name ?? item.category?.name ?? null;

  return {
    ...item,
    id: String(item.id),
    title: item.title ?? 'Chưa có tiêu đề',
    company: companyName || 'Chưa cập nhật công ty',
    companyLogo:
      item.companyLogo ??
      item.companyLogoUrl ??
      item.company_logo_url ??
      item.logoUrl ??
      item.logo_url ??
      (typeof item.company === 'object'
        ? item.company?.logoUrl ?? item.company?.logo_url
        : null) ??
      null,
    categoryId: categoryId != null ? String(categoryId) : null,
    categoryName: categoryName || null,
    salary: salaryDisplay,
    salaryDisplay,
    salary_min: salaryMin,
    salary_max: salaryMax,
    working_method: workingMethod,
    working_in: Array.isArray(workingIn) ? workingIn : [workingIn],
    workMode: Array.isArray(workingIn)
      ? workingIn.join(', ') || 'Chưa cập nhật'
      : workingIn || 'Chưa cập nhật',
    vacancies: item.vacancies ?? 1,
    postedDate: item.postedAt
      ? new Date(item.postedAt).toLocaleDateString('vi-VN')
      : 'Gần đây',
    is_featured: item.isFeatured ?? item.is_featured ?? false,
    location:
      item.location ||
      item.provinceName ||
      item.province_name ||
      'Toàn quốc',
  };
};

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [jobDetails, setJobDetails] = useState([]);
  const [jobSkills, setJobSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyAddresses, setCompanyAddresses] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);

  // Lưu tin & theo dõi công ty
  const [isSaved, setIsSaved] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [isFollowingCompany, setIsFollowingCompany] = useState(false);

  // Việc làm tương tự
  const [similarJobs, setSimilarJobs] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Modal ứng tuyển CV
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [candidateCvs, setCandidateCvs] = useState([]);
  const [isLoadingCvs, setIsLoadingCvs] = useState(false);
  const [cvLoadError, setCvLoadError] = useState('');
  const [selectedCvId, setSelectedCvId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Modal báo cáo vi phạm
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Thông tin tuyển dụng sai sự thật / Đăng ảo');
  const [reportNote, setReportNote] = useState('');

  // Toast thông báo
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const unwrap = (response) => {
    const body = response?.data ?? response;
    return body?.data ?? body;
  };

  // Tải danh sách CV của ứng viên đang đăng nhập
  const loadCandidateCvs = async () => {
    setIsLoadingCvs(true);
    setCvLoadError('');

    try {
      const profileResponse = await profileApi.getCandidateProfile();
      const profileData = unwrap(profileResponse);

      const candidate =
        profileData?.candidate ??
        profileData?.profile ??
        profileData;

      const candidateId =
        candidate?.candidateId ??
        candidate?.candidate_id ??
        candidate?.id;

      if (!candidateId) {
        throw new Error('Không xác định được ID ứng viên. Vui lòng kiểm tra hồ sơ của bạn.');
      }

      const cvsResponse = await getCvs(candidateId);
      const cvsData = unwrap(cvsResponse);

      const cvs = Array.isArray(cvsData)
        ? cvsData
        : Array.isArray(cvsData?.content)
          ? cvsData.content
          : Array.isArray(cvsData?.cvs)
            ? cvsData.cvs
            : [];

      setCandidateCvs(cvs);
      setSelectedCvId(cvs.length > 0 ? String(cvs[0].id) : '');

      if (cvs.length === 0) {
        setCvLoadError('Tài khoản chưa có CV nào trên hệ thống KiemJob.');
      }
    } catch (err) {
      console.error('Lỗi tải CV ứng viên:', err);
      setCandidateCvs([]);
      setSelectedCvId('');
      setCvLoadError(
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải danh sách CV. Vui lòng đăng nhập với tài khoản ứng viên.'
      );
    } finally {
      setIsLoadingCvs(false);
    }
  };

  // Tải danh sách ID việc đã lưu để hiển thị trạng thái bookmark đồng bộ
  useEffect(() => {
    if (!hasAuthCookie()) return;
    savedJobApi
      .getSavedJobs()
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.content)
              ? data.content
              : [];
        setSavedJobIds(list.map((item) => String(item.jobId ?? item.job_id ?? item.id)));
      })
      .catch(() => {});
  }, []);

  // Tải thông tin công ty và địa chỉ khi có companyId
  useEffect(() => {
    const companyId = job?.companyId ?? job?.company_id;
    if (!companyId) return;

    const loadCompanyInfo = async () => {
      try {
        const [addressRes, companyRes] = await Promise.all([
          authApi.getCompanyAddresses(companyId),
          authApi.getCompanyById(companyId),
        ]);

        const addressesData = unwrap(addressRes);
        const companyData = unwrap(companyRes);

        const addresses = Array.isArray(addressesData) ? addressesData : [];
        const company = companyData ?? null;

        setCompanyAddresses(addresses);
        setCompanyInfo(company);

        const logo =
          company?.logoUrl ??
          company?.logo_url ??
          company?.logo ??
          '';

        const address = addresses
          .map((item) => {
            const detail = item.addressDetail ?? item.address_detail ?? '';
            const province =
              item.provinceName ??
              item.province_name ??
              item.province?.name ??
              '';
            return [detail, province].filter(Boolean).join(', ');
          })
          .filter(Boolean)
          .join(' • ');

        setJob((prev) =>
          prev
            ? {
                ...prev,
                companyLogo: logo || prev.companyLogo,
                location: address || prev.location,
              }
            : prev
        );
      } catch (err) {
        console.error('Không thể tải thông tin công ty:', err);
      }
    };

    loadCompanyInfo();
  }, [job?.companyId, job?.company_id]);

  // Tải chi tiết tin tuyển dụng
  useEffect(() => {
    if (!id) {
      setError('Không tìm thấy mã tin tuyển dụng.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadJobDetail = async () => {
      setLoading(true);
      setError('');
      setJob(null);
      setJobDetails([]);
      setJobSkills([]);

      try {
        const [jobResponse, detailsResponse, skillsResponse] =
          await Promise.all([
            jobPostApi.getJobPostById(id),
            jobPostApi.getJobDetails(id),
            jobPostApi.getJobSkills(id),
          ]);

        if (cancelled) return;

        const data = unwrap(jobResponse);
        const detailsData = unwrap(detailsResponse);
        const skillsData = unwrap(skillsResponse);

        if (!data || data.id == null) {
          throw new Error('Dữ liệu tin tuyển dụng trả về không hợp lệ.');
        }

        if (data.status && data.status !== 'open') {
          throw new Error('Tin tuyển dụng này hiện chưa được công khai hoặc đang chờ kiểm duyệt.');
        }

        const details = Array.isArray(detailsData) ? detailsData : [];
        const skills = Array.isArray(skillsData) ? skillsData : [];

        const salaryMin = data.salaryMin ?? data.salary_min;
        const salaryMax = data.salaryMax ?? data.salary_max;

        const formatSalary = (value) =>
          value == null
            ? null
            : Number(value).toLocaleString('vi-VN');

        const salaryDisplay =
          salaryMin != null || salaryMax != null
            ? `${formatSalary(salaryMin) ?? 'Thỏa thuận'} - ${formatSalary(salaryMax) ?? 'Thỏa thuận'} VNĐ`
            : 'Thỏa thuận';

        const workingMode =
          data.workingMode ?? data.working_mode ?? '';

        const companyAddress =
          data.companyAddress ??
          data.company_address ??
          data.company?.address ??
          '';

        const provinceName =
          data.provinceName ??
          data.province_name ??
          data.companyAddress?.provinceName ??
          '';

        const normalizedJob = {
          ...data,
          id: String(data.id),
          title: data.title ?? 'Chưa có tiêu đề',
          location:
            data.location ||
            [companyAddress, provinceName].filter(Boolean).join(', ') ||
            'Chưa cập nhật địa điểm',
          addresses: Array.isArray(data.addresses) ? data.addresses : [],
          locations: Array.isArray(data.addresses) ? data.addresses : [],
          company:
            data.companyName ??
            data.company_name ??
            data.company?.name ??
            'Chưa cập nhật công ty',
          companyLogo:
            data.companyLogo ??
            data.companyLogoUrl ??
            data.company_logo_url ??
            '',
          categoryId: data.categoryId ?? data.category_id ?? data.category?.id ?? null,
          categoryName: data.categoryName ?? data.category_name ?? data.category?.name ?? null,
          salary: salaryDisplay,
          salaryDisplay,
          salary_min: salaryMin,
          salary_max: salaryMax,
          working_method: data.workingMethod ?? data.working_method ?? '',
          workingMode,
          work_mode: workingMode,
          workMode: workingMode || 'Toàn thời gian',
          vacancies: data.vacancies ?? 1,
          education_requirement:
            data.educationalRequirement ??
            data.educationRequirement ??
            'Không yêu cầu',
          deadline:
            data.applicationDeadline ??
            data.application_deadline ??
            'Chưa cập nhật',
          application_deadline:
            data.applicationDeadline ??
            data.application_deadline ??
            '',
          status: data.status ?? 'open',
          postedDate: data.postedAt
            ? new Date(data.postedAt).toLocaleDateString('vi-VN')
            : 'Mới đăng',
          is_featured: data.isFeatured ?? data.is_featured ?? false,
          experience_level:
            data.experienceLevel ?? data.experience_level ?? '',
          min_experience_years:
            data.minExperienceYears ?? data.min_experience_years ?? null,
          job_skills: skills,
        };

        setJob(normalizedJob);
        setJobDetails(details);
        setJobSkills(skills);

        if (hasAuthCookie()) {
          try {
            const saved = await savedJobApi.isSaved(data.id);
            if (!cancelled) {
              setIsSaved(Boolean(saved));
            }
          } catch {
            // bỏ qua lỗi kiểm tra đã lưu
          }
        }
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 404) {
          setError('Không tìm thấy tin tuyển dụng này.');
        } else if (status === 401 || status === 403) {
          setError('Bạn không có quyền xem tin tuyển dụng này.');
        } else {
          setError(
            err.response?.data?.message ||
            err.message ||
            'Đã xảy ra lỗi khi tải tin tuyển dụng.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadJobDetail();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Tải danh sách việc làm tương tự ở dưới cùng
  useEffect(() => {
    if (!job?.id) return;
    let cancelled = false;

    const fetchSimilarJobs = async () => {
      setLoadingSimilar(true);
      try {
        const params = { status: 'open' };
        if (job.categoryId) {
          params.categoryId = job.categoryId;
        }
        const res = await jobPostApi.getJobPosts(params);
        if (cancelled) return;

        const body = unwrap(res);
        const list = Array.isArray(body)
          ? body
          : Array.isArray(body?.content)
            ? body.content
            : [];

        const filtered = list
          .filter((item) => String(item.id) !== String(job.id) && item.status === 'open')
          .slice(0, 6)
          .map(mapSimilarJob);

        setSimilarJobs(filtered);
      } catch (err) {
        console.warn('Lỗi tải danh sách việc làm tương tự:', err);
      } finally {
        if (!cancelled) {
          setLoadingSimilar(false);
        }
      }
    };

    fetchSimilarJobs();

    return () => {
      cancelled = true;
    };
  }, [job?.id, job?.categoryId]);

  // Bật/tắt lưu tin hiện tại
  const handleToggleSave = async () => {
    if (!job?.id) return;
    if (!hasAuthCookie()) {
      showToast('Vui lòng đăng nhập để lưu việc làm.');
      return;
    }
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      if (nextSaved) {
        await savedJobApi.saveJob(job.id);
        setSavedJobIds((prev) => [...prev, String(job.id)]);
        showToast('Đã lưu tin tuyển dụng vào mục Việc đã lưu');
      } else {
        await savedJobApi.removeSavedJob(job.id);
        setSavedJobIds((prev) => prev.filter((sId) => sId !== String(job.id)));
        showToast('Đã bỏ lưu tin tuyển dụng');
      }
    } catch (err) {
      setIsSaved(!nextSaved);
      showToast(err?.message || 'Có lỗi xảy ra khi cập nhật lưu việc làm.');
    }
  };

  // Bật/tắt lưu việc làm tương tự
  const handleToggleSimilarSave = async (similarJobId) => {
    if (!hasAuthCookie()) {
      showToast('Vui lòng đăng nhập để lưu việc làm.');
      return;
    }

    const isAlreadySaved = savedJobIds.some((sId) => String(sId) === String(similarJobId));
    try {
      if (isAlreadySaved) {
        await savedJobApi.removeSavedJob(similarJobId);
        setSavedJobIds((prev) => prev.filter((sId) => sId !== String(similarJobId)));
        if (String(job?.id) === String(similarJobId)) setIsSaved(false);
        showToast('Đã bỏ lưu tin tuyển dụng');
      } else {
        await savedJobApi.saveJob(similarJobId);
        setSavedJobIds((prev) => [...prev, String(similarJobId)]);
        if (String(job?.id) === String(similarJobId)) setIsSaved(true);
        showToast('Đã lưu việc làm vào danh sách');
      }
    } catch (err) {
      showToast(err?.message || 'Lỗi khi lưu việc làm.');
    }
  };

  // Chia sẻ tin tuyển dụng
  const handleShareJob = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Đã sao chép liên kết bài đăng tuyển dụng vào bộ nhớ tạm!');
    } else {
      showToast('Đã sao chép liên kết tin tuyển dụng!');
    }
  };

  // Bật/tắt theo dõi công ty
  const handleToggleFollowCompany = () => {
    const next = !isFollowingCompany;
    setIsFollowingCompany(next);
    showToast(next ? `Đã theo dõi ${job?.company}` : `Đã bỏ theo dõi ${job?.company}`);
  };

  // Nộp hồ sơ ứng tuyển
  const handleApply = async (e) => {
    e.preventDefault();
    if (isApplying) return;

    if (!selectedCvId) {
      showToast('Vui lòng chọn một CV để ứng tuyển.');
      return;
    }

    if (!job?.id) {
      showToast('Không xác định được tin tuyển dụng.');
      return;
    }

    setIsApplying(true);
    try {
      await applicationApi.apply(job.id, {
        cvId: Number(selectedCvId),
        coverLatter: coverLetter.trim() || null,
      });

      setIsApplyModalOpen(false);
      setCoverLetter('');
      showToast(`Nộp hồ sơ thành công vào vị trí "${job.title}"!`);
    } catch (err) {
      console.error('Lỗi khi nộp hồ sơ:', err);
      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      if (status === 409) {
        showToast(message || 'Hồ sơ này đã từng được ứng tuyển vào tin tuyển dụng.');
      } else if (status === 401 || status === 403) {
        showToast('Bạn cần đăng nhập tài khoản ứng viên để nộp hồ sơ.');
      } else {
        showToast(message || err?.message || 'Không thể nộp hồ sơ. Vui lòng thử lại.');
      }
    } finally {
      setIsApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf8ff] gap-3">
        <div className="w-10 h-10 border-4 border-[#005c55] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-[#005c55]">
          Đang tải thông tin chi tiết việc làm...
        </p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#faf8ff] px-4">
        <span className="material-symbols-outlined text-5xl text-[#6e7977]">
          work_off
        </span>
        <h2 className="text-xl font-bold text-[#131b2e]">
          Không thể hiển thị tin tuyển dụng
        </h2>
        <p className="text-sm text-[#6e7977] text-center max-w-md">
          {error || 'Tin tuyển dụng không tồn tại hoặc đã hết hạn nhận hồ sơ.'}
        </p>
        <Link
          to="/jobs"
          className="px-6 py-2.5 bg-[#005c55] hover:bg-[#007952] text-white rounded-xl font-bold text-sm shadow-md transition-all"
        >
          Quay lại danh sách việc làm
        </Link>
      </div>
    );
  }

  const mapJobAddress = job.locations?.[0];
  const mapLocation = mapJobAddress
    ? [
        mapJobAddress.addressDetail ?? mapJobAddress.address_detail,
        mapJobAddress.communeName ?? mapJobAddress.commune_name,
        mapJobAddress.provinceName ?? mapJobAddress.province_name,
      ]
        .filter(Boolean)
        .join(', ')
    : job.location;

  return (
    <div className="w-full bg-[#faf8ff] min-h-screen pb-20 font-['Plus_Jakarta_Sans',sans-serif] text-[#131b2e] antialiased">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#131b2e] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#3e4947] animate-bounce-short">
          <span className="material-symbols-outlined text-[#97f5cc] text-[22px]">check_circle</span>
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Top Breadcrumb & Status Ribbon (theo chuẩn giaodiendetail.html) */}
      <section className="w-full bg-[#f2f3ff] py-3.5 border-b border-[#eaedff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-[#3e4947]">
          <nav className="flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-[#005c55] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Trang chủ</span>
            </Link>
            <span className="material-symbols-outlined text-[14px] text-[#bdc9c6]">chevron_right</span>
            <Link to="/jobs" className="hover:text-[#005c55] transition-colors">
              Việc làm
            </Link>
            {job.categoryName && (
              <>
                <span className="material-symbols-outlined text-[14px] text-[#bdc9c6]">chevron_right</span>
                <Link
                  to={`/jobs?category=${job.categoryId || encodeURIComponent(job.categoryName)}`}
                  className="hover:text-[#005c55] transition-colors"
                >
                  {job.categoryName}
                </Link>
              </>
            )}
            <span className="material-symbols-outlined text-[14px] text-[#bdc9c6]">chevron_right</span>
            <span className="text-[#131b2e] font-semibold truncate max-w-xs md:max-w-md">
              {job.title}
            </span>
          </nav>

          <div className="flex items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#97f5cc] text-[#00513a] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006c4e] animate-pulse"></span>
              {job.status === 'open' || !job.status ? 'Đang nhận hồ sơ' : (JOB_STATUSES[job.status] || job.status)}
            </span>
            <span className="text-[#6e7977] font-medium">Mã tin: KJ-{job.id}</span>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* CỘT TRÁI (8 COLS) - CHI TIẾT CÔNG VIỆC */}
          <article className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Job Header Master Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#005c55]/5 blur-2xl pointer-events-none"></div>

              {/* Badges Row */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {job.is_featured && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm">
                      <span className="material-symbols-outlined text-[15px]">bolt</span>
                      Tin Nổi Bật VIP
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#9cf2e8] text-[#00201d] text-xs font-bold">
                    <span className="material-symbols-outlined text-[15px]">verified</span>
                    Tuyển gấp
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eaedff] text-[#3e4947] text-xs font-medium">
                    <span className="material-symbols-outlined text-[15px]">hub</span>
                    {WORK_MODES[job.work_mode] || job.workMode}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eaedff] text-[#3e4947] text-xs font-medium">
                    <span className="material-symbols-outlined text-[15px]">person_check</span>
                    Tuyển {String(job.vacancies || 1).padStart(2, '0')} ứng viên
                  </span>
                </div>

                {/* Job Title */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight leading-tight">
                  {job.title}
                </h1>

                {/* Company Name & Meta Info */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#3e4947] flex-wrap">
                  <span className="text-[#131b2e] font-bold hover:text-[#005c55] cursor-pointer transition-colors">
                    {job.company}
                  </span>
                  <span className="text-[#bdc9c6]">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#005c55]">location_on</span>
                    <span>{job.location}</span>
                  </span>
                  <span className="text-[#bdc9c6]">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#6e7977]">schedule</span>
                    <span>Hạn nộp: <strong className="text-[#131b2e] font-semibold">{job.deadline || job.application_deadline}</strong></span>
                  </span>
                </div>
              </div>

              {/* Key Metrics Highlight Strip (4 Hộp chỉ số trọng tâm) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff]">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider">
                    Mức thu nhập
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-[#005c55] mt-0.5 line-clamp-1" title={job.salaryDisplay}>
                    {job.salaryDisplay || job.salary}
                  </span>
                  <span className="text-[11px] text-[#6e7977] mt-0.5">
                    Thương lượng theo năng lực
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider">
                    Kinh nghiệm
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
                    {job.min_experience_years ? `${job.min_experience_years} Năm` : (EXPERIENCE_LEVELS[job.experience_level] || job.experience_level || 'Không yêu cầu')}
                  </span>
                  <span className="text-[11px] text-[#6e7977] mt-0.5">
                    {EXPERIENCE_LEVELS[job.experience_level] || 'Cấp bậc nhân viên'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider">
                    Hình thức
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
                    {WORKING_METHODS[job.working_method] || job.working_method || 'Toàn thời gian'}
                  </span>
                  <span className="text-[11px] text-[#6e7977] mt-0.5">
                    {job.workMode || 'Làm việc linh hoạt'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider">
                    Số lượng tuyển
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#131b2e] mt-0.5">
                    {String(job.vacancies || 1).padStart(2, '0')} Nhân sự
                  </span>
                  <span className="text-[11px] text-[#006c4e] font-semibold mt-0.5">
                    Ưu tiên gia nhập sớm
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (isLoadingCvs) return;
                      setIsApplyModalOpen(true);
                      loadCandidateCvs();
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#97f5cc]">bolt</span>
                    <span>Ứng tuyển ngay</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSave}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border font-semibold text-sm transition-colors cursor-pointer ${
                      isSaved
                        ? 'bg-[#eaedff] text-[#005c55] border-[#005c55]'
                        : 'bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] border-[#eaedff]'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px] text-[#005c55]"
                      style={isSaved ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {isSaved ? 'bookmark' : 'bookmark_border'}
                    </span>
                    <span>{isSaved ? 'Đã lưu tin' : 'Lưu tin'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleShareJob}
                    className="p-3 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#3e4947] hover:text-[#005c55] border border-[#eaedff] transition-colors flex items-center justify-center cursor-pointer"
                    title="Chia sẻ tin tuyển dụng"
                  >
                    <span className="material-symbols-outlined text-[20px]">share</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-3 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#3e4947] hover:text-[#005c55] border border-[#eaedff] transition-colors flex items-center justify-center cursor-pointer"
                    title="In / Xuất PDF"
                  >
                    <span className="material-symbols-outlined text-[20px]">print</span>
                  </button>

                  <div className="px-3.5 py-2.5 rounded-xl bg-[#97f5cc]/50 text-[#00513a] text-xs font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#006c4e]">verified_user</span>
                    <span>Đã xác minh bởi KiemJob</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Smart Match Box (nếu có đề xuất AI) */}
            {job.aiRecommendation && (
              <div className="bg-gradient-to-r from-[#005c55]/10 via-[#97f5cc]/20 to-[#005c55]/5 p-5 rounded-2xl border border-[#005c55]/20 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#005c55] text-white flex items-center justify-center shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-[22px]">smart_toy</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#005c55]">
                      Độ phù hợp hồ sơ AI: {job.aiRecommendation.match_score}%
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#005c55] text-white font-mono">
                      {job.aiRecommendation.model_version || 'AI Engine'}
                    </span>
                  </div>
                  <p className="text-xs text-[#131b2e] leading-relaxed">
                    {job.aiRecommendation.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Section: Mô tả công việc (Job Purpose & Details) */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-7 rounded-full bg-[#005c55]"></span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#131b2e]">
                  Mô tả công việc
                </h2>
              </div>

              <div className="flex flex-col gap-4 text-sm text-[#3e4947] leading-relaxed">
                {/* Mục tiêu vị trí */}
                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex flex-col gap-2">
                  <span className="text-sm font-bold text-[#005c55] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">target</span>
                    Mục tiêu vị trí (Position Purpose):
                  </span>
                  <p className="text-xs sm:text-sm text-[#3e4947]">
                    Đảm nhiệm vai trò then chốt trong việc kiến tạo, vận hành và tối ưu hóa các sản phẩm, giải pháp công nghệ tại {job.company}. Đồng hành cùng các chuyên gia và lãnh đạo dự án để hoàn thiện các mục tiêu chiến lược và nâng cao chất lượng trải nghiệm của khách hàng.
                  </p>
                </div>

                {/* Danh sách nhiệm vụ chi tiết từ API jobDetails */}
                {jobDetails.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    {jobDetails.map((detail, idx) => (
                      <div key={detail.id || idx} className="space-y-1.5">
                        <h3 className="font-bold text-sm text-[#131b2e] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#005c55]"></span>
                          {detail.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#3e4947] whitespace-pre-line pl-3.5 border-l-2 border-[#eaedff]">
                          {detail.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-[#131b2e]">Nhiệm vụ trọng tâm hàng ngày:</h3>
                    <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-[#3e4947]">
                      <li className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[#005c55] text-[18px] shrink-0 mt-0.5">check_circle</span>
                        <span>Tham gia phân tích yêu cầu nghiệp vụ, thiết kế kiến trúc và triển khai các tính năng cho hệ thống vận hành chất lượng cao.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[#005c55] text-[18px] shrink-0 mt-0.5">check_circle</span>
                        <span>Phối hợp chặt chẽ với các phòng ban liên quan (Product, Design, QA) để đảm bảo tiến độ và chất lượng bàn giao.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[#005c55] text-[18px] shrink-0 mt-0.5">check_circle</span>
                        <span>Nghiên cứu áp dụng các công nghệ mới, tối ưu hiệu năng và tham gia rà soát mã nguồn (code review) định kỳ.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[#005c55] text-[18px] shrink-0 mt-0.5">check_circle</span>
                        <span>Đóng góp các giải pháp sáng tạo nhằm nâng cao hiệu suất làm việc nhóm và trải nghiệm của người dùng cuối.</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* Section: Yêu cầu ứng viên (Requirements) */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-7 rounded-full bg-[#005c55]"></span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#131b2e]">
                  Yêu cầu ứng viên
                </h2>
              </div>

              {/* Kỹ năng bắt buộc */}
              <div className="flex flex-col gap-3">
                <span className="text-xs sm:text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-[18px]">emergency</span>
                  Kỹ năng chuyên môn bắt buộc (Required Skills):
                </span>

                {jobSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {jobSkills.map((skill, idx) => (
                      <span
                        key={skill.id || idx}
                        className="px-3.5 py-1.5 rounded-lg bg-[#9cf2e8]/50 text-[#00201d] font-semibold text-xs border border-[#9cf2e8]"
                      >
                        {skill.skillName ?? skill.skill_name ?? 'Kỹ năng'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-3.5 py-1.5 rounded-lg bg-[#9cf2e8]/50 text-[#00201d] font-semibold text-xs">
                      {job.categoryName || 'Chuyên môn nghiệp vụ'}
                    </span>
                    <span className="px-3.5 py-1.5 rounded-lg bg-[#9cf2e8]/50 text-[#00201d] font-semibold text-xs">
                      Kỹ năng làm việc nhóm
                    </span>
                    <span className="px-3.5 py-1.5 rounded-lg bg-[#9cf2e8]/50 text-[#00201d] font-semibold text-xs">
                      Tư duy phản biện
                    </span>
                  </div>
                )}

                {/* Tiêu chí chi tiết */}
                <ul className="flex flex-col gap-2.5 pt-3 text-xs sm:text-sm text-[#3e4947]">
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#005c55] text-[16px] shrink-0 mt-0.5">fiber_manual_record</span>
                    <span>
                      {job.min_experience_years
                        ? `Tối thiểu ${job.min_experience_years} năm kinh nghiệm thực chiến trong lĩnh vực tương đương.`
                        : `Cấp bậc yêu cầu: ${EXPERIENCE_LEVELS[job.experience_level] || job.experience_level || 'Phù hợp mọi cấp bậc ứng viên'}.`}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#005c55] text-[16px] shrink-0 mt-0.5">fiber_manual_record</span>
                    <span>
                      Trình độ học vấn: <strong>{job.education_requirement || 'Tốt nghiệp Đại học / Cao đẳng chuyên ngành liên quan'}</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#005c55] text-[16px] shrink-0 mt-0.5">fiber_manual_record</span>
                    <span>
                      Kỹ năng giải quyết vấn đề linh hoạt, tinh thần trách nhiệm cao và khả năng chịu được áp lực công việc.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Điểm cộng ưu tiên */}
              <div className="flex flex-col gap-3 pt-2 border-t border-[#eaedff]">
                <span className="text-xs sm:text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#006c4e] text-[18px]">stars</span>
                  Điểm cộng ưu tiên (Nice-to-have):
                </span>
                <ul className="flex flex-col gap-2 text-xs sm:text-sm text-[#3e4947]">
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#006c4e] text-[18px] shrink-0 mt-0.5">add_task</span>
                    <span>Có kinh nghiệm làm việc trong môi trường đa quốc gia hoặc các dự án quy mô lớn.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#006c4e] text-[18px] shrink-0 mt-0.5">add_task</span>
                    <span>Khả năng đọc hiểu tài liệu và giao tiếp tiếng Anh chuyên ngành tốt.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section: Quyền lợi & Đãi ngộ tại công ty */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-7 rounded-full bg-[#005c55]"></span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#131b2e]">
                  Quyền lợi &amp; Đãi ngộ tại {job.company}
                </h2>
              </div>

              {/* Grid 6 quyền lợi tiêu chuẩn */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#97f5cc] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00513a] text-[22px]">payments</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#131b2e]">Thu nhập cạnh tranh</span>
                    <p className="text-xs text-[#3e4947] mt-1">
                      {job.salaryDisplay || 'Mức lương hấp dẫn theo năng lực'}. Lương tháng 13 đảm bảo cùng các khoản thưởng hiệu quả dự án cuối năm.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#97f5cc] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00513a] text-[22px]">trending_up</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#131b2e]">Xét tăng lương định kỳ</span>
                    <p className="text-xs text-[#3e4947] mt-1">
                      Đánh giá hiệu suất Performance Review 02 lần/năm với lộ trình phát triển nghề nghiệp và thăng tiến chức danh minh bạch.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#97f5cc] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00513a] text-[22px]">laptop_mac</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#131b2e]">Trang thiết bị hiện đại</span>
                    <p className="text-xs text-[#3e4947] mt-1">
                      Trang bị laptop/máy trạm cấu hình cao, màn hình chuyên dụng và đầy đủ các phụ kiện hỗ trợ công việc tốt nhất.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#97f5cc] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00513a] text-[22px]">health_and_safety</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#131b2e]">Chăm sóc sức khỏe VIP</span>
                    <p className="text-xs text-[#3e4947] mt-1">
                      Gói bảo hiểm sức khỏe toàn diện cao cấp cho nhân viên, khám sức khỏe tổng quát định kỳ hàng năm tại bệnh viện quốc tế.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#97f5cc] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00513a] text-[22px]">flight_takeoff</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#131b2e]">Du lịch &amp; Team Building</span>
                    <p className="text-xs text-[#3e4947] mt-1">
                      Du lịch công ty thường niên (Company Trip), hoạt động teambuilding gắn kết và tiệc Happy Friday hàng tháng.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#97f5cc] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00513a] text-[22px]">school</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#131b2e]">Đào tạo &amp; Phát triển</span>
                    <p className="text-xs text-[#3e4947] mt-1">
                      Hỗ trợ 100% kinh phí thi các chứng chỉ chuyên ngành quốc tế, tài trợ các khóa học chuyên sâu trên các nền tảng hàng đầu.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Địa điểm & Thời gian làm việc */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-7 rounded-full bg-[#005c55]"></span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#131b2e]">
                  Địa điểm &amp; Thời gian làm việc
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#131b2e]">
                    <span className="material-symbols-outlined text-[#005c55] text-[20px]">corporate_fare</span>
                    <span>Văn phòng làm việc:</span>
                  </div>
                  
                  <div className="space-y-2">
                    {job.locations?.length > 0 ? (
                      job.locations.map((loc, idx) => (
                        <div key={loc.id ?? idx} className="p-3 bg-[#f2f3ff] rounded-xl text-xs text-[#3e4947] border border-[#eaedff]">
                          <span className="font-bold text-[#131b2e]">
                            {[loc.provinceName ?? loc.province_name, loc.communeName ?? loc.commune_name].filter(Boolean).join(' - ')}
                          </span>
                          {(loc.addressDetail ?? loc.address_detail) && (
                            <span>: {loc.addressDetail ?? loc.address_detail}</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#3e4947] p-3 bg-[#f2f3ff] rounded-xl border border-[#eaedff]">
                        {job.location || 'Địa chỉ làm việc trao đổi chi tiết khi phỏng vấn.'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm font-bold text-[#131b2e] pt-2">
                    <span className="material-symbols-outlined text-[#005c55] text-[20px]">schedule</span>
                    <span>Khung giờ làm việc linh hoạt:</span>
                  </div>
                  <p className="text-xs text-[#3e4947] leading-relaxed">
                    Thứ 2 - Thứ 6 (8:30 - 17:30 hoặc 9:00 - 18:00). <strong>Nghỉ trọn vẹn Thứ 7 &amp; Chủ Nhật</strong>.<br />
                    Chính sách làm việc kết hợp linh hoạt ({job.workMode || 'Hybrid / Onsite'}).
                  </p>
                </div>

                {/* Google Maps Embed */}
                <div className="flex flex-col gap-2">
                  <div className="w-full rounded-xl overflow-hidden border border-[#eaedff] shadow-sm">
                    {mapLocation?.trim() ? (
                      <iframe
                        title={`Bản đồ địa điểm - ${job.company}`}
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(mapLocation)}&output=embed`}
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="h-[200px] bg-[#f2f3ff] flex flex-col items-center justify-center text-[#6e7977] gap-2">
                        <span className="material-symbols-outlined text-3xl">map</span>
                        <span className="text-xs">Chưa có thông tin định vị GPS</span>
                      </div>
                    )}
                  </div>
                  {mapLocation?.trim() && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapLocation)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-end gap-1 text-xs font-bold text-[#005c55] hover:underline"
                    >
                      <span>Xem chỉ đường trên Google Maps</span>
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    </a>
                  )}
                </div>
              </div>
            </section>
          </article>

          {/* CỘT PHẢI (4 COLS) - HỒ SƠ DOANH NGHIỆP & TỔNG QUAN */}
          <aside className="lg:col-span-4 flex flex-col gap-6 w-full">
            
            {/* Company Showcase Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#eaedff] overflow-hidden flex flex-col">
              {/* Header Banner */}
              <div className="h-28 w-full bg-gradient-to-r from-[#005c55] to-[#006c4e] relative flex items-center justify-end px-4">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-[#005c55] shadow-sm backdrop-blur-sm">
                  Doanh nghiệp đã xác thực
                </span>
              </div>

              {/* Company Details Body */}
              <div className="p-6 pt-0 flex flex-col gap-4 relative">
                {/* Overlapping Logo */}
                <div className="flex items-end justify-between -mt-12">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-md p-1.5 border border-[#eaedff] flex items-center justify-center shrink-0">
                    <img
                      src={
                        companyInfo?.logoUrl ??
                        companyInfo?.logo_url ??
                        companyInfo?.logo ??
                        job.companyLogo ??
                        '/images/company-placeholder.png'
                      }
                      alt={job.company}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/images/company-placeholder.png';
                      }}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-[#131b2e] line-clamp-1">
                      {job.company}
                    </h3>
                    <span className="material-symbols-outlined text-[18px] text-[#005c55]" title="Doanh nghiệp đã xác minh">
                      verified
                    </span>
                  </div>
                  <p className="text-xs text-[#6e7977] line-clamp-2">
                    {companyInfo?.description || 'Doanh nghiệp uy tín đồng hành cùng hệ sinh thái tuyển dụng KiemJob.'}
                  </p>
                </div>

                {/* Company Meta Badges */}
                <div className="flex flex-col gap-2.5 pt-2 text-xs text-[#3e4947] border-t border-[#f2f3ff]">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#6e7977] text-[18px]">group</span>
                    <span>Quy mô: <strong className="text-[#131b2e] font-semibold">{companyInfo?.scale || companyInfo?.company_size || '50 - 200 nhân viên'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#6e7977] text-[18px]">domain</span>
                    <span>Lĩnh vực: <strong className="text-[#131b2e] font-semibold">{companyInfo?.industry || job.categoryName || 'Công nghệ & Dịch vụ'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#6e7977] text-[18px] shrink-0 mt-0.5">location_on</span>
                    <span className="line-clamp-2">{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#6e7977] text-[18px]">language</span>
                    <a
                      href={companyInfo?.website || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#005c55] hover:underline font-semibold truncate"
                    >
                      {companyInfo?.website || 'https://kiemjob.vn'}
                    </a>
                  </div>
                </div>

                {/* View Company Button */}
                <div className="pt-2">
                  <Link
                    to={job?.companyId || job?.company_id ? `/companies/${job.companyId || job.company_id}` : '/companies'}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <span>Xem trang công ty</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Box: Job Overview Summary (Thông tin tổng quan) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#eaedff] flex flex-col gap-4">
              <h3 className="text-base font-bold text-[#131b2e] flex items-center gap-2 pb-2 border-b border-[#eaedff]">
                <span className="material-symbols-outlined text-[#005c55] text-[20px]">assignment</span>
                <span>Thông tin tổng quan</span>
              </h3>

              <div className="flex flex-col gap-3 text-xs text-[#3e4947]">
                <div className="flex items-center justify-between pb-2 border-b border-[#f2f3ff]">
                  <span className="text-[#6e7977]">Ngày đăng tin:</span>
                  <span className="font-semibold text-[#131b2e]">{job.postedDate}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#f2f3ff]">
                  <span className="text-[#6e7977]">Cấp bậc:</span>
                  <span className="font-semibold text-[#131b2e]">
                    {EXPERIENCE_LEVELS[job.experience_level] || job.experience_level || 'Chuyên viên / Kỹ sư'}
                  </span>
                </div>

                {job.categoryName && (
                  <div className="flex items-center justify-between pb-2 border-b border-[#f2f3ff]">
                    <span className="text-[#6e7977]">Ngành nghề chính:</span>
                    <Link
                      to={`/jobs?category=${job.categoryId || encodeURIComponent(job.categoryName)}`}
                      className="font-bold text-[#005c55] hover:underline"
                    >
                      {job.categoryName}
                    </Link>
                  </div>
                )}

                <div className="flex items-center justify-between pb-2 border-b border-[#f2f3ff]">
                  <span className="text-[#6e7977]">Hình thức:</span>
                  <span className="font-semibold text-[#131b2e]">
                    {WORKING_METHODS[job.working_method] || job.working_method || 'Toàn thời gian'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#f2f3ff]">
                  <span className="text-[#6e7977]">Trình độ học vấn:</span>
                  <span className="font-semibold text-[#131b2e]">
                    {job.education_requirement || 'Không yêu cầu'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#f2f3ff]">
                  <span className="text-[#6e7977]">Giới tính:</span>
                  <span className="font-semibold text-[#131b2e]">Không yêu cầu</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#f2f3ff]">
                  <span className="text-[#6e7977]">Số lượng tuyển:</span>
                  <span className="font-bold text-[#131b2e]">{job.vacancies || 1} nhân sự</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#6e7977]">Hạn nộp hồ sơ:</span>
                  <span className="font-bold text-[#ba1a1a]">
                    {job.deadline || job.application_deadline || 'Tuyển liên tục'}
                  </span>
                </div>
              </div>
            </div>

            {/* Box: Bảo vệ người tìm việc (Safety & Support Desk) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#eaedff] flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#131b2e]">
                <span className="material-symbols-outlined text-[#006c4e] text-[20px]">shield</span>
                <span>Bảo vệ người tìm việc</span>
              </div>

              <p className="text-xs text-[#3e4947] leading-relaxed">
                KiemJob cam kết bảo vệ quyền lợi và bảo mật danh tính ứng viên. Doanh nghiệp trên sàn tuyệt đối không thu bất kỳ khoản phí tuyển dụng nào.
              </p>

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#f2f3ff] text-[#ba1a1a] hover:bg-[#ffdad6]/50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">flag</span>
                  <span>Báo cáo tin tuyển dụng vi phạm</span>
                </button>

                <div className="flex items-center justify-between text-xs text-[#3e4947] pt-1">
                  <span>Hỗ trợ ứng viên 24/7:</span>
                  <strong className="text-[#005c55] font-bold">(028) 7300 8888</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ========================================================================= */}
        {/* PHẦN VIỆC LÀM TƯƠNG TỰ - ĐƯỢC ĐẶT Ở TÍT CUỐI CÙNG & HIỂN THỊ GIỐNG JobListPage */}
        {/* ========================================================================= */}
        <section className="mt-16 pt-12 border-t border-[#eaedff]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-[#005c55] font-bold text-xs uppercase tracking-wider mb-1.5">
                <span className="material-symbols-outlined text-[18px]">work_history</span>
                <span>Gợi ý việc làm liên quan</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight">
                Việc làm tương tự dành cho bạn
              </h2>
              <p className="text-xs sm:text-sm text-[#6e7977] mt-1">
                Các vị trí tuyển dụng cùng lĩnh vực {job.categoryName ? `"${job.categoryName}"` : ''} đang mở nhận hồ sơ
              </p>
            </div>

            <Link
              to={job.categoryId ? `/jobs?category=${job.categoryId}` : '/jobs'}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#005c55] hover:text-[#007952] transition-colors shrink-0 group"
            >
              <span>Xem tất cả cơ hội</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>

          {loadingSimilar ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-[#f2f3ff] animate-pulse border border-[#eaedff]" />
              ))}
            </div>
          ) : similarJobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#eaedff] text-sm text-[#6e7977] space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#bdc9c6]">work_outline</span>
              <p className="font-semibold text-[#131b2e]">Chưa có thêm việc làm tương tự nào trong danh mục này.</p>
              <p className="text-xs">Bạn có thể quay lại trang danh sách để khám phá hàng ngàn công việc khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarJobs.map((item) => {
                const itemSaved = savedJobIds.some((sId) => String(sId) === String(item.id));
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      navigate(`/jobs/${item.id}`);
                    }}
                    className="p-5 rounded-2xl border border-[#eaedff] hover:border-[#80d5cb] hover:shadow-md transition-all cursor-pointer bg-white relative flex flex-col justify-between group"
                  >
                    {/* VIP Promotion Badge */}
                    {item.is_featured && (
                      <div className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold flex items-center gap-0.5 shadow-sm">
                        <span className="material-symbols-outlined text-[12px]">bolt</span>
                        VIP Nổi bật
                      </div>
                    )}

                    <div>
                      <div className="flex items-start gap-3.5">
                        {item.companyLogo ? (
                          <img
                            src={item.companyLogo}
                            alt={item.company}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            className="w-12 h-12 rounded-xl object-contain bg-[#f2f3ff] p-1 border border-[#eaedff] shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#f2f3ff] border border-[#eaedff] shrink-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#005c55] text-[24px]">business</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-6">
                          <h3 className="text-sm font-bold text-[#131b2e] leading-snug line-clamp-1 group-hover:text-[#005c55] transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-[#3e4947] font-medium mt-0.5 line-clamp-1">
                            {item.company}
                          </p>
                        </div>
                      </div>

                      {/* Salary, Location, Work Mode */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-[#005c55] font-bold">{item.salaryDisplay || item.salary}</span>
                        <span className="text-[#bdc9c6]">•</span>
                        <span className="text-[#6e7977] truncate max-w-[120px]">{item.location}</span>
                        <span className="text-[#bdc9c6]">•</span>
                        <span className="text-[#006c4e] font-semibold">{item.workMode}</span>
                      </div>

                      {/* Category & Tag pills */}
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                        {item.categoryName && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#97f5cc]/40 text-[#00513a] text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[13px]">
                              {getCategoryIcon(item.categoryName)}
                            </span>
                            <span>{item.categoryName}</span>
                          </span>
                        )}
                        {item.vacancies && (
                          <span className="px-2 py-0.5 bg-[#f2f3ff] text-[10px] font-bold rounded-md text-[#3e4947]">
                            {item.vacancies} chỉ tiêu
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Card Strip */}
                    <div className="mt-4 pt-3 border-t border-[#f2f3ff] flex items-center justify-between text-xs text-[#6e7977]">
                      <span className="text-[11px]">{item.postedDate}</span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-semibold text-[#005c55] group-hover:underline">
                          Chi tiết →
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSimilarSave(item.id);
                          }}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            itemSaved ? 'text-[#005c55]' : 'text-[#6e7977] hover:text-[#005c55]'
                          }`}
                          title={itemSaved ? 'Bỏ lưu tin' : 'Lưu tin'}
                        >
                          <span
                            className="material-symbols-outlined text-[18px]"
                            style={itemSaved ? { fontVariationSettings: "'FILL' 1" } : {}}
                          >
                            {itemSaved ? 'bookmark' : 'bookmark_border'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* MODAL ỨNG TUYỂN VÀ CHỌN HỒ SƠ CV */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-[#eaedff]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#131b2e]">Ứng Tuyển Vào Vị Trí</h3>
                <p className="text-xs font-semibold text-[#005c55] mt-0.5">{job.title} - {job.company}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="text-[#6e7977] hover:text-[#ba1a1a] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-[#131b2e] block mb-2">
                  Chọn hồ sơ CV của bạn (*)
                </label>

                {isLoadingCvs ? (
                  <div className="p-5 text-center text-xs text-[#6e7977] bg-[#f2f3ff] rounded-2xl flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[18px] text-[#005c55]">progress_activity</span>
                    <span>Đang tải danh sách CV...</span>
                  </div>
                ) : candidateCvs.length === 0 ? (
                  <div className="p-4 bg-[#fff8e1] rounded-2xl border border-[#ffe082] text-xs text-[#854d0e] space-y-2.5">
                    <p className="font-semibold">
                      {cvLoadError || 'Bạn chưa có hồ sơ CV nào được tạo trên KiemJob.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Link
                        to="/cvs"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#005c55] text-white font-bold rounded-xl text-xs hover:bg-[#007952] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">upload_file</span>
                        <span>Tải lên hoặc Tạo CV mới</span>
                      </Link>
                      <button
                        type="button"
                        onClick={loadCandidateCvs}
                        className="px-3 py-1.5 bg-[#eaedff] text-[#005c55] rounded-xl font-bold hover:bg-[#dae2fd]"
                      >
                        Thử lại
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {candidateCvs.map((c) => (
                      <label
                        key={c.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          String(selectedCvId) === String(c.id)
                            ? 'border-[#005c55] bg-[#97f5cc]/15 ring-2 ring-[#005c55]/20'
                            : 'border-[#eaedff] bg-[#f2f3ff]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="cv"
                            value={c.id}
                            checked={String(selectedCvId) === String(c.id)}
                            onChange={() => setSelectedCvId(String(c.id))}
                            className="accent-[#005c55]"
                          />
                          <div>
                            <p className="font-bold text-xs text-[#131b2e]">
                              {c.title || 'Hồ sơ CV ứng viên'}
                            </p>
                            <p className="text-[11px] text-[#6e7977]">
                              Mã CV: #{c.id}
                              {c.updatedAt ? ` • Cập nhật: ${new Date(c.updatedAt).toLocaleDateString('vi-VN')}` : ''}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-[#131b2e] block mb-1">
                  Thư giới thiệu / Lời nhắn gửi nhà tuyển dụng (Không bắt buộc)
                </label>
                <textarea
                  rows={3}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Giới thiệu ngắn gọn lý do bạn phù hợp với vị trí này..."
                  className="w-full p-3 bg-[#f2f3ff] rounded-2xl border border-transparent focus:border-[#005c55] focus:bg-white text-xs text-[#131b2e] outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3e4947] hover:bg-[#f2f3ff]"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={isApplying || isLoadingCvs || candidateCvs.length === 0}
                  className="px-6 py-2.5 bg-[#005c55] hover:bg-[#007952] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isApplying ? 'hourglass_top' : 'send'}
                  </span>
                  <span>{isApplying ? 'Đang gửi hồ sơ...' : 'Xác nhận nộp hồ sơ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BÁO CÁO TIN TUYỂN DỤNG VI PHẠM */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#eaedff] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <div className="flex items-center gap-2 text-[#ba1a1a]">
                <span className="material-symbols-outlined text-[22px]">flag</span>
                <h3 className="text-base font-bold text-[#131b2e]">Báo Cáo Tin Tuyển Dụng</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-[#6e7977] hover:text-[#131b2e]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#3e4947]">
              Vui lòng cho KiemJob biết lý do bạn báo cáo tin <strong>"{job.title}"</strong>:
            </p>

            <div className="space-y-2 text-xs">
              {[
                'Thông tin tuyển dụng sai sự thật / Đăng ảo',
                'Yêu cầu nộp phí đặt cọc, phí hồ sơ trái phép',
                'Dấu hiệu lừa đảo, đa cấp, mạo danh doanh nghiệp',
                'Nội dung không phù hợp hoặc vi phạm pháp luật',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${
                    reportReason === reason
                      ? 'border-[#005c55] bg-[#97f5cc]/15 text-[#131b2e] font-semibold'
                      : 'border-[#eaedff] bg-[#f2f3ff] text-[#3e4947]'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                    className="accent-[#005c55]"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="text-xs font-bold text-[#131b2e] block mb-1">
                Ghi chú thêm (không bắt buộc):
              </label>
              <textarea
                rows={2}
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="Cung cấp thêm chi tiết để đội ngũ KiemJob xử lý nhanh hơn..."
                className="w-full p-2.5 bg-[#f2f3ff] rounded-xl border border-transparent focus:border-[#005c55] focus:bg-white text-xs outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3e4947] hover:bg-[#f2f3ff]"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReportModalOpen(false);
                  setReportNote('');
                  showToast('Cảm ơn bạn đã phản hồi. Ban quản trị KiemJob sẽ kiểm tra và xử lý trong 24h.');
                }}
                className="px-5 py-2.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Gửi phản ánh</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
