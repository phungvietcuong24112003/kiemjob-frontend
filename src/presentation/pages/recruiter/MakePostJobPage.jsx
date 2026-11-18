import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { WORK_MODES } from '../../../domain/constants';
import { USER } from '../../../config/storageKeys';
import {
  createJobPost,
  updateJobPost,
  getJobPostById,
  getJobCategories,
  getJobDetails,
  createJobDetail,
  updateJobDetail,
  deleteJobDetail,
  getRecruiterProfile,
  jobSpecializationApi,
  getJobPostSpecializations,
  updateJobPostSpecializations,
  getProvinces,
  getCompanyAddresses,
  getJobAddresses,
  syncJobAddresses,
  checkJobModeration,
  jobPostingOrderApi,
} from '../../../infrastructure/api';
import { ROLES } from '../../../domain/constants/roles';
import RichTextEditor from '../../components/editor/RichTextEditor';

/**
 * MakePostJobPage - Trang Đăng Tin & Chỉnh Sửa Tin Tuyển Dụng
 * Tích hợp 100% dữ liệu thật từ Backend (Spring Boot + PostgreSQL).
 * Hỗ trợ chọn Danh mục ngành nghề (jobs_categories) và Chuyên môn trực thuộc (job_specializations) dạng Dropdown.
 */
export default function MakePostJobPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editJobId = searchParams.get('id');
  const isEditing = Boolean(editJobId);

  // Thông tin chính bài đăng (bảng job_posts)
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    vacancies: 1,
    education_requirement: 'Đại học trở lên',
    work_mode: 'onsite', // 'onsite' | 'remote' | 'hybrid'
    salary_min: '',
    salary_max: '',
    application_deadline: '',
    status: 'open', // 'draft' | 'open'
  });

  // Loại tin đăng (FREE / PAID) & Hạn mức Quota
  const [postingType, setPostingType] = useState('FREE');
  const [durationDays, setDurationDays] = useState(30);
  const [quota, setQuota] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  // Ngày hiện tại định dạng YYYY-MM-DD dùng để validate hạn chót
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Địa chỉ làm việc (bảng job_address)
  const [jobAddresses, setJobAddresses] = useState([
    {
      id: undefined,
      provinceId: '',
      addressDetail: '',
    },
  ]);
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [companyAddresses, setCompanyAddresses] = useState([]);
  const [showCompanyAddrDropdown, setShowCompanyAddrDropdown] = useState(false);

  // Chuyên môn nghề nghiệp (bảng job_specializations & job_post_specializations)
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpecIds, setSelectedSpecIds] = useState([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);
  const [showQuickAddSpec, setShowQuickAddSpec] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [isCreatingSpec, setIsCreatingSpec] = useState(false);

  // Nội dung chi tiết bài đăng (bảng job_details: title, content)
  const [jobDetails, setJobDetails] = useState([
    {
      id: undefined,
      title: 'Mô tả công việc (Job Description)',
      content:
        '<ul><li>Tham gia phát triển và duy trì hệ thống ứng dụng web hiệu năng cao phục vụ người dùng lớn.</li><li>Phối hợp cùng Product Manager, UI/UX Designer và Backend Engineer để phát triển tính năng mới.</li><li>Tối ưu hóa hiệu năng ứng dụng, bảo đảm tính sẵn sàng và tốc độ tải trang.</li></ul>',
    },
    {
      id: undefined,
      title: 'Yêu cầu ứng viên (Requirements)',
      content:
        '<ul><li>Nắm vững kiến thức chuyên môn, ngôn ngữ lập trình và các framework liên quan.</li><li>Có hiểu biết về kiến trúc hệ thống hiện đại, RESTful API và cơ sở dữ liệu.</li><li>Tư duy giải quyết vấn đề tốt, trách nhiệm cao và khả năng làm việc nhóm.</li></ul>',
    },
    {
      id: undefined,
      title: 'Quyền lợi được hưởng (Benefits & Perks)',
      content:
        '<ul><li>Lương thưởng cạnh tranh, xét duyệt tăng lương định kỳ.</li><li>Thưởng tháng 13 + thưởng hiệu quả công việc.</li><li>Đầy đủ chế độ bảo hiểm theo quy định pháp luật và gói bảo hiểm sức khỏe bổ sung.</li><li>Môi trường làm việc năng động, lộ trình phát triển rõ ràng.</li></ul>',
    },
  ]);

  // Danh sách ID các chi tiết đã bị xóa khi chỉnh sửa (để gọi delete API)
  const [deletedDetailIds, setDeletedDetailIds] = useState([]);

  // Danh mục nghề nghiệp từ backend
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');

  // Thông tin nhà tuyển dụng & công ty
  const [recruiterInfo, setRecruiterInfo] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [noCompanyWarning, setNoCompanyWarning] = useState(false);

  // Trạng thái Form & Loading
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [formError, setFormError] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Tải thông tin hồ sơ Recruiter & Doanh nghiệp
  useEffect(() => {
    let active = true;

    const checkRecruiter = async () => {
      setLoadingProfile(true);
      try {
        const response = await getRecruiterProfile();
        const data = response?.data ?? response;
        if (!active) return;

        setRecruiterInfo(data);
        if (!data?.companyId) {
          setNoCompanyWarning(true);
        }
      } catch (err) {
        console.warn('Không thể kiểm tra hồ sơ recruiter:', err);
        if (active) {
          if (err?.response?.status === 401) {
            showToast('Vui lòng đăng nhập tài khoản nhà tuyển dụng.');
          }
        }
      } finally {
        if (active) setLoadingProfile(false);
      }
    };

    checkRecruiter();

    return () => {
      active = false;
    };
  }, []);

  // 1.1 Tải hạn mức đăng tin (Quota) của công ty
  useEffect(() => {
    let active = true;
    const loadQuota = async () => {
      setLoadingQuota(true);
      try {
        const res = await jobPostingOrderApi.getCompanyQuota();
        const data = res?.data ?? res;
        if (active) {
          setQuota(data);
          if (!isEditing && data?.remainingFreeJobs === 0) {
            setPostingType('PAID');
          }
        }
      } catch (err) {
        console.warn('Không thể tải quota tin đăng:', err);
      } finally {
        if (active) setLoadingQuota(false);
      }
    };
    loadQuota();
    return () => {
      active = false;
    };
  }, [isEditing]);

  // 2. Tải danh sách tỉnh / thành phố từ Backend API (GET /api/provinces)
  useEffect(() => {
    let active = true;

    const loadProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const data = await getProvinces();
        const list = Array.isArray(data) ? data : data?.data ?? [];
        if (active) {
          setProvinces(list);
        }
      } catch (err) {
        console.warn('Lỗi khi tải danh sách tỉnh/thành:', err);
      } finally {
        if (active) setLoadingProvinces(false);
      }
    };

    loadProvinces();

    return () => {
      active = false;
    };
  }, []);

  // 3. Tải danh sách địa chỉ công ty để chọn nhanh khi tạo/sửa tin
  useEffect(() => {
    if (!recruiterInfo?.companyId) return;
    let active = true;

    const loadCompAddresses = async () => {
      try {
        const res = await getCompanyAddresses(recruiterInfo.companyId);
        const list = Array.isArray(res) ? res : res?.data ?? [];
        if (active) {
          setCompanyAddresses(list);
          // Nếu đang tạo tin mới và chưa chọn tỉnh nào, gợi ý địa chỉ đầu tiên của công ty
          if (!isEditing) {
            setJobAddresses((prev) => {
              if (prev.length === 1 && !prev[0].provinceId && list.length > 0) {
                const first = list[0];
                return [
                  {
                    id: undefined,
                    provinceId: first.provinceId || first.province?.id || '',
                    addressDetail: first.addressDetail || '',
                  },
                ];
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn('Lỗi tải địa chỉ công ty:', err);
      }
    };

    loadCompAddresses();

    return () => {
      active = false;
    };
  }, [recruiterInfo?.companyId, isEditing]);

  // 4. Tải danh mục nghề nghiệp từ Backend API (GET /api/jobs-categories)
  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      setLoadingCategories(true);
      setCategoriesError('');
      try {
        const response = await getJobCategories();
        const data = response?.data ?? response;
        const list = Array.isArray(data) ? data : data?.content ?? [];

        if (active) {
          setCategories(list);
          if (list.length > 0 && !formData.category_id) {
            setFormData((prev) => ({
              ...prev,
              category_id: prev.category_id || list[0].id,
            }));
          }
        }
      } catch (error) {
        console.error('Không thể tải danh mục ngành nghề:', error);
        if (active) {
          setCategoriesError('Không thể tải danh sách ngành nghề. Vui lòng tải lại trang.');
        }
      } finally {
        if (active) setLoadingCategories(false);
      }
    };

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  // 5. Tải danh sách chuyên môn khi category_id thay đổi
  useEffect(() => {
    if (!formData.category_id) {
      setSpecializations([]);
      return;
    }

    let active = true;
    const loadCategorySpecializations = async () => {
      setLoadingSpecializations(true);
      try {
        const data = await jobSpecializationApi.getSpecializations(formData.category_id);
        if (active) {
          setSpecializations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('Lỗi khi tải chuyên môn của danh mục:', err);
      } finally {
        if (active) setLoadingSpecializations(false);
      }
    };

    loadCategorySpecializations();

    return () => {
      active = false;
    };
  }, [formData.category_id]);

  // 6. Nếu ở chế độ Chỉnh sửa (editJobId), tải dữ liệu tin tuyển dụng, chuyên môn & địa chỉ hiện có
  useEffect(() => {
    if (!editJobId) return;

    let active = true;
    setIsLoadingJob(true);

    const loadExistingJob = async () => {
      try {
        const [jobRes, detailsRes, specsRes, addressesRes] = await Promise.all([
          getJobPostById(editJobId),
          getJobDetails(editJobId),
          getJobPostSpecializations(editJobId).catch(() => []),
          getJobAddresses(editJobId).catch(() => []),
        ]);

        if (!active) return;

        const job = jobRes?.data ?? jobRes;
        const detailsData = detailsRes?.data ?? detailsRes;
        const detailsList = Array.isArray(detailsData) ? detailsData : [];
        const specsData = specsRes?.data ?? specsRes;
        const addressesData = addressesRes?.data ?? addressesRes;
        const addressesList = Array.isArray(addressesData) ? addressesData : [];

        if (job) {
          setPostingType(job.postingType || 'FREE');
          setDurationDays(job.durationDays || 30);
          setFormData({
            title: job.title || '',
            category_id: job.categoryId || '',
            vacancies: job.vacancies || 1,
            education_requirement: job.educationalRequirement || 'Đại học trở lên',
            work_mode: job.workingMode || 'onsite',
            salary_min: job.salaryMin != null ? job.salaryMin : '',
            salary_max: job.salaryMax != null ? job.salaryMax : '',
            application_deadline: job.applicationDeadline || '',
            status: job.status || 'open',
          });
        }

        if (Array.isArray(specsData) && specsData.length > 0) {
          setSelectedSpecIds(specsData.map((s) => s.id));
        }

        if (addressesList.length > 0) {
          setJobAddresses(
            addressesList.map((a) => ({
              id: a.id,
              provinceId: a.provinceId || a.province?.id || '',
              addressDetail: a.addressDetail || '',
            }))
          );
        } else if (job?.addresses && job.addresses.length > 0) {
          setJobAddresses(
            job.addresses.map((a) => ({
              id: a.id,
              provinceId: a.provinceId || '',
              addressDetail: a.addressDetail || '',
            }))
          );
        }

        if (detailsList.length > 0) {
          setJobDetails(
            detailsList.map((d) => ({
              id: d.id,
              title: d.title || '',
              content: d.content || '',
            }))
          );
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu tin tuyển dụng:', err);
        if (active) {
          setFormError('Không thể tải dữ liệu tin tuyển dụng cần chỉnh sửa.');
          showToast('Không thể tải dữ liệu tin tuyển dụng.');
        }
      } finally {
        if (active) setIsLoadingJob(false);
      }
    };

    loadExistingJob();

    return () => {
      active = false;
    };
  }, [editJobId]);

  // Toggle hoặc xóa chuyên môn khỏi danh sách đã chọn
  const toggleSpecialization = (specId) => {
    setSelectedSpecIds((prev) =>
      prev.includes(specId)
        ? prev.filter((id) => id !== specId)
        : [...prev, specId]
    );
  };

  // Thêm nhanh chuyên môn mới cho danh mục đang chọn
  const handleCreateQuickSpec = async () => {
    const trimmed = newSpecName.trim();
    if (!trimmed || !formData.category_id) return;

    setIsCreatingSpec(true);
    try {
      const created = await jobSpecializationApi.createSpecialization({
        jobCategoryId: formData.category_id,
        name: trimmed,
      });
      setSpecializations((prev) => [...prev, created]);
      setSelectedSpecIds((prev) => [...prev, created.id]);
      setNewSpecName('');
      setShowQuickAddSpec(false);
      showToast(`Đã thêm và chọn chuyên môn "${trimmed}"!`);
    } catch (err) {
      console.warn('Lỗi khi thêm chuyên môn:', err);
      let errMsg = 'Không thể thêm chuyên môn.';
      if (err.message?.includes('409') || err.message?.toLowerCase().includes('tồn tại')) {
        errMsg = 'Chuyên môn này đã có trong danh mục.';
      } else if (err.message) {
        errMsg = err.message;
      }
      showToast(errMsg);
    } finally {
      setIsCreatingSpec(false);
    }
  };

  // Quản lý địa chỉ làm việc (bảng job_address)
  const addAddressItem = () => {
    setJobAddresses((prev) => [
      ...prev,
      {
        id: undefined,
        provinceId: '',
        addressDetail: '',
      },
    ]);
  };

  const updateAddressItem = (index, field, value) => {
    setJobAddresses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeAddressItem = (index) => {
    if (jobAddresses.length <= 1) {
      showToast('Cần ít nhất một địa chỉ làm việc cho vị trí tuyển dụng.');
      return;
    }
    setJobAddresses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCompanyAddress = (compAddr) => {
    const provId = compAddr.provinceId || compAddr.province?.id;
    const detail = compAddr.addressDetail || '';

    const exists = jobAddresses.some(
      (a) =>
        Number(a.provinceId) === Number(provId) &&
        (a.addressDetail || '').trim() === detail.trim()
    );
    if (exists) {
      showToast('Địa chỉ này đã có trong danh sách làm việc.');
      return;
    }

    setJobAddresses((prev) => {
      if (prev.length === 1 && !prev[0].provinceId && !prev[0].addressDetail) {
        return [{ id: undefined, provinceId: provId, addressDetail: detail }];
      }
      return [...prev, { id: undefined, provinceId: provId, addressDetail: detail }];
    });
    showToast('Đã thêm địa chỉ từ công ty!');
  };

  // Quản lý các mục nội dung chi tiết (job_details)
  const addJobDetail = () => {
    setJobDetails((prev) => [
      ...prev,
      {
        id: undefined,
        title: 'Thông tin bổ sung / Quy trình ứng tuyển',
        content: '',
      },
    ]);
  };

  const updateJobDetailItem = (index, field, value) => {
    setJobDetails((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeJobDetail = (index) => {
    if (jobDetails.length <= 1) {
      showToast('Cần ít nhất một mục nội dung chi tiết.');
      return;
    }
    const target = jobDetails[index];
    if (target.id) {
      setDeletedDetailIds((prev) => [...prev, target.id]);
    }
    setJobDetails((prev) => prev.filter((_, i) => i !== index));
  };

  // Xử lý gửi Form (submitStatus: 'draft' hoặc 'open')
  const handleSave = async (submitStatus) => {
    setFormError('');

    if (isSubmitting) return;

    if (noCompanyWarning) {
      setFormError('Tài khoản chưa hoàn tất thông tin công ty. Vui lòng cập nhật hồ sơ doanh nghiệp.');
      showToast('Chưa có thông tin công ty hợp lệ.');
      return;
    }

    // 1. Validation tiêu đề
    if (!formData.title.trim()) {
      setFormError('Vui lòng nhập tiêu đề tin tuyển dụng.');
      showToast('Vui lòng nhập tiêu đề tin tuyển dụng.');
      return;
    }

    // 2. Validation danh mục nghề nghiệp
    if (!formData.category_id) {
      setFormError('Vui lòng chọn ngành nghề / danh mục công việc.');
      showToast('Vui lòng chọn ngành nghề.');
      return;
    }

    // 3. Validation địa chỉ làm việc
    const validAddresses = jobAddresses
      .filter((a) => a.provinceId)
      .map((a) => ({
        id: a.id,
        provinceId: Number(a.provinceId),
        addressDetail: a.addressDetail?.trim() || null,
      }));

    if (validAddresses.length === 0) {
      setFormError('Vui lòng chọn ít nhất một tỉnh/thành phố cho địa chỉ làm việc.');
      showToast('Vui lòng chọn địa chỉ làm việc.');
      return;
    }

    // 4. Validation số lượng tuyển (> 0)
    const vacanciesNum = Number(formData.vacancies);
    if (!vacanciesNum || vacanciesNum <= 0) {
      setFormError('Số lượng tuyển dụng phải lớn hơn 0.');
      showToast('Số lượng tuyển phải lớn hơn 0.');
      return;
    }

    // 5. Validation mức lương
    const minSalary =
      formData.salary_min !== '' && formData.salary_min != null
        ? Number(formData.salary_min)
        : null;
    const maxSalary =
      formData.salary_max !== '' && formData.salary_max != null
        ? Number(formData.salary_max)
        : null;

    if (minSalary !== null && minSalary < 0) {
      setFormError('Mức lương tối thiểu không được âm.');
      showToast('Lương tối thiểu không được âm.');
      return;
    }

    if (maxSalary !== null && maxSalary < 0) {
      setFormError('Mức lương tối đa không được âm.');
      showToast('Lương tối đa không được âm.');
      return;
    }

    if (minSalary !== null && maxSalary !== null && minSalary > maxSalary) {
      setFormError('Mức lương tối thiểu không được lớn hơn mức lương tối đa.');
      showToast('Lương tối thiểu không được lớn hơn lương tối đa.');
      return;
    }

    // 6. Validation hạn chót nộp hồ sơ khi đăng tin (open)
    if (submitStatus === 'open' && !formData.application_deadline) {
      setFormError('Vui lòng chọn hạn chót nộp hồ sơ khi đăng tin.');
      showToast('Vui lòng chọn hạn chót nộp hồ sơ.');
      return;
    }

    if (formData.application_deadline && formData.application_deadline < todayStr) {
      setFormError(`Hạn chót nộp hồ sơ (${formData.application_deadline}) không được ở trong quá khứ hoặc trước ngày hôm nay (${todayStr}).`);
      showToast('Hạn chót nộp hồ sơ không được ở trước hôm nay.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Chuẩn bị payload khớp chuẩn DTO backend JobPostRequest
      // submitForReview: true khi gửi duyệt, false khi chỉ lưu nháp
      const submitForReview = submitStatus === 'open';
      const jobPayload = {
        title: formData.title.trim(),
        categoryId: Number(formData.category_id),
        vacancies: vacanciesNum,
        workingMode: formData.work_mode,
        educationalRequirement: formData.education_requirement?.trim() || null,
        applicationDeadline: formData.application_deadline || null,
        salaryMin: minSalary,
        salaryMax: maxSalary,
        status: 'draft',
        postingType: postingType,
        durationDays: postingType === 'PAID' ? durationDays : null,
        submitForReview: submitForReview,
        addresses: validAddresses,
      };

      const currentUserRole = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem(USER) || '{}')?.role
        : null;

      // Chỉ gửi companyId và postedById khi là quản trị viên (Admin).
      // Với Recruiter, backend tự động trích xuất từ phiên đăng nhập HttpOnly cookie.
      if (currentUserRole === ROLES.ADMIN) {
        if (recruiterInfo?.companyId) {
          jobPayload.companyId = Number(recruiterInfo.companyId);
        }
        if (recruiterInfo?.id) {
          jobPayload.postedById = Number(recruiterInfo.id);
        }
      }

      let targetJobId = editJobId;

      if (isEditing) {
        // Cập nhật tin tuyển dụng hiện có
        await updateJobPost(editJobId, jobPayload);
      } else {
        // Tạo tin tuyển dụng mới
        const res = await createJobPost(jobPayload);
        const createdJob = res?.data ?? res;
        targetJobId = createdJob?.id;

        if (!targetJobId) {
          throw new Error('Máy chủ không trả về mã tin tuyển dụng.');
        }
      }

      // Lưu danh sách địa chỉ làm việc (bảng job_address)
      try {
        await syncJobAddresses(targetJobId, validAddresses);
      } catch (addrErr) {
        console.warn('Lỗi cập nhật địa chỉ tin tuyển dụng:', addrErr);
      }

      // Lưu danh sách chuyên môn liên kết với tin tuyển dụng (bảng job_post_specializations)
      try {
        await updateJobPostSpecializations(targetJobId, selectedSpecIds);
      } catch (specErr) {
        console.warn('Lỗi cập nhật chuyên môn tin tuyển dụng:', specErr);
      }

      // Xóa các mục chi tiết đã bị xóa trong danh sách (khi chỉnh sửa)
      if (isEditing && deletedDetailIds.length > 0) {
        for (const delId of deletedDetailIds) {
          try {
            await deleteJobDetail(targetJobId, delId);
          } catch (err) {
            console.warn(`Lỗi khi xóa mục chi tiết #${delId}:`, err);
          }
        }
      }

      // Lưu các mục nội dung chi tiết (bảng job_details: title, content)
      for (const detail of jobDetails) {
        const title = detail.title?.trim();
        const content = detail.content?.trim();

        if (!title && !content) continue;

        const detailPayload = {
          title: title || 'Chi tiết tin tuyển dụng',
          content: content || '',
        };

        if (detail.id) {
          await updateJobDetail(targetJobId, detail.id, detailPayload);
        } else {
          await createJobDetail(targetJobId, detailPayload);
        }
      }

      // Tích hợp AI kiểm duyệt nội dung tin tuyển dụng tự động
      if (submitStatus === 'open' || isEditing) {
        try {
          showToast('Đang phân tích kiểm duyệt nội dung bằng AI...');
          const modRes = await checkJobModeration(targetJobId);
          const modData = modRes?.data ?? modRes;

          if (modData?.moderationStatus === 'pending_review') {
            showToast('Tin đã gửi duyệt! AI phát hiện một số nội dung cần Quản trị viên xem xét kỹ trước khi công khai.', 'warning');
          } else if (modData?.moderationStatus === 'passed') {
            showToast('Nội dung đã vượt qua kiểm duyệt AI sơ bộ! Tin đang chờ Quản trị viên phê duyệt công khai.', 'success');
          } else {
            showToast('Tin tuyển dụng đã được gửi và đang chờ Quản trị viên kiểm duyệt!', 'success');
          }
        } catch (aiErr) {
          console.warn('Lỗi phân tích AI tự động:', aiErr);
          showToast('Tin tuyển dụng đã gửi và đang chờ Quản trị viên kiểm duyệt!', 'success');
        }
      } else {
        showToast('Lưu bản nháp tin tuyển dụng thành công!');
      }

      // Chuyển hướng về trang danh sách sau khi lưu
      setTimeout(() => {
        navigate('/recruiter/jobs');
      }, 1500);
    } catch (error) {
      console.error('Lỗi khi lưu tin tuyển dụng:', error);
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Không thể lưu tin tuyển dụng. Vui lòng kiểm tra lại thông tin.';

      setFormError(serverMessage);
      showToast(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingJob) {
    return (
      <div className="max-w-5xl mx-auto py-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#eaedff] border-t-[#005c55] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-[#6e7977]">
          Đang tải dữ liệu tin tuyển dụng...
        </p>
      </div>
    );
  }

  // Tên danh mục đang chọn để hiển thị gợi ý
  const selectedCategoryObj = categories.find(
    (c) => Number(c.id) === Number(formData.category_id)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#131b2e] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-[#97f5cc]/40 animate-bounce">
          <span className="material-symbols-outlined text-[#97f5cc] text-[22px]">
            check_circle
          </span>
          <span className="text-xs sm:text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Cảnh báo chưa có công ty */}
      {noCompanyWarning && (
        <div className="p-4 rounded-xl bg-[#fff7ed] border border-[#ffedd5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[#ea580c] text-[22px] shrink-0 mt-0.5">
              warning
            </span>
            <div>
              <p className="font-bold text-[#9a3412]">
                Tài khoản chưa hoàn tất thông tin công ty!
              </p>
              <p className="text-[#c2410c] mt-0.5">
                Bạn cần hoàn thiện hồ sơ doanh nghiệp trước khi có thể đăng tin tuyển dụng lên hệ thống.
              </p>
            </div>
          </div>
          <Link
            to="/recruiter/company-info"
            className="px-3.5 py-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-lg transition-colors shrink-0 text-center text-xs"
          >
            Cập nhật công ty ngay
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/recruiter/jobs" className="hover:text-[#005c55] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Quản lý tin đăng
              </Link>
              <span>/</span>
              <span>{isEditing ? `Sửa tin #${editJobId}` : 'Tạo tin mới'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isEditing ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng mới'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Điền thông tin vị trí công việc, ngành nghề và các chuyên môn trực thuộc để thu hút ứng viên tiềm năng.
            </p>
          </div>

          {recruiterInfo?.companyName && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
              <span className="material-symbols-outlined text-[#005c55] text-[16px]">
                apartment
              </span>
              <span>{recruiterInfo.companyName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Thông báo lỗi Form nếu có */}
      {formError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{formError}</span>
        </div>
      )}

      {/* Form chính */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 text-xs sm:text-sm">
        {/* PHẦN: LỰA CHỌN GÓI ĐĂNG TIN & HẠN MỨC QUOTA */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 bg-[#005c55] rounded-full" />
              <h2 className="text-sm font-bold text-slate-900">
                Gói đăng tin & Hạn mức tuyển dụng
              </h2>
            </div>

            {quota && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Hạn mức miễn phí: <strong>{quota.usedFreeJobs}/3 tin</strong> (Còn {quota.remainingFreeJobs} tin)
                </span>
              </div>
            )}
          </div>

          {/* Cards lựa chọn gói */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Gói FREE */}
            <div
              onClick={() => {
                if (quota?.remainingFreeJobs > 0 || isEditing || postingType === 'FREE') {
                  setPostingType('FREE');
                }
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                postingType === 'FREE'
                  ? 'border-[#005c55] bg-emerald-50/40 shadow-xs'
                  : (quota?.remainingFreeJobs === 0 && !isEditing)
                  ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    postingType === 'FREE' ? 'border-[#005c55]' : 'border-slate-400'
                  }`}>
                    {postingType === 'FREE' && <div className="w-2.5 h-2.5 bg-[#005c55] rounded-full" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Đăng tin Miễn phí (FREE)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Dành cho doanh nghiệp tuyển dụng cơ bản</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  0 VNĐ
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">check</span>
                  <span>Tối đa <strong>3 tin tuyển dụng</strong> đang hoạt động cùng lúc</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">check</span>
                  <span>Đóng tin sẽ giải phóng ngay hạn mức để đăng tin khác</span>
                </div>
                {quota?.remainingFreeJobs === 0 && !isEditing && (
                  <p className="text-red-600 font-semibold pt-1">
                    * Công ty đã sử dụng hết 3 tin miễn phí. Vui lòng chọn gói Trả phí bên cạnh.
                  </p>
                )}
              </div>
            </div>

            {/* Gói PAID */}
            <div
              onClick={() => setPostingType('PAID')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                postingType === 'PAID'
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    postingType === 'PAID' ? 'border-blue-600' : 'border-slate-400'
                  }`}>
                    {postingType === 'PAID' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Đăng tin Trả phí (PAID)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Không giới hạn số lượng tin, chủ động thời hạn</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                  1.000đ / ngày
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">check</span>
                  <span>Tùy chọn thời hạn hiển thị từ <strong>3 đến 90 ngày</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">check</span>
                  <span>Admin duyệt trước, thanh toán VNPay sau để kích hoạt</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cấu hình số ngày và tạm tính chi phí khi chọn PAID */}
          {postingType === 'PAID' && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="font-bold text-slate-800 text-xs sm:text-sm">
                  Chọn số ngày hiển thị tin tuyển dụng (3 - 90 ngày):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="3"
                    max="90"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Math.max(3, Math.min(90, parseInt(e.target.value) || 3)))}
                    className="w-20 px-3 py-1.5 text-center text-sm font-bold bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">ngày</span>
                  <div className="flex gap-1 ml-2">
                    {[7, 15, 30, 60].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDurationDays(d)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                          durationDays === d
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d}n
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-600">Tạm tính phí đăng tin:</span>
                <span className="font-extrabold text-blue-700 text-base">
                  {(durationDays * 1000).toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Quý khách chưa cần thanh toán ngay bây giờ. Đơn hàng sẽ được tạo sau khi Quản trị viên phê duyệt nội dung tin.
              </p>
            </div>
          )}
        </div>

        {/* PHẦN 1: THÔNG TIN CHUNG BÀI ĐĂNG (Bảng: job_posts) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <span className="w-2 h-5 bg-[#005c55] rounded-full" />
            <h2 className="text-sm font-bold text-slate-900">
              1. Thông tin vị trí tuyển dụng
            </h2>
          </div>

          {/* Tiêu đề tin */}
          <div>
            <label className="font-bold text-[#131b2e] block mb-1.5">
              Tiêu đề tin tuyển dụng <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Tuyển Lập Trình Viên Backend (Java / Spring Boot)..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-3.5 bg-[#f2f3ff] rounded-2xl outline-none font-semibold text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white transition-colors"
            />
          </div>

          {/* ── BỘ ĐÔI DROPDOWN: NGÀNH NGHỀ & CHUYÊN MÔN CHI TIẾT ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dropdown 1: Ngành nghề / Danh mục từ API */}
            <div>
              <label className="font-bold text-[#131b2e] block mb-1.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#005c55] text-[18px]">
                  category
                </span>
                <span>Ngành nghề / Danh mục</span> <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => {
                  const newCatId = Number(e.target.value);
                  setFormData({ ...formData, category_id: newCatId });
                  // Đổi ngành nghề -> reset chuyên môn đã chọn
                  setSelectedSpecIds([]);
                  setShowQuickAddSpec(false);
                }}
                disabled={loadingCategories || categories.length === 0}
                className="w-full p-3.5 bg-[#f2f3ff] rounded-2xl outline-none border border-transparent focus:border-[#005c55] focus:bg-white font-semibold cursor-pointer transition-colors"
              >
                {loadingCategories ? (
                  <option value="">Đang tải danh mục nghề nghiệp...</option>
                ) : categories.length === 0 ? (
                  <option value="">Chưa có dữ liệu danh mục</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
              {categoriesError && (
                <p className="text-[11px] text-[#ba1a1a] mt-1">{categoriesError}</p>
              )}
            </div>

            {/* Dropdown 2: Chuyên môn / Vị trí chi tiết theo danh mục */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#005c55] text-[18px]">
                    school
                  </span>
                  <span>Chuyên môn / Vị trí chi tiết</span>
                </label>
                {selectedSpecIds.length > 0 && (
                  <span className="text-[11px] font-bold text-[#005c55]">
                    (Đã chọn {selectedSpecIds.length})
                  </span>
                )}
              </div>

              <select
                value={selectedSpecIds.length === 1 ? selectedSpecIds[0] : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__add_new__') {
                    setShowQuickAddSpec(true);
                    return;
                  }
                  if (!val) {
                    setSelectedSpecIds([]);
                    return;
                  }
                  const numId = Number(val);
                  if (selectedSpecIds.includes(numId)) {
                    // Nếu đã chọn rồi thì không thêm trùng
                    return;
                  }
                  setSelectedSpecIds((prev) => [...prev, numId]);
                }}
                disabled={loadingSpecializations || !formData.category_id}
                className="w-full p-3.5 bg-[#f2f3ff] rounded-2xl outline-none border border-transparent focus:border-[#005c55] focus:bg-white font-semibold cursor-pointer transition-colors"
              >
                <option value="">
                  {loadingSpecializations
                    ? 'Đang tải danh sách chuyên môn...'
                    : specializations.length === 0
                    ? '-- Chưa có chuyên môn trong ngành này --'
                    : selectedSpecIds.length === 0
                    ? `-- Chọn chuyên môn thuộc ${selectedCategoryObj?.name || 'ngành'} --`
                    : '-- Chọn thêm chuyên môn khác --'}
                </option>
                {specializations.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {selectedSpecIds.includes(spec.id) ? `✓ ${spec.name} (Đã chọn)` : spec.name}
                  </option>
                ))}
                {formData.category_id && (
                  <option value="__add_new__">+ Thêm chuyên môn mới vào danh mục...</option>
                )}
              </select>

              {/* Danh sách các chuyên môn đã chọn hiển thị thành các chip gọn gàng kèm nút xóa */}
              {selectedSpecIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-[#6e7977] mr-0.5">Đã chọn:</span>
                  {selectedSpecIds.map((id) => {
                    const spec = specializations.find((s) => s.id === id);
                    if (!spec) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#005c55] text-white text-[11px] font-semibold shadow-xs"
                      >
                        <span>{spec.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleSpecialization(id)}
                          className="hover:opacity-75 p-0.5 ml-0.5 cursor-pointer"
                          title={`Bỏ chọn ${spec.name}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Form gõ nhanh chuyên môn nếu nhà tuyển dụng chọn "+ Thêm chuyên môn mới..." */}
              {showQuickAddSpec && (
                <div className="flex items-center gap-1.5 mt-2 p-2 bg-[#f2f3ff] rounded-xl border border-[#eaedff]">
                  <input
                    type="text"
                    placeholder={`Tên chuyên môn mới (VD: ${selectedCategoryObj?.name === 'Công nghệ thông tin' ? 'AI Engineer' : 'Chuyên viên'}...)`}
                    value={newSpecName}
                    onChange={(e) => setNewSpecName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateQuickSpec();
                      } else if (e.key === 'Escape') {
                        setShowQuickAddSpec(false);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-white rounded-lg border border-[#eaedff] outline-none focus:border-[#005c55] text-[#131b2e]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateQuickSpec}
                    disabled={isCreatingSpec || !newSpecName.trim()}
                    className="px-3 py-1.5 bg-[#005c55] hover:bg-[#0f766e] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isCreatingSpec ? '...' : 'Thêm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddSpec(false)}
                    className="p-1.5 text-[#6e7977] hover:text-[#131b2e]"
                    title="Đóng"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hàng 3: Số lượng tuyển & Yêu cầu học vấn & Hình thức làm việc */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* Số lượng tuyển */}
            <div>
              <label className="font-bold text-[#131b2e] block mb-1.5">
                Số lượng tuyển <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.vacancies}
                onChange={(e) =>
                  setFormData({ ...formData, vacancies: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="w-full p-3.5 bg-[#f2f3ff] rounded-2xl outline-none border border-transparent focus:border-[#005c55] focus:bg-white font-semibold transition-colors"
              />
            </div>

            {/* Yêu cầu học vấn */}
            <div>
              <label className="font-bold text-[#131b2e] block mb-1.5">
                Yêu cầu trình độ học vấn
              </label>
              <select
                value={formData.education_requirement}
                onChange={(e) =>
                  setFormData({ ...formData, education_requirement: e.target.value })
                }
                className="w-full p-3.5 bg-[#f2f3ff] rounded-2xl outline-none border border-transparent focus:border-[#005c55] focus:bg-white font-semibold cursor-pointer transition-colors"
              >
                <option value="Đại học trở lên">Đại học trở lên</option>
                <option value="Cao đẳng">Cao đẳng</option>
                <option value="Trung cấp / Nghề">Trung cấp / Nghề</option>
                <option value="Không yêu cầu bằng cấp">Không yêu cầu bằng cấp</option>
              </select>
            </div>

            {/* Hình thức làm việc (workingmode: onsite | remote | hybrid) */}
            <div>
              <label className="font-bold text-[#131b2e] block mb-1.5">
                Hình thức làm việc <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                value={formData.work_mode}
                onChange={(e) => setFormData({ ...formData, work_mode: e.target.value })}
                className="w-full p-3.5 bg-[#f2f3ff] rounded-2xl outline-none border border-transparent focus:border-[#005c55] focus:bg-white font-semibold cursor-pointer transition-colors"
              >
                <option value="onsite">Tại văn phòng (Onsite)</option>
                <option value="remote">Làm việc từ xa (Remote)</option>
                <option value="hybrid">Linh hoạt kết hợp (Hybrid)</option>
              </select>
            </div>
          </div>

          {/* Hàng 4: Mức lương & Hạn chót nộp hồ sơ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Mức lương Min - Max */}
            <div>
              <label className="font-bold text-[#131b2e] block mb-1.5">
                Mức lương (VNĐ) <span className="text-xs font-normal text-[#6e7977]">(Để trống nếu Thỏa thuận)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="500000"
                  min="0"
                  placeholder="Lương Min"
                  value={formData.salary_min}
                  onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                  className="p-3.5 bg-[#f2f3ff] rounded-xl outline-none border border-transparent focus:border-[#005c55] focus:bg-white font-semibold text-xs"
                />
                <input
                  type="number"
                  step="500000"
                  min="0"
                  placeholder="Lương Max"
                  value={formData.salary_max}
                  onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                  className="p-3.5 bg-[#f2f3ff] rounded-xl outline-none border border-transparent focus:border-[#005c55] focus:bg-white font-semibold text-xs"
                />
              </div>
            </div>

            {/* Hạn chót nộp hồ sơ */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-[#131b2e] block">
                  Hạn chót nộp hồ sơ <span className="text-[#ba1a1a]">*</span>
                </label>
                {postingType === 'PAID' && (
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + durationDays);
                      setFormData((prev) => ({ ...prev, application_deadline: d.toISOString().split('T')[0] }));
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline transition-colors"
                  >
                    Gợi ý theo gói trả phí (+{durationDays} ngày)
                  </button>
                )}
              </div>
              <input
                type="date"
                required
                min={todayStr}
                autoComplete="off"
                value={formData.application_deadline}
                onChange={(e) =>
                  setFormData({ ...formData, application_deadline: e.target.value })
                }
                className={`w-full p-3.5 rounded-2xl outline-none font-semibold text-xs cursor-pointer transition-colors ${
                  formData.application_deadline && formData.application_deadline < todayStr
                    ? 'bg-amber-50 border-2 border-amber-400 text-amber-900 focus:bg-white'
                    : 'bg-[#f2f3ff] border border-transparent focus:border-[#005c55] focus:bg-white'
                }`}
              />
              {formData.application_deadline && formData.application_deadline < todayStr && (
                <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 mt-2 font-medium animate-fade-in">
                  <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">
                    warning
                  </span>
                  <span>
                    <strong>Cảnh báo thời gian:</strong> Ngày đã chọn (<code>{formData.application_deadline}</code>) ở trước ngày hôm nay (<code>{todayStr}</code>). Vui lòng chọn ngày từ hôm nay trở đi để tin không bị ẩn khỏi trang chủ và danh sách việc làm!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PHẦN 2: ĐỊA CHỈ & KHU VỰC LÀM VIỆC (Bảng: job_address) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 bg-[#005c55] rounded-full" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#005c55] text-[18px]">
                    location_on
                  </span>
                  <span>2. Địa chỉ &amp; Khu vực làm việc</span>
                  <span className="text-[#ba1a1a]">*</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Xác định nơi ứng viên sẽ đến làm việc. Hỗ trợ nhiều địa chỉ nếu công ty tuyển dụng cho nhiều chi nhánh.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Nút chọn nhanh từ địa chỉ công ty */}
              {companyAddresses.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCompanyAddrDropdown((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e6f4ea] hover:bg-[#c2e7cc] text-xs font-bold text-[#137333] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">domain</span>
                    <span>Chọn từ địa chỉ công ty</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
                  </button>

                  {showCompanyAddrDropdown && (
                    <div className="absolute right-0 mt-1 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#eaedff] p-2 z-30 space-y-1">
                      <div className="text-[11px] font-bold text-[#6e7977] px-2 py-1 border-b border-[#eaedff]">
                        Địa chỉ hiện có của công ty:
                      </div>
                      {companyAddresses.map((cAddr, cIdx) => {
                        const provName =
                          cAddr.provinceName || cAddr.province?.name || 'Tỉnh thành';
                        const detail = cAddr.addressDetail || '';
                        return (
                          <button
                            key={cAddr.id || cIdx}
                            type="button"
                            onClick={() => {
                              handleAddCompanyAddress(cAddr);
                              setShowCompanyAddrDropdown(false);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-[#f2f3ff] transition-colors flex items-start gap-2"
                          >
                            <span className="material-symbols-outlined text-[#005c55] text-base shrink-0 mt-0.5">
                              pin_drop
                            </span>
                            <div className="text-xs">
                              <p className="font-bold text-[#131b2e]">{provName}</p>
                              <p className="text-[11px] text-[#55605e] line-clamp-1">
                                {detail || 'Không có địa chỉ chi tiết'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Nút thêm dòng địa chỉ */}
              <button
                type="button"
                onClick={addAddressItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-xs font-bold text-[#005c55] transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                <span>Thêm địa chỉ</span>
              </button>
            </div>
          </div>

          {/* Danh sách địa chỉ làm việc */}
          <div className="space-y-3">
            {jobAddresses.map((addr, idx) => (
              <div
                key={addr.id ?? idx}
                className="p-4 bg-[#f8f9fe] rounded-2xl border border-[#eaedff] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#005c55] text-white flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-[#131b2e]">
                      Địa điểm làm việc {idx + 1}
                    </span>
                  </div>

                  {jobAddresses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAddressItem(idx)}
                      className="p-1.5 text-[#6e7977] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/60 rounded-xl transition-colors"
                      title="Xóa địa điểm này"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Cột 1: Tỉnh / Thành phố */}
                  <div>
                    <label className="text-[11px] font-bold text-[#131b2e] block mb-1">
                      Tỉnh / Thành phố <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <select
                      value={addr.provinceId || ''}
                      onChange={(e) => updateAddressItem(idx, 'provinceId', e.target.value)}
                      disabled={loadingProvinces}
                      className="w-full p-2.5 bg-white rounded-xl outline-none border border-[#eaedff] focus:border-[#005c55] font-semibold text-xs cursor-pointer transition-colors"
                    >
                      <option value="">-- Chọn Tỉnh / Thành phố --</option>
                      {provinces.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cột 2 + 3: Địa chỉ chi tiết */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-[#131b2e] block mb-1">
                      Địa chỉ chi tiết (Tòa nhà, số nhà, ngõ/đường, phường/xã)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Tầng 6, Keangnam Landmark 72, Mễ Trì, Nam Từ Liêm..."
                      value={addr.addressDetail || ''}
                      onChange={(e) => updateAddressItem(idx, 'addressDetail', e.target.value)}
                      maxLength={255}
                      className="w-full p-2.5 bg-white rounded-xl outline-none border border-[#eaedff] focus:border-[#005c55] font-medium text-xs transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PHẦN 3: NỘI DUNG CHI TIẾT TIN TUYỂN DỤNG (Bảng: job_details) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 bg-[#006c4e] rounded-full" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  3. Nội dung chi tiết tin tuyển dụng
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tạo các mục: Mô tả công việc, Yêu cầu ứng viên, Quyền lợi... để ứng viên nắm rõ công việc.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addJobDetail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-xs font-bold text-[#005c55] transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Thêm mục nội dung</span>
            </button>
          </div>

          <div className="space-y-4">
            {jobDetails.map((detail, idx) => (
              <div
                key={detail.id ?? idx}
                className="p-5 bg-[#faf8ff] rounded-2xl border border-[#eaedff] space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-[#005c55]/10 text-[#005c55] flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      required
                      value={detail.title}
                      onChange={(e) => updateJobDetailItem(idx, 'title', e.target.value)}
                      placeholder="Tiêu đề mục chi tiết (VD: Mô tả công việc, Yêu cầu ứng viên, Quyền lợi...)"
                      className="w-full p-2.5 bg-white font-bold text-xs sm:text-sm text-[#131b2e] rounded-xl border border-[#eaedff] outline-none focus:border-[#005c55] transition-colors"
                    />
                  </div>

                  {jobDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeJobDetail(idx)}
                      className="p-2 text-[#6e7977] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/60 rounded-xl transition-colors shrink-0"
                      title="Xóa mục này"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>

                <RichTextEditor
                  content={detail.content}
                  onChange={(html) => updateJobDetailItem(idx, 'content', html)}
                  placeholder="Nhập nội dung chi tiết cho mục này. Sử dụng thanh công cụ để định dạng, chèn danh sách, màu sắc, liên kết hoặc bảng..."
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls: Phân biệt rõ Lưu nháp vs Đăng tin */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          {/* Nút Hủy */}
          <button
            type="button"
            onClick={() => navigate('/recruiter/jobs')}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-2xl bg-[#eaedff] hover:bg-[#dae2fd] text-[#131b2e] font-bold text-xs sm:text-sm transition-colors text-center disabled:opacity-50"
          >
            Hủy bỏ
          </button>

          {/* Nút Lưu bản nháp (draft) */}
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSubmitting || noCompanyWarning}
            className="px-6 py-3 rounded-2xl bg-white border-2 border-[#005c55] text-[#005c55] hover:bg-[#f2f3ff] font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">draft</span>
            <span>{isSubmitting ? 'Đang lưu...' : 'Lưu bản nháp'}</span>
          </button>

          {/* Nút Đăng tin tuyển dụng (Gửi duyệt) */}
          <button
            type="button"
            onClick={() => handleSave('open')}
            disabled={isSubmitting || noCompanyWarning}
            className="px-8 py-3 rounded-2xl bg-[#005c55] hover:bg-[#007952] text-white font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98]"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isEditing ? 'save' : 'send'}
            </span>
            <span>
              {isSubmitting
                ? 'Đang kiểm duyệt AI & lưu...'
                : isEditing
                ? 'Cập nhật & Gửi duyệt'
                : 'Đăng tin (Gửi duyệt)'}
            </span>
          </button>
        </div>
        <p className="text-[11px] text-[#6e7977] text-right mt-2 italic">
          * Mọi tin tuyển dụng khi đăng sẽ được AI quét kiểm duyệt và chuyển đến Quản trị viên phê duyệt trước khi hiển thị công khai.
        </p>
      </form>
    </div>
  );
}
