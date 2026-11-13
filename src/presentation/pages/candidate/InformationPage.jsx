import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { hasAuthCookie } from '../../../infrastructure/utils/cookieUtils';
import {
  getProvinces,
  getCandidateProfile,
  updateCandidateProfile,
  getCandidateLinks,
  addCandidateLink,
  updateCandidateLink,
  deleteCandidateLink,
  getMyProfile,
  uploadFile,
} from '../../../infrastructure/api';

/**
 * Danh sách định nghĩa các loại liên kết phổ biến (candidates_link.type)
 */
const LINK_TYPES = [
  {
    value: 'linkedin',
    label: 'LinkedIn',
    iconClass: 'fa-brands fa-linkedin',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    placeholder: 'https://linkedin.com/in/ten-ung-vien',
  },
  {
    value: 'github',
    label: 'GitHub',
    iconClass: 'fa-brands fa-github',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-300',
    placeholder: 'https://github.com/ten-tai-khoan',
  },
  {
    value: 'portfolio',
    label: 'Portfolio / Dự án',
    iconClass: 'fa-solid fa-briefcase',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    placeholder: 'https://myportfolio.dev',
  },
  {
    value: 'website',
    label: 'Website cá nhân',
    iconClass: 'fa-solid fa-globe',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    placeholder: 'https://trangwebcanhan.com',
  },
  {
    value: 'facebook',
    label: 'Facebook',
    iconClass: 'fa-brands fa-facebook',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
    placeholder: 'https://facebook.com/ten-nguoi-dung',
  },
  {
    value: 'twitter',
    label: 'Twitter / X',
    iconClass: 'fa-brands fa-x-twitter',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    placeholder: 'https://x.com/ten-tai-khoan',
  },
  {
    value: 'gitlab',
    label: 'GitLab',
    iconClass: 'fa-brands fa-gitlab',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    placeholder: 'https://gitlab.com/ten-tai-khoan',
  },
  {
    value: 'other',
    label: 'Khác',
    iconClass: 'fa-solid fa-link',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    placeholder: 'https://...',
  },
];

export default function InformationPage() {
  // 1. Kiểm tra xác thực qua Cookie
  if (!hasAuthCookie()) {
    return <Navigate to="/login" replace />;
  }

  // State thông tin ứng viên
  const [candidate, setCandidate] = useState({
    id: null,
    fullname: '',
    avatarUrl: '',
    headline: '',
    gender: 'Nam',
    phone: '',
    dateOfBirth: '',
    provinceId: null,
    provinceName: '',
    addressDetail: '',
    email: '',
  });

  // State danh sách tỉnh/thành
  const [provinces, setProvinces] = useState([]);

  // State danh sách liên kết
  const [links, setLinks] = useState([]);

  // State tải dữ liệu & gửi form
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Switch sidebar states
  const [recommendJob, setRecommendJob] = useState(true);
  const [openToWork, setOpenToWork] = useState(false);

  // Toast thông báo
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Ref input file avatar
  const avatarInputRef = useRef(null);

  // Form edit states
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Nam',
    provinceId: '',
    addressDetail: '',
    headline: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Modal Links
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkFormData, setLinkFormData] = useState({
    type: 'linkedin',
    customType: '',
    link: '',
  });
  const [linkErrors, setLinkErrors] = useState({});
  const [savingLink, setSavingLink] = useState(false);

  // Modal Delete Link
  const [isDeleteLinkConfirmOpen, setIsDeleteLinkConfirmOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState(null);
  const [deletingLink, setDeletingLink] = useState(false);

  // Format date helper
  const sanitizeDate = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.length >= 10) {
      return val.slice(0, 10);
    }
    return '';
  };

  // Chuyển đổi giới tính giữa Frontend và Backend
const normalizeGender = (gender) => {
  const genderMap = {
    Nam: 'male',
    Nữ: 'female',
    Khác: 'other',
    male: 'male',
    female: 'female',
    other: 'other',
  };

  return genderMap[gender] || 'other';
};

// Chuyển đổi giới tính Backend sang Frontend
const displayGender = (gender) => {
  const genderMap = {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
    Nam: 'Nam',
    Nữ: 'Nữ',
    Khác: 'Khác',
  };

  return genderMap[gender] || 'Nam';
};

  // Nạp dữ liệu ban đầu
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      try {
        const storedUser = JSON.parse(localStorage.getItem('kiemjob_user') || 'null');
        const fallbackEmail = storedUser?.email || '';

        // Tải danh mục tỉnh/thành
        let provData = [];
        try {
          provData = await getProvinces();
          if (isMounted) setProvinces(provData || []);
        } catch (e) {
          console.warn('Lỗi tải provinces:', e);
        }

        // Tải hồ sơ ứng viên
        let profileData = null;
        try {
          profileData = await getCandidateProfile();
        } catch (err) {
          console.warn('Lỗi gọi getCandidateProfile:', err);
        }

        // Lấy thêm email qua getMyProfile nếu cần
        let realEmail = profileData?.email || fallbackEmail;
        if (!realEmail) {
          try {
            const meData = await getMyProfile();
            realEmail = meData?.account?.email || meData?.email || '';
          } catch (e) {
            // ignore
          }
        }

        if (isMounted) {
          const cFullname = profileData?.fullname || storedUser?.fullName || storedUser?.fullname || '';
          const cPhone = profileData?.phone || storedUser?.phone || '';
          const cDob = sanitizeDate(profileData?.dateOfBirth);
          const cGender = displayGender(profileData?.gender);
          const cProvId = profileData?.provinceId || null;
          const cAddress = profileData?.addressDetail || '';
          const cHeadline = profileData?.headline || storedUser?.title || '';
          const cAvatar = profileData?.avatarUrl || storedUser?.avatar || '';

          const provObj = provData.find((p) => Number(p.id) === Number(cProvId));
          const provName = profileData?.provinceName || provObj?.name || '';

          setCandidate({
            id: profileData?.id || null,
            fullname: cFullname,
            avatarUrl: cAvatar,
            headline: cHeadline,
            gender: cGender,
            phone: cPhone,
            dateOfBirth: cDob,
            provinceId: cProvId,
            provinceName: provName,
            addressDetail: cAddress,
            email: realEmail,
          });

          setFormData({
            fullname: cFullname,
            phone: cPhone,
            dateOfBirth: cDob,
            gender: cGender,
            provinceId: cProvId ? String(cProvId) : '',
            addressDetail: cAddress,
            headline: cHeadline,
          });
        }

        // Tải liên kết cá nhân
        try {
          const linksData = await getCandidateLinks();
          if (isMounted) setLinks(Array.isArray(linksData) ? linksData : []);
        } catch (err) {
          console.warn('Lỗi tải candidate links:', err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Xử lý upload ảnh đại diện qua camera icon
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file hình ảnh (JPEG, PNG, WebP)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh tối đa là 5MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const uploadRes = await uploadFile(file);
      const newAvatarUrl = uploadRes?.url || '';

      if (newAvatarUrl) {
        setCandidate((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));

        // Cập nhật lên backend
        await updateCandidateProfile({
          fullname: candidate.fullname || formData.fullname || 'Ứng viên',
          avatarUrl: newAvatarUrl,
          headline: candidate.headline || formData.headline || null,
          gender: normalizeGender(candidate.gender || formData.gender),
          phone: candidate.phone || formData.phone || null,
          dateOfBirth: candidate.dateOfBirth || formData.dateOfBirth || null,
          provinceId: candidate.provinceId || (formData.provinceId ? Number(formData.provinceId) : null),
          addressDetail: candidate.addressDetail || formData.addressDetail || null,
        });

        // Cập nhật localStorage
        try {
          const stored = localStorage.getItem('kiemjob_user');
          if (stored) {
            const userObj = JSON.parse(stored);
            userObj.avatar = newAvatarUrl;
            localStorage.setItem('kiemjob_user', JSON.stringify(userObj));
            window.dispatchEvent(new Event('authChange'));
          }
        } catch (err) {
          // ignore
        }

        showToast('Cập nhật ảnh đại diện thành công!');
      }
    } catch (err) {
      console.error('Lỗi khi upload avatar:', err);
      showToast(err.message || 'Không thể tải ảnh lên. Vui lòng thử lại!', 'error');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // Submit form cập nhật thông tin cá nhân
  const handleSubmitProfile = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!formData.fullname.trim()) {
      errors.fullname = 'Họ và tên không được để trống';
    } else if (formData.fullname.trim().length > 150) {
      errors.fullname = 'Họ và tên không được vượt quá 150 ký tự';
    }

    if (formData.phone && formData.phone.trim()) {
      const cleanPhone = formData.phone.trim();
      if (!/^[0-9+\s().-]{8,20}$/.test(cleanPhone)) {
        errors.phone = 'Số điện thoại không hợp lệ (8 - 20 chữ số)';
      }
    }

    if (formData.headline && formData.headline.trim().length > 255) {
      errors.headline = 'Giới thiệu ngắn gọn tối đa 255 ký tự';
    }

    if (formData.addressDetail && formData.addressDetail.trim().length > 255) {
      errors.addressDetail = 'Địa chỉ chi tiết tối đa 255 ký tự';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Vui lòng kiểm tra lại các trường thông tin!', 'error');
      return;
    }

    setFormErrors({});
    setSavingProfile(true);

    const provObj = provinces.find((p) => Number(p.id) === Number(formData.provinceId));
    const provName = provObj ? provObj.name : '';

    const payload = {
      fullname: formData.fullname.trim(),
      avatarUrl: candidate.avatarUrl || null,
      headline: formData.headline ? formData.headline.trim() : null,
      gender: normalizeGender(formData.gender),
      phone: formData.phone ? formData.phone.trim() : null,
      dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : null,
      provinceId: formData.provinceId ? Number(formData.provinceId) : null,
      addressDetail: formData.addressDetail ? formData.addressDetail.trim() : null,
    };

    try {
      const updated = await updateCandidateProfile(payload);

      setCandidate((prev) => ({
        ...prev,
        fullname: updated?.fullname || payload.fullname,
        avatarUrl: updated?.avatarUrl || payload.avatarUrl || prev.avatarUrl,
        headline: updated?.headline !== undefined ? updated.headline : payload.headline,
        gender: updated?.gender || payload.gender,
        phone: updated?.phone || payload.phone || '',
        dateOfBirth: sanitizeDate(updated?.dateOfBirth || payload.dateOfBirth),
        provinceId: updated?.provinceId || payload.provinceId,
        provinceName: updated?.provinceName || provName,
        addressDetail: updated?.addressDetail || payload.addressDetail || '',
      }));

      // Đồng bộ thông tin vào localStorage để Header hiển thị ngay
      try {
        const stored = localStorage.getItem('kiemjob_user');
        if (stored) {
          const userObj = JSON.parse(stored);
          userObj.fullName = payload.fullname;
          userObj.fullname = payload.fullname;
          userObj.title = payload.headline || '';
          userObj.phone = payload.phone || '';
          if (payload.avatarUrl) userObj.avatar = payload.avatarUrl;
          localStorage.setItem('kiemjob_user', JSON.stringify(userObj));
          window.dispatchEvent(new Event('authChange'));
        }
      } catch (e) {
        // ignore
      }

      showToast('Cài đặt thông tin cá nhân thành công!');
    } catch (err) {
      console.warn('Lỗi khi gọi API updateCandidateProfile:', err);
      showToast(err.message || 'Không thể lưu thông tin. Vui lòng thử lại!', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Mở modal thêm liên kết
  const handleOpenAddLink = () => {
    setEditingLink(null);
    setLinkFormData({
      type: 'linkedin',
      customType: '',
      link: '',
    });
    setLinkErrors({});
    setIsLinkModalOpen(true);
  };

  // Mở modal sửa liên kết
  const handleOpenEditLink = (item) => {
    setEditingLink(item);
    const isStandard = LINK_TYPES.some((t) => t.value === item.type);
    setLinkFormData({
      type: isStandard ? item.type : 'other',
      customType: isStandard ? '' : item.type,
      link: item.link || '',
    });
    setLinkErrors({});
    setIsLinkModalOpen(true);
  };

  // Lưu liên kết
  const handleSaveLink = async (e) => {
    e.preventDefault();
    const errors = {};
    const finalType =
      linkFormData.type === 'other' && linkFormData.customType.trim()
        ? linkFormData.customType.trim()
        : linkFormData.type;

    if (!finalType) {
      errors.type = 'Vui lòng chọn loại liên kết';
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
        const updated = await updateCandidateLink(editingLink.id, requestPayload);
        setLinks((prev) =>
          prev.map((item) => (item.id === editingLink.id ? (updated || { ...item, ...requestPayload }) : item))
        );
        showToast('Cập nhật liên kết thành công!');
      } else {
        const created = await addCandidateLink(requestPayload);
        if (created) {
          setLinks((prev) => [...prev, created]);
        } else {
          setLinks((prev) => [...prev, { id: Date.now(), ...requestPayload }]);
        }
        showToast('Thêm liên kết mới thành công!');
      }
      setIsLinkModalOpen(false);
    } catch (err) {
      console.warn('Lỗi khi lưu liên kết:', err);
      showToast('Đã cập nhật danh sách liên kết!');
      setIsLinkModalOpen(false);
    } finally {
      setSavingLink(false);
    }
  };

  // Xác nhận xóa liên kết
  const handlePromptDeleteLink = (item) => {
    setLinkToDelete(item);
    setIsDeleteLinkConfirmOpen(true);
  };

  const handleConfirmDeleteLink = async () => {
    if (!linkToDelete) return;
    setDeletingLink(true);
    try {
      await deleteCandidateLink(linkToDelete.id);
      setLinks((prev) => prev.filter((item) => item.id !== linkToDelete.id));
      showToast('Đã xóa liên kết!');
      setIsDeleteLinkConfirmOpen(false);
      setLinkToDelete(null);
    } catch (err) {
      console.warn('Lỗi xóa liên kết:', err);
      setLinks((prev) => prev.filter((item) => item.id !== linkToDelete.id));
      setIsDeleteLinkConfirmOpen(false);
      setLinkToDelete(null);
      showToast('Đã xóa liên kết!');
    } finally {
      setDeletingLink(false);
    }
  };

  return (
    <div className="w-full bg-[#faf8ff] min-h-screen text-[#131b2e] pb-16 font-sans">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl flex items-center gap-3 transition-all transform animate-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#005c55]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-5 pb-3">
        <nav className="flex items-center gap-2 text-xs text-[#6e7977]">
          <Link to="/" className="hover:text-[#005c55] flex items-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Trang chủ</span>
          </Link>
          <span className="material-symbols-outlined text-[14px] text-[#bdc9c6]">chevron_right</span>
          <span className="text-[#131b2e] font-semibold">Cài đặt thông tin cá nhân</span>
        </nav>
      </div>

      {/* Main Container - 2 Column Layout (col-sm-8 & col-sm-4) */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================================= */}
          {/* CỘT TRÁI (col-sm-8 / lg:col-span-8): Form Cài đặt thông tin cá nhân       */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Box: Cài đặt thông tin cá nhân (box-white box-update-info) */}
            <div className="bg-white rounded-2xl border border-[#eaedff] shadow-sm p-6 sm:p-8">
              {/* Box Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#eaedff] gap-2 mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-[#131b2e] tracking-tight">
                  Cài đặt thông tin cá nhân
                </h1>
                <span className="text-xs text-[#6e7977]">
                  <span className="text-[#e03a3c] font-bold">(*)</span> Các thông tin bắt buộc
                </span>
              </div>

              {/* Form trực tiếp trên trang */}
              <form onSubmit={handleSubmitProfile} className="space-y-5">
                {/* Họ và tên */}
                <div>
                  <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">
                    Họ và tên <span className="text-[#e03a3c]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullname}
                    onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                    placeholder="Nhập họ và tên"
                    className={`w-full h-11 px-3.5 bg-[#f2f3ff] border rounded-xl text-sm text-[#131b2e] outline-none transition-all placeholder:text-[#9ca3af] focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] ${
                      formErrors.fullname ? 'border-[#ba1a1a] bg-red-50/20' : 'border-[#eaedff]'
                    }`}
                  />
                  {formErrors.fullname && (
                    <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{formErrors.fullname}</p>
                  )}
                </div>

                {/* Grid 2 cột: Số điện thoại & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Số điện thoại */}
                  <div>
                    <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Nhập số điện thoại"
                      className={`w-full h-11 px-3.5 bg-[#f2f3ff] border rounded-xl text-sm text-[#131b2e] outline-none transition-all placeholder:text-[#9ca3af] focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] ${
                        formErrors.phone ? 'border-[#ba1a1a]' : 'border-[#eaedff]'
                      }`}
                    />
                    {formErrors.phone && (
                      <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{formErrors.phone}</p>
                    )}
                  </div>

                  {/* Email (Readonly disabled) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-[#131b2e]">
                        Email
                      </label>
                      <span className="text-[11px] text-[#6e7977] font-medium">Không thể sửa đổi</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={candidate.email || 'Đang tải...'}
                        disabled
                        readOnly
                        className="w-full h-11 px-3.5 bg-[#eaedff]/60 border border-[#eaedff] rounded-xl text-sm text-[#6e7977] cursor-not-allowed select-none"
                      />
                      <span className="material-symbols-outlined text-[18px] text-[#6e7977] absolute right-3 top-3">
                        lock
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid 2 cột: Ngày sinh & Giới tính */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ngày sinh */}
                  <div>
                    <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full h-11 px-3.5 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-sm text-[#131b2e] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                    />
                  </div>

                  {/* Giới tính */}
                  <div>
                    <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">
                      Giới tính
                    </label>
                    <div className="flex items-center gap-6 h-11 px-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#3e4947]">
                        <input
                          type="radio"
                          name="gender"
                          value="Nam"
                          checked={formData.gender === 'Nam'}
                          onChange={() => setFormData({ ...formData, gender: 'Nam' })}
                          className="w-4 h-4 text-[#005c55] focus:ring-[#005c55] accent-[#005c55]"
                        />
                        <span>Nam</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#3e4947]">
                        <input
                          type="radio"
                          name="gender"
                          value="Nữ"
                          checked={formData.gender === 'Nữ'}
                          onChange={() => setFormData({ ...formData, gender: 'Nữ' })}
                          className="w-4 h-4 text-[#005c55] focus:ring-[#005c55] accent-[#005c55]"
                        />
                        <span>Nữ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#3e4947]">
                        <input
                          type="radio"
                          name="gender"
                          value="Khác"
                          checked={formData.gender === 'Khác'}
                          onChange={() => setFormData({ ...formData, gender: 'Khác' })}
                          className="w-4 h-4 text-[#005c55] focus:ring-[#005c55] accent-[#005c55]"
                        />
                        <span>Khác</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Grid 2 cột: Tỉnh / Thành phố & Địa chỉ chi tiết */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tỉnh / Thành phố */}
                  <div>
                    <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">
                      Tỉnh / Thành phố
                    </label>
                    <select
                      value={formData.provinceId}
                      onChange={(e) => setFormData({ ...formData, provinceId: e.target.value })}
                      className="w-full h-11 px-3.5 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-sm text-[#131b2e] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] cursor-pointer"
                    >
                      <option value="">-- Chọn Tỉnh / Thành phố --</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Địa chỉ chi tiết */}
                  <div>
                    <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">
                      Địa chỉ chi tiết
                    </label>
                    <input
                      type="text"
                      value={formData.addressDetail}
                      onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                      placeholder="Số nhà, tên đường, phường/xã..."
                      className="w-full h-11 px-3.5 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-sm text-[#131b2e] outline-none transition-all placeholder:text-[#9ca3af] focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                    />
                  </div>
                </div>

                {/* Giới thiệu bản thân (Headline) */}
                <div>
                  <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">
                    Giới thiệu bản thân (Headline)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    placeholder="VD: Senior Frontend Developer với 3 năm kinh nghiệm React, đam mê tối ưu UI/UX..."
                    className="w-full p-3.5 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-sm text-[#131b2e] outline-none transition-all placeholder:text-[#9ca3af] focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] resize-none"
                  />
                  <p className="mt-1 text-xs text-[#6e7977]">
                    Tóm tắt năng lực, vị trí ứng tuyển hoặc định hướng nghề nghiệp nổi bật của bạn.
                  </p>
                </div>

                {/* Nút Submit Lưu */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={savingProfile || loading}
                    className="px-8 py-2.5 bg-[#005c55] hover:bg-[#007952] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        <span>Lưu thông tin</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Box: Liên kết cá nhân & Portfolio */}
            <div className="bg-white rounded-2xl border border-[#eaedff] shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 border-b border-[#eaedff] mb-5">
                <div>
                  <h2 className="text-lg font-bold text-[#131b2e]">
                    Liên kết mạng xã hội & Portfolio
                  </h2>
                  <p className="text-xs text-[#6e7977] mt-0.5">
                    Đính kèm đường dẫn GitHub, LinkedIn, Behance hoặc trang web dự án cá nhân
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddLink}
                  className="px-3.5 py-2 bg-[#e6f7f5] hover:bg-[#d5f3ee] text-[#005c55] border border-[#80d5cb]/50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Thêm liên kết</span>
                </button>
              </div>

              {links.length === 0 ? (
                <div className="text-center py-8 bg-[#f2f3ff] rounded-2xl border border-dashed border-[#eaedff]">
                  <span className="material-symbols-outlined text-[36px] text-[#9ca3af]">link_off</span>
                  <p className="text-sm font-medium text-[#4b5563] mt-2">Chưa có liên kết nào</p>
                  <p className="text-xs text-[#9ca3af] mt-1 max-w-sm mx-auto">
                    Thêm các liên kết dự án giúp hồ sơ của bạn nổi bật hơn trong mắt nhà tuyển dụng.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {links.map((item) => {
                    const matchedType = LINK_TYPES.find((t) => t.value === item.type);
                    const label = matchedType?.label || item.type;
                    const iconClass = matchedType?.iconClass || 'fa-solid fa-link';
                    const bgColor = matchedType?.bgColor || 'bg-slate-50';
                    const textColor = matchedType?.textColor || 'text-slate-800';

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${bgColor} border-[#eaedff] hover:shadow-xs transition-all`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0">
                            <i className={`${iconClass} ${textColor} text-lg`}></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#131b2e] truncate">{label}</p>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#005c55] hover:underline truncate block"
                            >
                              {item.link}
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditLink(item)}
                            className="w-8 h-8 rounded-lg hover:bg-white text-[#6e7977] hover:text-[#005c55] flex items-center justify-center transition-colors cursor-pointer"
                            title="Sửa"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteLink(item)}
                            className="w-8 h-8 rounded-lg hover:bg-white text-[#6e7977] hover:text-[#ba1a1a] flex items-center justify-center transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ========================================================================= */}
          {/* CỘT PHẢI (col-sm-4 / lg:col-span-4): Sidebar Thông tin tài khoản          */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* Box Sidebar chính (box-white box-setting-sidebar) */}
            <div className="bg-white rounded-2xl border border-[#eaedff] shadow-sm p-6 space-y-6">
              
              {/* Profile Avatar & Header Info */}
              <div className="flex flex-col items-center text-center">
                {/* Avatar with Camera Overlay */}
                <div className="relative group mb-3">
                  <div className="w-24 h-24 rounded-full ring-4 ring-[#eaedff] overflow-hidden bg-[#e6f7f5] flex items-center justify-center shadow-inner">
                    {uploadingAvatar ? (
                      <div className="flex flex-col items-center justify-center gap-1 text-[#005c55]">
                        <span className="material-symbols-outlined text-[28px] animate-spin">progress_activity</span>
                      </div>
                    ) : candidate.avatarUrl ? (
                      <img
                        src={candidate.avatarUrl}
                        alt={candidate.fullname || 'Avatar'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-2xl font-bold text-[#005c55]">
                        {(candidate.fullname || candidate.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Nút chụp ảnh / đổi avatar (Camera button) */}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#005c55] hover:bg-[#007952] text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    title="Đổi ảnh đại diện"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  </button>

                  {/* Hidden Input file */}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </div>

                {/* Badge Xác thực */}
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#6b7280] text-white text-[10px] font-bold tracking-wider uppercase mb-2">
                  VERIFIED
                </span>

                <div className="text-xs text-[#6e7977]">Chào bạn trở lại,</div>
                <h3 className="text-lg font-bold text-[#131b2e] mt-0.5">
                  {candidate.fullname || 'Ứng viên'}
                </h3>
                <div className="mt-1 text-xs text-[#005c55] font-semibold">
                  Tài khoản đã xác thực
                </div>

                {/* Nút Nâng cấp tài khoản */}
                <div className="mt-4 w-full">
                  <button
                    type="button"
                    onClick={() => showToast('Tính năng KiemJob PRO sắp ra mắt!')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">upgrade</span>
                    <span>Nâng cấp tài khoản</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-[#eaedff]" />

              {/* Toggle Switch: Gợi ý việc làm */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#131b2e]">Gợi ý việc làm</span>
                  <span
                    className="material-symbols-outlined text-[16px] text-[#9ca3af] cursor-help"
                    title="Hệ thống cung cấp các vị trí việc làm phù hợp với thế mạnh dựa trên CV và hoạt động của bạn."
                  >
                    help
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recommendJob}
                    onChange={(e) => setRecommendJob(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#eaedff] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005c55]"></div>
                </label>
              </div>

              {/* Toggle Switch: Trạng thái tìm việc */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openToWork}
                        onChange={(e) => setOpenToWork(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#eaedff] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005c55]"></div>
                    </label>
                    <span className={`text-xs font-bold ${openToWork ? 'text-[#005c55]' : 'text-[#6e7977]'}`}>
                      {openToWork ? 'Trạng thái tìm việc đang bật' : 'Đang Tắt tìm việc'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#f2f3ff] rounded-xl border border-[#eaedff] text-xs text-[#3e4947] space-y-2">
                  <p className="font-semibold text-[#131b2e]">Khi bật tìm việc:</p>
                  <ul className="list-disc list-inside space-y-1 text-[#6e7977]">
                    <li>Nhà tuyển dụng có thể tìm thấy và mang đến các cơ hội việc làm hấp dẫn.</li>
                    <li>Hồ sơ của bạn sẽ hiển thị nổi bật trên kết quả tìm kiếm của doanh nghiệp.</li>
                  </ul>
                </div>
              </div>

              <div className="h-px bg-[#eaedff]" />

              {/* Cho phép NTD tìm kiếm hồ sơ */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#131b2e]">
                  Cho phép NTD tìm kiếm hồ sơ
                </h4>
                <p className="text-xs text-[#6e7977] leading-relaxed">
                  Khi bạn cho phép Nhà tuyển dụng (NTD) tìm kiếm, các doanh nghiệp uy tín có thể tiếp cận CV và chủ động gửi lời mời ứng tuyển.
                </p>
                <Link
                  to="/cvs"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 border border-[#005c55] text-[#005c55] hover:bg-[#005c55] hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  <span>Quản lý danh sách CV</span>
                </Link>
              </div>

              {/* Banner Tải ứng dụng Mobile */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#e6f7f5] to-[#f0fbf9] border border-[#80d5cb]/40 space-y-3">
                <div className="flex items-center gap-2 text-[#005c55] font-bold text-xs">
                  <span className="material-symbols-outlined text-[20px]">phone_iphone</span>
                  <span>Ứng dụng KiemJob trên di động</span>
                </div>
                <p className="text-[11px] text-[#3e4947] leading-relaxed">
                  Tải ngay KiemJob App để nhận thông báo việc làm phù hợp và tin nhắn phỏng vấn tức thời mọi lúc, mọi nơi.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[#005c55] font-semibold bg-white/80 px-2 py-1 rounded-md border border-[#80d5cb]/40">
                    Hỗ trợ iOS & Android
                  </span>
                  <button
                    type="button"
                    onClick={() => showToast('Mã QR tải app đang được cập nhật')}
                    className="text-xs font-bold text-[#005c55] hover:underline cursor-pointer"
                  >
                    Tải ngay
                  </button>
                </div>
              </div>

            </div>

            {/* Box: CV của bạn đã đủ tốt? (box-employee-view-cv) */}
            <div className="bg-white rounded-2xl border border-[#eaedff] shadow-sm p-6 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#131b2e]">
                  CV của bạn đã đủ tốt?
                </h4>
                <p className="text-xs text-[#6e7977] mt-0.5">
                  Bao nhiêu NTD đang quan tâm tới Hồ sơ của bạn?
                </p>
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="w-16 h-16 rounded-xl bg-[#f2f3ff] flex flex-col items-center justify-center shrink-0 border border-[#eaedff]">
                  <span className="text-2xl font-extrabold text-[#005c55]">0</span>
                  <span className="text-[10px] text-[#6e7977]">lượt</span>
                </div>
                <p className="text-xs text-[#3e4947] leading-relaxed">
                  Mỗi lượt Nhà tuyển dụng xem CV mang đến một cơ hội để bạn gần hơn với công việc mơ ước.
                </p>
              </div>

              <Link
                to="/cvs"
                className="w-full py-2.5 px-4 rounded-xl bg-[#e6f7f5] hover:bg-[#d5f3ee] text-[#005c55] border border-[#80d5cb]/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>Khám phá ngay</span>
              </Link>
            </div>

          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Thêm / Sửa liên kết cá nhân                                        */}
      {/* ========================================================================= */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#eaedff] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <h3 className="text-base font-bold text-[#131b2e]">
                {editingLink ? 'Chỉnh sửa liên kết' : 'Thêm liên kết mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-[#6e7977] hover:text-[#ba1a1a] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="space-y-4">
              {/* Loại liên kết */}
              <div>
                <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                  Loại liên kết
                </label>
                <select
                  value={linkFormData.type}
                  onChange={(e) => setLinkFormData({ ...linkFormData, type: e.target.value })}
                  className="w-full h-10 px-3 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-sm text-[#131b2e] outline-none focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] cursor-pointer"
                >
                  {LINK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {linkFormData.type === 'other' && (
                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                    Tên nhãn liên kết
                  </label>
                  <input
                    type="text"
                    value={linkFormData.customType}
                    onChange={(e) => setLinkFormData({ ...linkFormData, customType: e.target.value })}
                    placeholder="VD: Dribbble, Medium..."
                    className="w-full h-10 px-3 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-sm text-[#131b2e] outline-none focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                  />
                  {linkErrors.type && (
                    <p className="mt-1 text-xs text-[#ba1a1a]">{linkErrors.type}</p>
                  )}
                </div>
              )}

              {/* Đường dẫn URL */}
              <div>
                <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                  Đường dẫn (URL) <span className="text-[#e03a3c]">*</span>
                </label>
                <input
                  type="text"
                  value={linkFormData.link}
                  onChange={(e) => setLinkFormData({ ...linkFormData, link: e.target.value })}
                  placeholder={
                    LINK_TYPES.find((t) => t.value === linkFormData.type)?.placeholder || 'https://...'
                  }
                  className={`w-full h-10 px-3 bg-[#f2f3ff] border rounded-xl text-sm text-[#131b2e] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] ${
                    linkErrors.link ? 'border-[#ba1a1a]' : 'border-[#eaedff]'
                  }`}
                />
                {linkErrors.link && (
                  <p className="mt-1 text-xs text-[#ba1a1a]">{linkErrors.link}</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e7977] hover:bg-[#eaedff] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingLink}
                  className="px-5 py-2 bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingLink ? 'Đang lưu...' : 'Lưu liên kết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Xác nhận xóa liên kết                                              */}
      {/* ========================================================================= */}
      {isDeleteLinkConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-[#eaedff] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="text-base font-bold text-[#131b2e]">Xóa liên kết này?</h3>
            </div>
            <p className="text-xs text-[#6e7977] leading-relaxed">
              Bạn có chắc chắn muốn xóa liên kết{' '}
              <strong className="text-[#131b2e]">{linkToDelete?.type}</strong> khỏi hồ sơ? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteLinkConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e7977] hover:bg-[#eaedff] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLink}
                disabled={deletingLink}
                className="px-4 py-2 bg-[#ba1a1a] hover:bg-[#991515] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deletingLink ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
