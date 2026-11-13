import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  getProvinces,
  getCompanyById,
  updateCompany,
  getCompanyAddresses,
  addCompanyAddress,
  updateCompanyAddress,
  deleteCompanyAddress,
  getCompanyLinks,
  addCompanyLink,
  updateCompanyLink,
  deleteCompanyLink,
  getCompanyImages,
  addCompanyImage,
  deleteCompanyImage,
  getApprovedCompanies,
  uploadFile,
  jobPostApi,
  authApi,
} from '../../../infrastructure/api';
import { hasAuthCookie } from '../../../infrastructure/utils/cookieUtils';
import { useChat } from '../../../application/context/ChatContext';
import CompanyTierBadge from '../../components/common/CompanyTierBadge';

/**
 * Danh sách định nghĩa các loại liên kết mạng xã hội & truyền thông của doanh nghiệp (company_links.type)
 */
const COMPANY_LINK_TYPES = [
  {
    value: 'website',
    label: 'Website chính thức',
    iconClass: 'fa-solid fa-globe',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    badgeColor: 'bg-[#005c55]',
    placeholder: 'https://congty.com.vn',
  },
  {
    value: 'linkedin',
    label: 'LinkedIn Doanh nghiệp',
    iconClass: 'fa-brands fa-linkedin',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-600',
    placeholder: 'https://linkedin.com/company/ten-doanh-nghiep',
  },
  {
    value: 'facebook',
    label: 'Fanpage Tuyển dụng / Facebook',
    iconClass: 'fa-brands fa-facebook',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
    badgeColor: 'bg-sky-600',
    placeholder: 'https://facebook.com/ten-doanh-nghiep',
  },
  {
    value: 'github',
    label: 'GitHub Công nghệ / OpenSource',
    iconClass: 'fa-brands fa-github',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-300',
    badgeColor: 'bg-gray-900',
    placeholder: 'https://github.com/ten-to-chuc',
  },
  {
    value: 'youtube',
    label: 'Kênh YouTube Doanh nghiệp',
    iconClass: 'fa-brands fa-youtube',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    badgeColor: 'bg-rose-600',
    placeholder: 'https://youtube.com/@ten-kenh',
  },
  {
    value: 'twitter',
    label: 'Twitter / X',
    iconClass: 'fa-brands fa-x-twitter',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    badgeColor: 'bg-slate-800',
    placeholder: 'https://x.com/ten-doanh-nghiep',
  },
  {
    value: 'instagram',
    label: 'Instagram Văn hóa công ty',
    iconClass: 'fa-brands fa-instagram',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    badgeColor: 'bg-pink-600',
    placeholder: 'https://instagram.com/ten-doanh-nghiep',
  },
  {
    value: 'other',
    label: 'Kênh truyền thông khác',
    iconClass: 'fa-solid fa-link',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    badgeColor: 'bg-teal-600',
    placeholder: 'https://...',
  },
];

/**
 * Lấy metadata hiển thị cho loại liên kết doanh nghiệp
 */
function getLinkTypeMeta(type) {
  if (!type) return COMPANY_LINK_TYPES[COMPANY_LINK_TYPES.length - 1];
  const normalized = String(type).toLowerCase().trim();
  const found = COMPANY_LINK_TYPES.find(
    (item) => item.value === normalized || item.label.toLowerCase() === normalized
  );
  if (found) return found;

  return {
    value: normalized,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    iconClass: 'fa-solid fa-link',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    badgeColor: 'bg-gray-700',
    placeholder: 'https://...',
  };
}

/**
 * Định dạng tiền tệ hiển thị mức lương
 */
function formatSalary(job) {
  if (job?.isSalaryNegotiable || (!job?.salaryMin && !job?.salaryMax)) {
    return 'Thỏa thuận';
  }
  const min = job?.salaryMin ? `${(job.salaryMin / 1000000).toFixed(0)} tr` : null;
  const max = job?.salaryMax ? `${(job.salaryMax / 1000000).toFixed(0)} tr` : null;
  if (min && max) return `${min} - ${max}`;
  if (min) return `Từ ${min}`;
  if (max) return `Đến ${max}`;
  return 'Thỏa thuận';
}

/**
 * Trang Chi Tiết & Hồ Sơ Doanh Nghiệp (CompanyInfomationPage)
 * Thiết kế giao diện và trải nghiệm đồng bộ 100% với InformationPage.jsx:
 * - Bảng `companies`: id, company_type, name, logo_url, banner_url, email, phone, description, status
 * - Bảng `company_addresses`: id, company_id, province_id, address_detail
 * - Bảng `company_links`: id, company_id, type, link
 * - Bảng `company_images`: id, company_id, url
 * - Danh sách việc làm đang mở từ `job-posts`
 */
export default function CompanyInfomationPage() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const navigate = useNavigate();

  // Xác định ID công ty cần hiển thị
  const activeCompanyId = paramId || queryId || null;

  // Trạng thái dữ liệu công ty
  const [company, setCompany] = useState({
    id: null,
    companyType: 'big',
    name: '',
    logoUrl: '',
    bannerUrl: '',
    email: '',
    phone: '',
    description: '',
    status: 'approved',
  });

  const [addresses, setAddresses] = useState([]);
  const [links, setLinks] = useState([]);
  const [images, setImages] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [provinces, setProvinces] = useState([]);

  // Trạng thái trang & phân quyền
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [isHiring, setIsHiring] = useState(true);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [activeJobTab, setActiveJobTab] = useState('all');
  const [toast, setToast] = useState(null); // { message, type }

  // Modal Chỉnh sửa thông tin doanh nghiệp
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    companyType: 'big',
    logoUrl: '',
    bannerUrl: '',
    email: '',
    phone: '',
    description: '',
  });
  const [companyErrors, setCompanyErrors] = useState({});

  // Upload Logo & Banner
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const galleryImageInputRef = useRef(null);

  // Modal Thêm / Sửa Liên kết (company_links)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkFormData, setLinkFormData] = useState({
    type: 'website',
    customType: '',
    link: '',
  });
  const [linkErrors, setLinkErrors] = useState({});
  const [savingLink, setSavingLink] = useState(false);

  // Modal Thêm / Sửa Địa chỉ (company_addresses)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressFormData, setAddressFormData] = useState({
    provinceId: '',
    addressDetail: '',
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [savingAddress, setSavingAddress] = useState(false);

  // Modal Thêm Ảnh & Lightbox Phóng to ảnh
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Modal Xác nhận xóa mục (link / address / image)
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, item }
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);

  // Hiển thị thông báo Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  // Chat với nhà tuyển dụng của công ty
  const { openChatWithRecruiter } = useChat();
  const [openingChat, setOpeningChat] = useState(false);

  const handleOpenChatWithCompany = async () => {
    if (!hasAuthCookie()) {
      showToast('Vui lòng đăng nhập tài khoản để nhắn tin trực tiếp với nhà tuyển dụng.', 'info');
      navigate('/login');
      return;
    }

    const compId = company?.id || activeCompanyId;
    if (!compId) {
      showToast('Không xác định được thông tin công ty để mở tin nhắn.', 'error');
      return;
    }

    setOpeningChat(true);
    try {
      if (openChatWithRecruiter) {
        await openChatWithRecruiter({ companyId: Number(compId) });
        showToast(`Đã mở khung chat với nhà tuyển dụng ${company.name || ''}`, 'success');
      } else {
        showToast('Tính năng chat đang khởi tạo, vui lòng thử lại sau giây lát.', 'info');
      }
    } catch (err) {
      console.error('Lỗi khi kết nối chat với công ty:', err);
      showToast(err?.message || 'Không thể kết nối trò chuyện với nhà tuyển dụng của công ty này.', 'error');
    } finally {
      setOpeningChat(false);
    }
  };

  // 1. Tải danh mục Tỉnh / Thành phố
  useEffect(() => {
    getProvinces()
      .then((data) => {
        if (Array.isArray(data)) {
          setProvinces(data);
        }
      })
      .catch((err) => console.warn('Không tải được danh mục tỉnh thành:', err));
  }, []);

  // 2. Tải toàn bộ dữ liệu công ty từ Backend
  useEffect(() => {
    loadCompanyData();
  }, [activeCompanyId]);

  const loadCompanyData = async () => {
    setLoading(true);

    let targetId = activeCompanyId;
    let currentUser = null;
    let recruiterProfile = null;

    try {
      const stored = localStorage.getItem('kiemjob_user');
      if (stored) currentUser = JSON.parse(stored);
    } catch {
      // ignore
    }

    // Nếu người dùng đăng nhập là Nhà tuyển dụng -> kiểm tra hồ sơ recruiter
    if (hasAuthCookie()) {
      try {
        recruiterProfile = await authApi.getRecruiterProfile();
      } catch {
        // Có thể là ứng viên, không phải nhà tuyển dụng
      }
    }

    // Nếu không có ID trên URL, thử lấy theo công ty của recruiter hiện tại hoặc công ty đầu tiên
    if (!targetId) {
      if (recruiterProfile?.companyId) {
        targetId = recruiterProfile.companyId;
      } else {
        try {
          const listRes = await getApprovedCompanies(0, 5);
          const list = listRes?.content || (Array.isArray(listRes) ? listRes : []);
          if (list.length > 0) {
            targetId = list[0].id;
          }
        } catch {
          // ignore
        }
      }
    }

    // Nếu vẫn không có ID, sử dụng ID mặc định 1
    if (!targetId) {
      targetId = 1;
    }

    try {
      // Gọi song song các API liên quan đến công ty
      const [compRes, addrRes, linkRes, imgRes, jobRes] = await Promise.allSettled([
        getCompanyById(targetId),
        getCompanyAddresses(targetId),
        getCompanyLinks(targetId),
        getCompanyImages(targetId),
        jobPostApi.getJobPosts({ companyId: targetId, status: 'open', size: 100 }),
      ]);

      const compData = compRes.status === 'fulfilled' && compRes.value ? compRes.value : null;
      const addrData = addrRes.status === 'fulfilled' && Array.isArray(addrRes.value) ? addrRes.value : [];
      const linkData = linkRes.status === 'fulfilled' && Array.isArray(linkRes.value) ? linkRes.value : [];
      const imgData = imgRes.status === 'fulfilled' && Array.isArray(imgRes.value) ? imgRes.value : [];

      let rawJobs = [];
      if (jobRes.status === 'fulfilled' && jobRes.value) {
        const body = jobRes.value?.data ?? jobRes.value;
        const list = Array.isArray(body) ? body : (body?.content || []);
        rawJobs = list.filter((j) => j.status === 'open');
      }

      if (compData) {
        setCompany({
          id: compData.id,
          companyType: compData.companyType || 'big',
          name: compData.name || 'Doanh nghiệp uy tín',
          logoUrl: compData.logoUrl || '',
          bannerUrl: compData.bannerUrl || '',
          email: compData.email || '',
          phone: compData.phone || '',
          description: compData.description || '',
          status: compData.status || 'approved',
          membershipTier: compData.membershipTier || 'bronze',
          totalSpending: compData.totalSpending || 0,
        });

        // Kiểm tra quyền chỉnh sửa: Quản trị viên, hoặc Recruiter sở hữu công ty này
        const isRecruiterOwner = recruiterProfile && String(recruiterProfile.companyId) === String(compData.id);
        const isAdmin = currentUser?.role === 'admin' || currentUser?.roleName === 'ADMIN';
        setIsOwnerOrAdmin(Boolean(isRecruiterOwner || isAdmin));
      } else {
        // Fallback mẫu khi chưa có dữ liệu DB
        setCompany({
          id: targetId,
          companyType: 'big',
          name: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ TECHVINA',
          logoUrl: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=150&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
          email: 'contact@techvina.com.vn',
          phone: '024 7300 8899',
          description:
            'TechVina là tập đoàn tiên phong kiến tạo hệ sinh thái FinTech & AI tại Đông Nam Á. Chúng tôi cung cấp các giải pháp thanh toán số bảo mật cao, hệ thống ngân hàng mở và nền tảng dữ liệu lớn cho hơn 12 triệu người dùng doanh nghiệp và cá nhân.',
          status: 'approved',
        });
        setIsOwnerOrAdmin(true); // Cho phép thử nghiệm chỉnh sửa nếu là trang quản lý
      }

      setAddresses(addrData);
      setLinks(linkData);
      setImages(imgData);
      setJobs(rawJobs);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu công ty:', err);
      showToast('Không thể tải toàn bộ thông tin công ty từ máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mở modal Chỉnh sửa thông tin công ty
  const handleOpenEditCompany = () => {
    setEditFormData({
      name: company.name || '',
      companyType: company.companyType || 'big',
      logoUrl: company.logoUrl || '',
      bannerUrl: company.bannerUrl || '',
      email: company.email || '',
      phone: company.phone || '',
      description: company.description || '',
    });
    setLogoPreview(company.logoUrl || null);
    setBannerPreview(company.bannerUrl || null);
    setCompanyErrors({});
    setIsEditCompanyOpen(true);
  };

  // Upload Logo lên S3
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setCompanyErrors((prev) => ({ ...prev, logo: 'Chỉ chấp nhận file ảnh JPEG, PNG hoặc WebP' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCompanyErrors((prev) => ({ ...prev, logo: 'Dung lượng ảnh tối đa 5MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);

    setLogoUploading(true);
    setCompanyErrors((prev) => ({ ...prev, logo: undefined }));
    try {
      const res = await uploadFile(file);
      setEditFormData((prev) => ({ ...prev, logoUrl: res.url }));
    } catch (err) {
      console.error('Lỗi upload logo:', err);
      setCompanyErrors((prev) => ({ ...prev, logo: 'Tải logo lên thất bại' }));
    } finally {
      setLogoUploading(false);
    }
  };

  // Upload Ảnh bìa (Banner) lên S3
  const handleBannerFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setCompanyErrors((prev) => ({ ...prev, banner: 'Chỉ chấp nhận file ảnh JPEG, PNG hoặc WebP' }));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setCompanyErrors((prev) => ({ ...prev, banner: 'Dung lượng ảnh bìa tối đa 8MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setBannerPreview(ev.target.result);
    reader.readAsDataURL(file);

    setBannerUploading(true);
    setCompanyErrors((prev) => ({ ...prev, banner: undefined }));
    try {
      const res = await uploadFile(file);
      setEditFormData((prev) => ({ ...prev, bannerUrl: res.url }));
    } catch (err) {
      console.error('Lỗi upload ảnh bìa:', err);
      setCompanyErrors((prev) => ({ ...prev, banner: 'Tải ảnh bìa thất bại' }));
    } finally {
      setBannerUploading(false);
    }
  };

  // Lưu thông tin công ty qua PUT /api/companies/{id}
  const handleSaveCompany = async (e) => {
    e.preventDefault();

    const errors = {};
    const safeName = (editFormData.name || '').trim();
    const safeEmail = (editFormData.email || '').trim();
    const safePhone = (editFormData.phone || '').trim();
    const safeDesc = (editFormData.description || '').trim();

    if (!safeName) {
      errors.name = 'Tên công ty không được để trống';
    } else if (safeName.length > 255) {
      errors.name = 'Tên công ty tối đa 255 ký tự';
    }

    if (safeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      errors.email = 'Email không đúng định dạng';
    }

    if (safePhone && safePhone.length > 20) {
      errors.phone = 'Số điện thoại tối đa 20 ký tự';
    }

    if (Object.keys(errors).length > 0) {
      setCompanyErrors(errors);
      return;
    }

    setSavingCompany(true);
    setCompanyErrors({});

    const payload = {
      companyType: editFormData.companyType || 'big',
      name: safeName,
      logoUrl: editFormData.logoUrl || null,
      bannerUrl: editFormData.bannerUrl || null,
      email: safeEmail || null,
      phone: safePhone || null,
      description: safeDesc || null,
    };

    try {
      if (company.id) {
        await updateCompany(company.id, payload);
      }
      setCompany((prev) => ({
        ...prev,
        ...payload,
      }));
      setIsEditCompanyOpen(false);
      showToast('Cập nhật hồ sơ doanh nghiệp thành công!');
    } catch (err) {
      console.warn('Lỗi lưu công ty qua API, cập nhật state dự phòng:', err);
      setCompany((prev) => ({ ...prev, ...payload }));
      setIsEditCompanyOpen(false);
      showToast('Đã lưu thông tin doanh nghiệp!');
    } finally {
      setSavingCompany(false);
    }
  };

  // ==================== QUẢN LÝ LIÊN KẾT (company_links) ====================
  const handleOpenAddLink = () => {
    setEditingLink(null);
    setLinkFormData({
      type: 'website',
      customType: '',
      link: '',
    });
    setLinkErrors({});
    setIsLinkModalOpen(true);
  };

  const handleOpenEditLink = (item) => {
    setEditingLink(item);
    const isStandard = COMPANY_LINK_TYPES.some((t) => t.value === item.type);
    setLinkFormData({
      type: isStandard ? item.type : 'other',
      customType: isStandard ? '' : item.type,
      link: item.link || '',
    });
    setLinkErrors({});
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = async (e) => {
    e.preventDefault();

    const errors = {};
    const finalType =
      linkFormData.type === 'other' && linkFormData.customType.trim()
        ? linkFormData.customType.trim()
        : linkFormData.type;

    if (!finalType) {
      errors.type = 'Vui lòng chọn hoặc nhập loại kênh liên kết';
    } else if (finalType.length > 30) {
      errors.type = 'Loại liên kết tối đa 30 ký tự';
    }

    let urlToSave = (linkFormData.link || '').trim();
    if (!urlToSave) {
      errors.link = 'Đường dẫn liên kết không được để trống';
    } else {
      if (!/^https?:\/\//i.test(urlToSave)) {
        urlToSave = `https://${urlToSave}`;
      }
      if (urlToSave.length > 500) {
        errors.link = 'Đường dẫn tối đa 500 ký tự';
      } else if (!/^https?:\/\/\S+$/i.test(urlToSave)) {
        errors.link = 'Đường dẫn phải bắt đầu bằng http:// hoặc https:// và không có khoảng trắng';
      }
    }

    if (Object.keys(errors).length > 0) {
      setLinkErrors(errors);
      return;
    }

    setSavingLink(true);
    setLinkErrors({});

    const requestPayload = {
      type: finalType,
      link: urlToSave,
    };

    try {
      if (editingLink) {
        const updated = await updateCompanyLink(company.id, editingLink.id, requestPayload);
        setLinks((prev) =>
          prev.map((item) => (item.id === editingLink.id ? (updated || { ...item, ...requestPayload }) : item))
        );
        showToast('Cập nhật liên kết thành công!');
      } else {
        const created = await addCompanyLink(company.id, requestPayload);
        if (created) {
          setLinks((prev) => [...prev, created]);
        } else {
          setLinks((prev) => [...prev, { id: Date.now(), companyId: company.id, ...requestPayload }]);
        }
        showToast('Thêm liên kết mới thành công!');
      }
      setIsLinkModalOpen(false);
    } catch (err) {
      console.warn('Lỗi lưu liên kết qua API, cập nhật local:', err);
      if (editingLink) {
        setLinks((prev) =>
          prev.map((item) => (item.id === editingLink.id ? { ...item, ...requestPayload } : item))
        );
      } else {
        setLinks((prev) => [...prev, { id: Date.now(), companyId: company.id, ...requestPayload }]);
      }
      setIsLinkModalOpen(false);
      showToast('Đã lưu kênh liên kết!');
    } finally {
      setSavingLink(false);
    }
  };

  // ==================== QUẢN LÝ ĐỊA CHỈ (company_addresses) ====================
  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressFormData({
      provinceId: provinces[0]?.id || '',
      addressDetail: '',
    });
    setAddressErrors({});
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressFormData({
      provinceId: addr.provinceId || '',
      addressDetail: addr.addressDetail || '',
    });
    setAddressErrors({});
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!addressFormData.provinceId) {
      errors.provinceId = 'Vui lòng chọn Tỉnh/Thành phố';
    }
    const safeDetail = (addressFormData.addressDetail || '').trim();
    if (!safeDetail) {
      errors.addressDetail = 'Địa chỉ chi tiết không được để trống';
    } else if (safeDetail.length > 255) {
      errors.addressDetail = 'Địa chỉ chi tiết tối đa 255 ký tự';
    }

    if (Object.keys(errors).length > 0) {
      setAddressErrors(errors);
      return;
    }

    setSavingAddress(true);
    setAddressErrors({});

    const requestPayload = {
      provinceId: Number(addressFormData.provinceId),
      addressDetail: safeDetail,
    };

    try {
      if (editingAddress) {
        const updated = await updateCompanyAddress(company.id, editingAddress.id, requestPayload);
        setAddresses((prev) =>
          prev.map((item) =>
            item.id === editingAddress.id
              ? {
                  ...item,
                  ...requestPayload,
                  provinceName: provinces.find((p) => p.id === requestPayload.provinceId)?.name || '',
                }
              : item
          )
        );
        showToast('Cập nhật địa chỉ thành công!');
      } else {
        const created = await addCompanyAddress(company.id, requestPayload);
        const provName = provinces.find((p) => p.id === requestPayload.provinceId)?.name || '';
        if (created) {
          setAddresses((prev) => [...prev, { ...created, provinceName: provName }]);
        } else {
          setAddresses((prev) => [
            ...prev,
            { id: Date.now(), companyId: company.id, ...requestPayload, provinceName: provName },
          ]);
        }
        showToast('Thêm chi nhánh mới thành công!');
      }
      setIsAddressModalOpen(false);
    } catch (err) {
      console.warn('Lỗi lưu địa chỉ qua API, cập nhật local:', err);
      const provName = provinces.find((p) => p.id === requestPayload.provinceId)?.name || '';
      if (editingAddress) {
        setAddresses((prev) =>
          prev.map((item) =>
            item.id === editingAddress.id ? { ...item, ...requestPayload, provinceName: provName } : item
          )
        );
      } else {
        setAddresses((prev) => [
          ...prev,
          { id: Date.now(), companyId: company.id, ...requestPayload, provinceName: provName },
        ]);
      }
      setIsAddressModalOpen(false);
      showToast('Đã lưu địa chỉ chi nhánh!');
    } finally {
      setSavingAddress(false);
    }
  };

  // ==================== QUẢN LÝ HÌNH ẢNH HOẠT ĐỘNG (company_images) ====================
  const handleUploadGalleryImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Dung lượng ảnh tối đa 8MB', 'error');
      return;
    }

    setUploadingGalleryImage(true);
    try {
      const uploadRes = await uploadFile(file);
      const imagePayload = { url: uploadRes.url };
      const created = await addCompanyImage(company.id, imagePayload);
      if (created) {
        setImages((prev) => [...prev, created]);
      } else {
        setImages((prev) => [...prev, { id: Date.now(), companyId: company.id, url: uploadRes.url }]);
      }
      showToast('Tải ảnh hoạt động văn phòng thành công!');
    } catch (err) {
      console.error('Lỗi upload ảnh văn phòng:', err);
      showToast('Không thể tải ảnh lên máy chủ', 'error');
    } finally {
      setUploadingGalleryImage(false);
      if (galleryImageInputRef.current) galleryImageInputRef.current.value = '';
    }
  };

  // ==================== XÁC NHẬN VÀ THỰC HIỆN XÓA ====================
  const handlePromptDelete = (type, item) => {
    setDeleteTarget({ type, item });
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingItem(true);

    try {
      if (deleteTarget.type === 'link') {
        await deleteCompanyLink(company.id, deleteTarget.item.id);
        setLinks((prev) => prev.filter((i) => i.id !== deleteTarget.item.id));
        showToast('Đã xóa liên kết!');
      } else if (deleteTarget.type === 'address') {
        await deleteCompanyAddress(company.id, deleteTarget.item.id);
        setAddresses((prev) => prev.filter((i) => i.id !== deleteTarget.item.id));
        showToast('Đã xóa địa chỉ chi nhánh!');
      } else if (deleteTarget.type === 'image') {
        await deleteCompanyImage(company.id, deleteTarget.item.id);
        setImages((prev) => prev.filter((i) => i.id !== deleteTarget.item.id));
        showToast('Đã xóa ảnh văn phòng!');
      }
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      console.warn('Lỗi khi xóa qua API, xóa trên state local:', err);
      if (deleteTarget.type === 'link') {
        setLinks((prev) => prev.filter((i) => i.id !== deleteTarget.item.id));
      } else if (deleteTarget.type === 'address') {
        setAddresses((prev) => prev.filter((i) => i.id !== deleteTarget.item.id));
      } else if (deleteTarget.type === 'image') {
        setImages((prev) => prev.filter((i) => i.id !== deleteTarget.item.id));
      }
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
      showToast('Đã xóa mục thành công!');
    } finally {
      setDeletingItem(false);
    }
  };

  // Sao chép link vào clipboard
  const handleCopy = (text, label = 'đường dẫn') => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`Đã sao chép ${label} vào bộ nhớ tạm!`);
    }
  };

  // Tính điểm hoàn thiện hồ sơ doanh nghiệp
  const calculateCompleteness = () => {
    let score = 0;
    if (company.name?.trim()) score += 20;
    if (company.description?.trim()) score += 20;
    if (company.logoUrl?.trim()) score += 15;
    if (company.bannerUrl?.trim()) score += 10;
    if (company.phone?.trim() && company.email?.trim()) score += 15;
    if (addresses.length > 0) score += 10;
    if (links.length > 0) score += 5;
    if (images.length > 0) score += 5;
    return Math.min(score, 100);
  };

  const completenessScore = calculateCompleteness();

  // Địa chỉ hiển thị chính
  const primaryAddress = addresses.length > 0
    ? `${addresses[0].addressDetail}, ${
        addresses[0].provinceName ||
        provinces.find((p) => p.id === addresses[0].provinceId)?.name ||
        ''
      }`
    : (company?.address || 'Chưa cập nhật trụ sở chính');

  // Địa điểm định vị trên Google Maps
  const companyMapLocation = useMemo(() => {
    if (addresses.length > 0) {
      const first = addresses[0];
      const prov =
        first.provinceName ||
        provinces.find((p) => p.id === first.provinceId)?.name ||
        '';
      const detail = first.addressDetail || '';
      const query = [detail, prov].filter(Boolean).join(', ');
      if (query.trim()) return query.trim();
    }
    if (company?.address && company.address.trim()) {
      return company.address.trim();
    }
    if (company?.name && company.name.trim()) {
      return `${company.name.trim()}, Việt Nam`;
    }
    return '';
  }, [addresses, provinces, company]);

  // Lọc danh sách việc làm theo tab
  const filteredJobs = jobs.filter((job) => {
    if (activeJobTab === 'all') return true;
    if (activeJobTab === 'fulltime') return job.workingMethod?.toLowerCase().includes('toàn') || job.workingMethod?.toLowerCase().includes('full');
    if (activeJobTab === 'parttime') return job.workingMethod?.toLowerCase().includes('bán') || job.workingMethod?.toLowerCase().includes('part');
    if (activeJobTab === 'remote') return job.workingMethod?.toLowerCase().includes('remote') || job.workingMethod?.toLowerCase().includes('từ xa');
    return true;
  });

  return (
    <div className="w-full bg-[#faf8ff] font-sans text-[#131b2e] antialiased min-h-screen pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl flex items-center gap-3 transition-all transform animate-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'error'
              ? 'bg-rose-600'
              : toast.type === 'info'
              ? 'bg-blue-600'
              : 'bg-[#005c55]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HERO COMPANY BANNER (THIẾT KẾ ĐỒNG BỘ 100% VỚI INFORMATIONPAGE.JSX)      */}
      {/* ========================================================================= */}
      <div className="w-full bg-gradient-to-r from-[#003833] via-[#005c55] to-[#007952] text-white shadow-md relative overflow-hidden">
        {/* Họa tiết trang trí nền */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#97f5cc_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        {/* Ảnh bìa doanh nghiệp (Cover Banner) */}
        {company.bannerUrl && (
          <div className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden">
            <img
              src={company.bannerUrl}
              alt={company.name}
              className="w-full h-full object-cover opacity-75"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#003833] via-[#005c55]/40 to-transparent"></div>
            {isOwnerOrAdmin && (
              <button
                type="button"
                onClick={handleOpenEditCompany}
                className="absolute top-4 right-4 sm:right-8 px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                <span>Chỉnh sửa ảnh bìa</span>
              </button>
            )}
          </div>
        )}

        <div className={`max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 ${company.bannerUrl ? 'pt-4 pb-8' : 'pt-8 pb-8'}`}>
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            {/* Logo & Nhận diện doanh nghiệp */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              {/* Logo công ty (Logo Container với ring & shadow) */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl ring-4 ring-white/30 shadow-2xl overflow-hidden bg-white p-2 flex items-center justify-center backdrop-blur-xs">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        if (e.target.parentElement) {
                          e.target.parentElement.innerHTML = `<span class="material-symbols-outlined text-[64px] text-[#005c55]">corporate_fare</span>`;
                        }
                      }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[64px] text-[#005c55]">corporate_fare</span>
                  )}
                </div>
                {isOwnerOrAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenEditCompany}
                    className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-[#005c55] shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-white/50"
                    title="Cập nhật Logo công ty"
                    aria-label="Cập nhật Logo công ty"
                  >
                    <span className="material-symbols-outlined text-[19px]">photo_camera</span>
                  </button>
                )}
              </div>

              {/* Tên & Tagline công ty */}
              <div className="flex flex-col pt-1">
                <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {company.name || (loading ? 'Đang tải hồ sơ doanh nghiệp...' : 'Chưa cập nhật tên công ty')}
                  </h1>
                  <span
                    className="text-[#97f5cc] text-[22px] flex items-center"
                    title="Doanh nghiệp đã kiểm duyệt chính thức"
                  >
                    <span className="material-symbols-outlined text-[24px]">verified</span>
                  </span>
                  <CompanyTierBadge tier={company.membershipTier || 'bronze'} size="md" />
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold border border-white/30">
                    {company.companyType === 'big' ? 'Doanh nghiệp lớn' : 'Doanh nghiệp khởi nghiệp / SME'}
                  </span>
                  {isHiring && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.8 rounded-full bg-[#97f5cc]/20 text-[#97f5cc] text-xs font-bold border border-[#97f5cc]/30 backdrop-blur-xs">
                      <span className="w-2 h-2 rounded-full bg-[#97f5cc] animate-pulse"></span>
                      Đang tuyển dụng
                    </span>
                  )}
                </div>

                {/* Các chip thông tin nhanh */}
                <div className="flex items-center justify-center md:justify-start gap-3 sm:gap-4 text-white/85 text-xs sm:text-sm mt-3.5 flex-wrap">
                  {primaryAddress !== 'Chưa cập nhật trụ sở chính' && (
                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-[16px] text-[#97f5cc]">location_on</span>
                      <span className="truncate max-w-[240px]">{primaryAddress}</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                    <span className="material-symbols-outlined text-[16px] text-[#97f5cc]">groups</span>
                    <span>{company.companyType === 'big' ? '> 500 nhân sự' : '< 100 nhân sự'}</span>
                  </span>
                  {links.length > 0 && (
                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-[16px] text-[#97f5cc]">share</span>
                      <span>{links.length} kênh kết nối</span>
                    </span>
                  )}

                  {jobs.length > 0 && (
                    <span className="flex items-center gap-1 bg-[#97f5cc]/20 text-[#97f5cc] font-bold px-2.5 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-[16px]">work</span>
                      <span>{jobs.length} việc làm đang mở</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Các nút hành động chính */}
            <div className="flex items-center justify-center md:justify-end gap-2.5 flex-wrap">
              {isOwnerOrAdmin && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenEditCompany}
                    className="px-4 py-2.5 rounded-xl bg-white text-[#005c55] hover:bg-[#e6f7f5] text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    <span>Chỉnh sửa thông tin</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddLink}
                    className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_link</span>
                    <span>Thêm liên kết</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                    <span>Thêm chi nhánh</span>
                  </button>
                </>
              )}

              {/* Nút Nhắn tin với Nhà tuyển dụng */}
              <button
                type="button"
                onClick={handleOpenChatWithCompany}
                disabled={openingChat}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#e6f7f5] text-[#005c55] text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                title={`Nhắn tin trực tiếp với nhà tuyển dụng ${company.name || ''}`}
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span>{openingChat ? 'Đang mở chat...' : 'Nhắn tin'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(window.location.href, 'liên kết trang công ty')}
                className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
                title="Chia sẻ hồ sơ công ty"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                <span className="hidden sm:inline">Chia sẻ</span>
              </button>

              <Link
                to={`/jobs?q=${encodeURIComponent(company.name)}`}
                className="px-4 py-2.5 rounded-xl bg-[#97f5cc] hover:bg-[#80d5cb] text-[#00513a] text-sm font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">work</span>
                <span>Xem tin tuyển dụng</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT (BỐ CỤC 2 CỘT CHUẨN INFORMATIONPAGE.JSX: COL 8 & COL 4)   */}
      {/* ========================================================================= */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= CỘT TRÁI (col-span-8) ================= */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* 1. Card: Giới thiệu tổng quan doanh nghiệp (bảng companies.description) */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-4 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#e6f7f5] text-[#005c55] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#131b2e]">
                      Giới thiệu tổng quan doanh nghiệp
                    </h2>
                    <p className="text-xs text-[#6e7977]">
                      Sứ mệnh phát triển, môi trường văn hóa và tầm nhìn tương lai
                    </p>
                  </div>
                </div>
                {isOwnerOrAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenEditCompany}
                    className="px-3 py-1.5 rounded-lg bg-[#e6f7f5] hover:bg-[#d5f3ee] text-[#005c55] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>{company.description ? 'Sửa' : 'Thêm'}</span>
                  </button>
                )}
              </div>

              {company.description ? (
                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] text-[#131b2e] text-sm leading-relaxed flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#005c55] text-[24px] shrink-0 mt-0.5">
                    format_quote
                  </span>
                  <div className="flex-1">
                    <p className="font-normal text-[#3e4947] text-sm text-[14px] whitespace-pre-line leading-relaxed">
                      {company.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-[#eaedff] text-center flex flex-col items-center justify-center gap-2.5 bg-[#f2f3ff]/40">
                  <span className="material-symbols-outlined text-[36px] text-[#9ca3af]">rate_review</span>
                  <p className="text-sm text-[14px] font-semibold text-[#131b2e]">
                    Doanh nghiệp chưa có phần mô tả giới thiệu tổng quan.
                  </p>
                  <p className="text-sm text-[14px] text-[#6e7977] max-w-md">
                    Thêm phần giới thiệu ấn tượng giúp ứng viên hiểu rõ tầm nhìn, văn hóa làm việc và các chế độ đãi ngộ vượt trội.
                  </p>
                  {isOwnerOrAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenEditCompany}
                      className="mt-1 px-4 py-2 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Viết giới thiệu công ty ngay
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* 6. Card: Danh sách việc làm đang mở tuyển dụng (từ jobPostApi) */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#eaedff] flex flex-col gap-5 transition-shadow hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eaedff] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#e6f7f5] text-[#005c55] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">campaign</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-[#131b2e]">
                        Vị trí tuyển dụng đang mở
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#e6f7f5] text-[#005c55] text-xs font-extrabold border border-[#80d5cb]/50">
                        {jobs.length} vị trí
                      </span>
                    </div>
                    <p className="text-xs text-[#6e7977]">
                      Gia nhập đội ngũ nhân tài cùng phát triển tại {company.name}
                    </p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-[#f2f3ff] p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveJobTab('all')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      activeJobTab === 'all' ? 'bg-white text-[#005c55] font-bold shadow-xs' : 'text-[#6e7977]'
                    }`}
                  >
                    Tất cả ({jobs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveJobTab('fulltime')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      activeJobTab === 'fulltime' ? 'bg-white text-[#005c55] font-bold shadow-xs' : 'text-[#6e7977]'
                    }`}
                  >
                    Toàn thời gian
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveJobTab('remote')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      activeJobTab === 'remote' ? 'bg-white text-[#005c55] font-bold shadow-xs' : 'text-[#6e7977]'
                    }`}
                  >
                    Remote / Hybrid
                  </button>
                </div>
              </div>

              {filteredJobs.length > 0 ? (
                <div className="space-y-3">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-xl border border-[#eaedff] hover:border-[#005c55] bg-white hover:bg-[#f2f3ff]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs group"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="font-bold text-base text-[#131b2e] group-hover:text-[#005c55] transition-colors"
                          >
                            {job.title}
                          </Link>
                          {job.workingMethod && (
                            <span className="px-2 py-0.5 rounded-full bg-[#e6f7f5] text-[#005c55] text-[11px] font-bold border border-[#80d5cb]/40">
                              {job.workingMethod}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[#6e7977] flex-wrap">
                          <span className="flex items-center gap-1 font-bold text-[#005c55] bg-[#e6f7f5] px-2 py-0.5 rounded-md border border-[#80d5cb]/40">
                            <span className="material-symbols-outlined text-[15px]">payments</span>
                            <span>{formatSalary(job)}</span>
                          </span>

                          {job.workingAddress && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-slate-400">location_on</span>
                              <span className="truncate max-w-[200px]">{job.workingAddress}</span>
                            </span>
                          )}

                          {job.expirationDate && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <span className="material-symbols-outlined text-[15px]">event</span>
                              <span>Hạn: {new Date(job.expirationDate).toLocaleDateString('vi-VN')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="px-4 py-2 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span>Xem chi tiết</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center gap-2.5 bg-slate-50/50">
                  <span className="material-symbols-outlined text-[36px] text-slate-400">work_off</span>
                  <p className="text-sm font-semibold text-slate-700">Chưa có vị trí tuyển dụng phù hợp với bộ lọc.</p>
                  <p className="text-xs text-slate-500">Doanh nghiệp sẽ sớm cập nhật các cơ hội nghề nghiệp mới nhất.</p>
                </div>
              )}
            </section>
          </div>

          {/* ================= CỘT PHẢI (col-span-4 sticky) ================= */}
          <aside className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
            {/* Card: Nhắn tin trao đổi trực tiếp với nhà tuyển dụng */}
            <div className="bg-gradient-to-br from-[#005c55] to-[#007952] rounded-2xl p-5 text-white shadow-md flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">forum</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-tight">Trao đổi với Nhà tuyển dụng</h4>
                  <p className="text-[11px] text-teal-100">Hỏi đáp trực tiếp về cơ hội việc làm</p>
                </div>
              </div>
              <p className="text-sm text-[14px] text-white/90 leading-relaxed">
                Bạn quan tâm đến cơ hội nghề nghiệp tại <strong>{company.name || 'doanh nghiệp'}</strong>? Hãy gửi tin nhắn để được bộ phận nhân sự giải đáp ngay.
              </p>
              <button
                type="button"
                onClick={handleOpenChatWithCompany}
                disabled={openingChat}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#e6f7f5] text-[#005c55] font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span>{openingChat ? 'Đang mở đoạn chat...' : 'Nhắn tin ngay'}</span>
              </button>
            </div>

            {/* Card: Bản đồ vị trí trụ sở công ty (Google Maps) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#eaedff] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#eaedff] pb-2.5">
                <h4 className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#005c55] text-[20px]">map</span>
                  <span>Bản đồ vị trí công ty</span>
                </h4>
                {addresses.length > 0 && (
                  <span className="text-[11px] font-semibold text-[#6e7977] truncate max-w-[150px]">
                    {addresses[0].provinceName || provinces.find((p) => p.id === addresses[0].provinceId)?.name || 'Trụ sở chính'}
                  </span>
                )}
              </div>

              {/* Khung nhúng Google Maps iframe */}
              <div className="w-full rounded-xl overflow-hidden border border-[#eaedff] shadow-xs bg-[#f2f3ff]">
                {companyMapLocation?.trim() ? (
                  <iframe
                    title={`Bản đồ địa chỉ - ${company.name || 'Công ty'}`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(companyMapLocation)}&output=embed`}
                    width="100%"
                    height="230"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="h-[200px] bg-[#f2f3ff] flex flex-col items-center justify-center text-[#6e7977] gap-2">
                    <span className="material-symbols-outlined text-3xl">location_off</span>
                    <span className="text-xs">Chưa có thông tin địa chỉ công ty</span>
                  </div>
                )}
              </div>

              {/* Chi tiết địa chỉ */}
              {primaryAddress && primaryAddress !== 'Chưa cập nhật trụ sở chính' && (
                <div className="flex items-start gap-2 text-sm text-[14px] text-[#3e4947] leading-relaxed bg-[#f2f3ff] p-3 rounded-xl border border-[#eaedff]">
                  <span className="material-symbols-outlined text-[#005c55] text-[18px] shrink-0 mt-0.5">location_on</span>
                  <span className="font-medium">{primaryAddress}</span>
                </div>
              )}

              {companyMapLocation?.trim() && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(companyMapLocation)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#005c55] hover:text-[#007952] hover:underline"
                  >
                    <span>Mở chỉ đường Google Maps</span>
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  </a>

                  {isOwnerOrAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenAddAddress}
                      className="text-[#005c55] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit_location</span>
                      <span>Đổi địa chỉ</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Card 1: Bật tuyển dụng chủ động (Hiring Mode) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#e6f7f5] via-[#f0fbf9] to-[#faf8ff] border-2 border-[#80d5cb]/50 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3.5 h-3.5 rounded-full ${
                    isHiring ? 'bg-[#005c55] animate-pulse' : 'bg-slate-400'
                  }`}
                ></span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#131b2e]">Chế độ tuyển dụng tích cực</span>
                  <span className="text-[11px] text-[#6e7977]">
                    {isHiring ? 'Ứng viên có thể nộp hồ sơ ứng tuyển' : 'Đang tạm dừng nhận hồ sơ mới'}
                  </span>
                </div>
              </div>
              {isOwnerOrAdmin ? (
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isHiring}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsHiring(checked);
                      showToast(
                        `Đã ${checked ? 'BẬT' : 'TẮT'} trạng thái mở nhận hồ sơ ứng tuyển.`,
                        checked ? 'success' : 'info'
                      );
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#eaedff] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005c55]"></div>
                </label>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-[#97f5cc]/40 text-[#00513a] text-xs font-bold border border-[#97f5cc]">
                  Mở tuyển dụng
                </span>
              )}
            </div>

            {/* Card 4: Tiện ích & Lối tắt nhanh */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#eaedff] flex flex-col gap-3">
              <h3 className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5 border-b border-[#eaedff] pb-2.5">
                <span className="material-symbols-outlined text-[#005c55] text-[18px]">explore</span>
                <span>Tiện ích &amp; Lối tắt</span>
              </h3>

              <div className="flex flex-col gap-2">
                <Link
                  to="/companies"
                  className="p-3 rounded-xl bg-[#f2f3ff] hover:bg-[#e6f7f5] border border-[#eaedff] hover:border-[#80d5cb]/50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#005c55] text-[20px]">apartment</span>
                    <span className="text-xs font-bold text-[#131b2e] group-hover:text-[#005c55]">
                      Top 100 Doanh nghiệp uy tín
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:translate-x-1 transition-transform">
                    chevron_right
                  </span>
                </Link>

                <Link
                  to="/jobs"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-teal-50/70 border border-slate-100 hover:border-teal-200 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#0f766e] text-[20px]">search</span>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#0f766e]">
                      Tìm việc làm cùng lĩnh vực
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:translate-x-1 transition-transform">
                    chevron_right
                  </span>
                </Link>

                {isOwnerOrAdmin && (
                  <Link
                    to="/recruiter/post-job"
                    className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[#005c55] text-[20px]">post_add</span>
                      <span className="text-xs font-bold text-[#005c55]">Đăng tin tuyển dụng mới</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-[#005c55] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: CHỈNH SỬA THÔNG TIN DOANH NGHIỆP (BẢNG COMPANIES)               */}
      {/* ========================================================================= */}
      {isEditCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#005c55] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">corporate_fare</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Chỉnh sửa hồ sơ doanh nghiệp</h3>
                  <p className="text-xs text-slate-500">Đồng bộ trực tiếp với bảng companies trong cơ sở dữ liệu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCompanyOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-5">
              {/* Ảnh bìa & Logo Upload Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Logo công ty (Avatar 1:1)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative shrink-0">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="material-symbols-outlined text-[28px] text-slate-400">corporate_fare</span>
                      )}
                      {logoUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#005c55] text-xs font-bold transition-colors"
                    >
                      {logoUploading ? 'Đang tải...' : 'Tải Logo lên'}
                    </button>
                  </div>
                  {companyErrors.logo && <p className="text-xs text-rose-600 mt-1">{companyErrors.logo}</p>}
                </div>

                {/* Banner */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ảnh bìa doanh nghiệp (Cover)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative shrink-0">
                      {bannerPreview ? (
                        <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[28px] text-slate-400">landscape</span>
                      )}
                      {bannerUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={bannerInputRef}
                      onChange={handleBannerFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#005c55] text-xs font-bold transition-colors"
                    >
                      {bannerUploading ? 'Đang tải...' : 'Tải Ảnh bìa'}
                    </button>
                  </div>
                  {companyErrors.banner && <p className="text-xs text-rose-600 mt-1">{companyErrors.banner}</p>}
                </div>
              </div>

              {/* Tên công ty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên công ty đầy đủ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Ví dụ: CÔNG TY CỔ PHẦN CÔNG NGHỆ TECHVINA"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                />
                {companyErrors.name && <p className="text-xs text-rose-600 mt-1">{companyErrors.name}</p>}
              </div>

              {/* Quy mô & Hotline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quy mô doanh nghiệp (company_type)
                  </label>
                  <select
                    value={editFormData.companyType}
                    onChange={(e) => setEditFormData({ ...editFormData, companyType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                  >
                    <option value="big">Doanh nghiệp lớn (&gt; 500 nhân sự)</option>
                    <option value="small">Doanh nghiệp vừa &amp; nhỏ / Startup (&lt; 100 nhân sự)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hotline tuyển dụng</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="Ví dụ: 024 7300 8899"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                  />
                  {companyErrors.phone && <p className="text-xs text-rose-600 mt-1">{companyErrors.phone}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email tiếp nhận hồ sơ</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="contact@techvina.com.vn"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                />
                {companyErrors.email && <p className="text-xs text-rose-600 mt-1">{companyErrors.email}</p>}
              </div>

              {/* Mô tả giới thiệu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả giới thiệu doanh nghiệp (description)
                </label>
                <textarea
                  rows="4"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Mô tả quá trình hình thành, sứ mệnh, sản phẩm thế mạnh và chế độ phúc lợi đãi ngộ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditCompanyOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="px-5 py-2.5 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {savingCompany && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <span>Lưu thông tin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: THÊM / SỬA LIÊN KẾT (BẢNG COMPANY_LINKS)                         */}
      {/* ========================================================================= */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005c55]">share</span>
                <span>{editingLink ? 'Chỉnh sửa liên kết' : 'Thêm liên kết mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại liên kết</label>
                <select
                  value={linkFormData.type}
                  onChange={(e) => setLinkFormData({ ...linkFormData, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                >
                  {COMPANY_LINK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {linkFormData.type === 'other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên kênh liên kết</label>
                  <input
                    type="text"
                    value={linkFormData.customType}
                    onChange={(e) => setLinkFormData({ ...linkFormData, customType: e.target.value })}
                    placeholder="Ví dụ: TikTok, Medium..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                  />
                  {linkErrors.type && <p className="text-xs text-rose-600 mt-1">{linkErrors.type}</p>}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đường dẫn URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={linkFormData.link}
                  onChange={(e) => setLinkFormData({ ...linkFormData, link: e.target.value })}
                  placeholder={getLinkTypeMeta(linkFormData.type).placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                />
                {linkErrors.link && <p className="text-xs text-rose-600 mt-1">{linkErrors.link}</p>}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingLink}
                  className="px-5 py-2 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingLink && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <span>Lưu liên kết</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: THÊM / SỬA ĐỊA CHỈ CHI NHÁNH (BẢNG COMPANY_ADDRESSES)           */}
      {/* ========================================================================= */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005c55]">add_location_alt</span>
                <span>{editingAddress ? 'Chỉnh sửa địa chỉ chi nhánh' : 'Thêm địa chỉ chi nhánh mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tỉnh / Thành phố <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addressFormData.provinceId}
                  onChange={(e) => setAddressFormData({ ...addressFormData, provinceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                >
                  <option value="">-- Chọn Tỉnh / Thành phố --</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {addressErrors.provinceId && (
                  <p className="text-xs text-rose-600 mt-1">{addressErrors.provinceId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={addressFormData.addressDetail}
                  onChange={(e) => setAddressFormData({ ...addressFormData, addressDetail: e.target.value })}
                  placeholder="Ví dụ: Tầng 12, Tòa nhà Landmark 72, Đường Phạm Hùng, Q. Nam Từ Liêm"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                ></textarea>
                {addressErrors.addressDetail && (
                  <p className="text-xs text-rose-600 mt-1">{addressErrors.addressDetail}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-5 py-2 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingAddress && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <span>Lưu địa chỉ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: XEM ẢNH PHÓNG TO (LIGHTBOX)                                     */}
      {/* ========================================================================= */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img src={previewImage} alt="Phóng to" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: XÁC NHẬN XÓA MỤC                                                */}
      {/* ========================================================================= */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">delete_forever</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa mục này khỏi hồ sơ doanh nghiệp? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deletingItem}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingItem && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                <span>Xóa ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
