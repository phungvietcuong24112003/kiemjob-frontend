import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getRecruiterProfile,
  saveRecruiterProfile,
  getCompanyAddresses,
  addCompanyAddress,
  getCompanyLicenses,
  addCompanyLicense,
  deleteCompanyLicense,
  getCompanyImages,
  addCompanyImage,
  deleteCompanyImage,
  getProvinces,
  uploadFile,
} from '../../../infrastructure/api';
import CompanyTierBadge from '../../components/common/CompanyTierBadge';
import { getTierProgress, formatCurrency, getTierConfig } from '../../../infrastructure/utils/companyTierUtils';

export default function RecruiterCompanyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Profile Form State
  const [formData, setFormData] = useState({
    companyId: null,
    companyName: '',
    companyType: 'small',
    fullName: '',
    companyEmail: '',
    companyPhone: '',
    companyDescription: '',
    logoUrl: '',
    bannerUrl: '',
    status: 'pending',
    membershipTier: 'bronze',
    totalSpending: 0,
  });

  // Addresses & Licenses State
  const [addresses, setAddresses] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [provinces, setProvinces] = useState([]);

  // Company Images & Workplace Gallery State
  const [companyImages, setCompanyImages] = useState([]);
  const [uploadingCompanyImages, setUploadingCompanyImages] = useState(false);
  const companyImagesInputRef = useRef(null);

  // Fullscreen / Zoom Preview Modal
  const [previewImage, setPreviewImage] = useState(null); // { url, title }

  // New Address Form Modal/Inline
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    provinceId: '',
    addressDetail: '',
  });
  const [addingAddress, setAddingAddress] = useState(false);

  // New License State
  const [uploadingLicense, setUploadingLicense] = useState(false);

  // File Uploading states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const licenseInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Tải thông tin công ty và danh mục ban đầu
  useEffect(() => {
    fetchCompanyData();
    loadProvinces();
  }, []);

  const loadProvinces = async () => {
    try {
      const data = await getProvinces();
      if (Array.isArray(data)) {
        setProvinces(data);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách tỉnh/thành:', err);
    }
  };

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      // 1. Tải hồ sơ recruiter từ backend
      const res = await getRecruiterProfile();
      if (res) {
        setFormData({
          companyId: res.companyId || null,
          companyName: res.companyName || '',
          companyType: res.companyType || 'small',
          fullName: res.fullName || '',
          companyEmail: res.companyEmail || '',
          companyPhone: res.companyPhone || '',
          companyDescription: res.companyDescription || '',
          logoUrl: res.logoUrl || '',
          bannerUrl: res.bannerUrl || '',
          status: res.status || 'pending',
          membershipTier: res.membershipTier || 'bronze',
          totalSpending: res.totalSpending || 0,
        });

        // 2. Tải địa chỉ nếu có companyId
        if (res.companyId) {
          try {
            const addrList = await getCompanyAddresses(res.companyId);
            if (Array.isArray(addrList)) setAddresses(addrList);
          } catch (addrErr) {
            console.warn('Chưa có danh sách địa chỉ:', addrErr);
          }

          // 3. Tải giấy phép kinh doanh
          try {
            const licList = await getCompanyLicenses(res.companyId);
            if (Array.isArray(licList)) setLicenses(licList);
          } catch (licErr) {
            console.warn('Chưa có danh sách giấy phép:', licErr);
          }

          // 4. Tải danh sách hình ảnh hoạt động của công ty
          try {
            const imgList = await getCompanyImages(res.companyId);
            if (Array.isArray(imgList)) setCompanyImages(imgList);
          } catch (imgErr) {
            console.warn('Chưa có danh sách ảnh công ty:', imgErr);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin công ty:', err);
      // Fallback từ localStorage nếu API tạm thời chưa phản hồi
      try {
        const stored = localStorage.getItem('kiemjob_user');
        if (stored) {
          const user = JSON.parse(stored);
          setFormData((prev) => ({
            ...prev,
            companyId: user.companyId || null,
            companyName: user.company_name || user.company?.name || '',
            fullName: user.fullName || '',
            logoUrl: user.logo || user.avatar || '',
            companyEmail: user.email || '',
            companyPhone: user.phone || '',
            status: user.status || 'pending',
          }));
        }
      } catch {}
      showToast('Không thể tải thông tin mới nhất từ máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Xử lý Upload Logo lên AWS S3
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file hình ảnh (JPG, PNG, WebP)!', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh tối đa là 5MB!', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const uploadRes = await uploadFile(file);
      const newUrl = uploadRes?.fileUrl || uploadRes?.url || uploadRes?.data;
      if (newUrl) {
        setFormData((prev) => ({ ...prev, logoUrl: newUrl }));
        showToast('Tải lên Logo thành công!');
      } else {
        throw new Error('Không nhận được đường dẫn ảnh từ S3');
      }
    } catch (err) {
      console.error('Lỗi upload logo:', err);
      showToast('Tải ảnh logo thất bại, vui lòng thử lại!', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  // 3. Xử lý Upload Banner lên AWS S3
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file hình ảnh (JPG, PNG, WebP)!', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Kích thước ảnh bìa tối đa là 10MB!', 'error');
      return;
    }

    setUploadingBanner(true);
    try {
      const uploadRes = await uploadFile(file);
      const newUrl = uploadRes?.fileUrl || uploadRes?.url || uploadRes?.data;
      if (newUrl) {
        setFormData((prev) => ({ ...prev, bannerUrl: newUrl }));
        showToast('Tải lên ảnh bìa thành công!');
      } else {
        throw new Error('Không nhận được đường dẫn ảnh từ S3');
      }
    } catch (err) {
      console.error('Lỗi upload banner:', err);
      showToast('Tải ảnh bìa thất bại, vui lòng thử lại!', 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  // 4. Xử lý Lưu thông tin công ty
  const handleSaveProfile = async (e) => {
    e?.preventDefault();

    if (!formData.companyName.trim()) {
      showToast('Tên công ty không được để trống!', 'error');
      return;
    }

    if (!formData.fullName.trim()) {
      showToast('Họ tên người đại diện không được để trống!', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        companyName: formData.companyName.trim(),
        companyType: formData.companyType || 'small',
        logoUrl: formData.logoUrl || null,
        bannerUrl: formData.bannerUrl || null,
        companyEmail: formData.companyEmail?.trim() || null,
        companyPhone: formData.companyPhone?.trim() || null,
        companyDescription: formData.companyDescription?.trim() || null,
      };

      const res = await saveRecruiterProfile(payload);

      // Cập nhật lại localStorage để Header & Sidebar đồng bộ
      try {
        const stored = localStorage.getItem('kiemjob_user');
        const currentUser = stored ? JSON.parse(stored) : {};
        const updatedUser = {
          ...currentUser,
          fullName: payload.fullName,
          company_name: payload.companyName,
          companyName: payload.companyName,
          logo: payload.logoUrl,
          avatar: payload.logoUrl,
          companyId: res?.companyId || formData.companyId,
          company: {
            ...(currentUser.company || {}),
            id: res?.companyId || formData.companyId,
            name: payload.companyName,
            companyType: payload.companyType,
            logoUrl: payload.logoUrl,
            bannerUrl: payload.bannerUrl,
            email: payload.companyEmail,
            phone: payload.companyPhone,
            description: payload.companyDescription,
            status: res?.status || formData.status,
          },
        };
        localStorage.setItem('kiemjob_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('authChange'));
      } catch (storageErr) {
        console.warn('Lỗi cập nhật local storage:', storageErr);
      }

      setIsEditing(false);
      showToast('Cập nhật thông tin công ty thành công!');
    } catch (err) {
      console.error('Lỗi lưu thông tin công ty:', err);
      showToast(err.message || 'Lỗi khi lưu thông tin. Vui lòng thử lại!', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 5. Thêm Địa chỉ mới
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!formData.companyId) {
      showToast('Vui lòng lưu thông tin công ty trước khi thêm địa chỉ!', 'error');
      return;
    }
    if (!newAddress.provinceId) {
      showToast('Vui lòng chọn Tỉnh/Thành phố!', 'error');
      return;
    }
    if (!newAddress.addressDetail.trim()) {
      showToast('Vui lòng nhập địa chỉ chi tiết!', 'error');
      return;
    }

    setAddingAddress(true);
    try {
      const added = await addCompanyAddress(formData.companyId, {
        provinceId: Number(newAddress.provinceId),
        addressDetail: newAddress.addressDetail.trim(),
      });
      setAddresses((prev) => [...prev, added]);
      setNewAddress({ provinceId: '', addressDetail: '' });
      setShowAddAddress(false);
      showToast('Thêm địa chỉ thành công!');
    } catch (err) {
      console.error('Lỗi thêm địa chỉ:', err);
      showToast('Không thể thêm địa chỉ, vui lòng kiểm tra lại!', 'error');
    } finally {
      setAddingAddress(false);
    }
  };

  // 6. Tải lên Giấy phép kinh doanh mới (chỉ định dạng ảnh)
  const handleUploadLicense = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!formData.companyId) {
      showToast('Vui lòng hoàn tất lưu thông tin công ty trước!', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Giấy phép kinh doanh chỉ chấp nhận định dạng file ảnh (JPG, PNG, WebP)!', 'error');
      if (licenseInputRef.current) licenseInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Kích thước ảnh tối đa là 10MB!', 'error');
      return;
    }

    setUploadingLicense(true);
    try {
      const uploadRes = await uploadFile(file);
      const fileUrl = uploadRes?.fileUrl || uploadRes?.url || uploadRes?.data;
      if (!fileUrl) throw new Error('Không nhận được URL file từ máy chủ');

      const added = await addCompanyLicense(formData.companyId, {
        fileUrl: fileUrl,
      });

      setLicenses((prev) => [...prev, added]);
      showToast('Đã bổ sung giấy phép kinh doanh (ảnh) thành công!');
    } catch (err) {
      console.error('Lỗi upload giấy phép:', err);
      showToast('Tải giấy phép thất bại, vui lòng thử lại!', 'error');
    } finally {
      setUploadingLicense(false);
      if (licenseInputRef.current) {
        licenseInputRef.current.value = '';
      }
    }
  };

  // 7. Xóa Giấy phép kinh doanh
  const handleDeleteLicense = async (licenseId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản chụp giấy phép này không?')) return;
    try {
      await deleteCompanyLicense(formData.companyId, licenseId);
      setLicenses((prev) => prev.filter((lic) => lic.id !== licenseId));
      showToast('Đã xóa giấy phép kinh doanh thành công!');
    } catch (err) {
      console.error('Lỗi xóa giấy phép:', err);
      showToast('Không thể xóa giấy phép. Vui lòng thử lại!', 'error');
    }
  };

  // 8. Tải lên danh sách ảnh hoạt động / môi trường làm việc của công ty
  const handleUploadCompanyImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!formData.companyId) {
      showToast('Vui lòng lưu thông tin công ty trước khi thêm ảnh!', 'error');
      return;
    }

    const nonImages = files.filter((f) => !f.type.startsWith('image/'));
    if (nonImages.length > 0) {
      showToast('Tất cả file phải là hình ảnh (JPG, PNG, WebP)!', 'error');
      if (companyImagesInputRef.current) companyImagesInputRef.current.value = '';
      return;
    }

    setUploadingCompanyImages(true);
    let successCount = 0;
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          showToast(`Ảnh ${file.name} vượt quá 10MB, đã bỏ qua!`, 'error');
          continue;
        }
        const uploadRes = await uploadFile(file);
        const fileUrl = uploadRes?.fileUrl || uploadRes?.url || uploadRes?.data;
        if (fileUrl) {
          const added = await addCompanyImage(formData.companyId, { url: fileUrl });
          if (added) {
            setCompanyImages((prev) => [...prev, added]);
            successCount++;
          }
        }
      }
      if (successCount > 0) {
        showToast(`Đã tải lên thành công ${successCount} ảnh công ty!`);
      }
    } catch (err) {
      console.error('Lỗi upload ảnh công ty:', err);
      showToast('Có lỗi xảy ra khi tải ảnh lên, vui lòng thử lại!', 'error');
    } finally {
      setUploadingCompanyImages(false);
      if (companyImagesInputRef.current) {
        companyImagesInputRef.current.value = '';
      }
    }
  };

  // 9. Xóa ảnh công ty
  const handleDeleteCompanyImage = async (imageId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi hồ sơ công ty không?')) return;
    try {
      await deleteCompanyImage(formData.companyId, imageId);
      setCompanyImages((prev) => prev.filter((img) => img.id !== imageId));
      showToast('Đã xóa ảnh công ty thành công!');
    } catch (err) {
      console.error('Lỗi xóa ảnh công ty:', err);
      showToast('Không thể xóa ảnh. Vui lòng thử lại!', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-10 h-10 border-4 border-[#005c55] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#3e4947]">Đang tải thông tin doanh nghiệp...</p>
      </div>
    );
  }

  const isPending = formData.status === 'pending' || !formData.status;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-white transition-all transform animate-bounce ${
            toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#005c55]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={bannerInputRef}
        onChange={handleBannerUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={licenseInputRef}
        onChange={handleUploadLicense}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={companyImagesInputRef}
        onChange={handleUploadCompanyImages}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight">
            Thông Tin Doanh Nghiệp
          </h1>
          <p className="text-xs sm:text-sm text-[#3e4947] mt-0.5">
            Quản lý hồ sơ công ty, thông tin đại diện pháp lý, địa chỉ trụ sở và giấy phép kinh doanh.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-[#eaedff] text-xs font-bold text-[#3e4947] hover:bg-[#f2f3ff] transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    <span>Lưu Thay Đổi</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span>Chỉnh Sửa Hồ Sơ</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Warning Banner */}
      {isPending ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-amber-900">
                Hồ sơ doanh nghiệp đang chờ kiểm duyệt (Pending)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900">
                Chờ duyệt
              </span>
            </div>
            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
              Thông tin công ty đang trong hàng đợi phê duyệt từ đội ngũ Quản trị viên KiemJob. Bạn vẫn có thể cập nhật thông tin và bổ sung giấy phép kinh doanh để được duyệt nhanh hơn.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#97f5cc]/20 border border-[#006c4e]/20 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#005c55] text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#00513a]">Hồ sơ doanh nghiệp đã được xác thực (Verified)</h4>
            <p className="text-xs text-[#006c4e] mt-0.5">
              Doanh nghiệp của bạn có huy hiệu chứng nhận uy tín trên nền tảng KiemJob.
            </p>
          </div>
        </div>
      )}

      {/* Main Company Card with Banner & Logo */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Banner Area */}
        <div className="relative h-44 sm:h-52 bg-slate-800 overflow-hidden">
          {formData.bannerUrl ? (
            <img
              src={formData.bannerUrl}
              alt="Company Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              <span className="material-symbols-outlined text-[56px]">apartment</span>
            </div>
          )}

          {/* Change Banner Button */}
          {isEditing && (
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold rounded-lg backdrop-blur-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {uploadingBanner ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
              )}
              <span>{uploadingBanner ? 'Đang tải...' : 'Đổi ảnh bìa'}</span>
            </button>
          )}
        </div>

        {/* Company Header Info (Logo & Quick stats) */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-5">
            <div className="flex items-end gap-3.5">
              {/* Logo Avatar */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1.5 shadow-md border border-slate-200 shrink-0">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-[#f2f3ff] flex items-center justify-center">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt={formData.companyName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[48px] text-[#005c55]">
                      corporate_fare
                    </span>
                  )}
                </div>

                {/* Upload Logo Trigger Button */}
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-[#005c55] hover:bg-[#007952] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                    title="Tải lên logo mới"
                  >
                    {uploadingLogo ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    )}
                  </button>
                )}
              </div>

              {/* Title & Quick Info */}
              <div className="mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#131b2e]">
                    {formData.companyName || 'Tên doanh nghiệp'}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isPending
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-[#97f5cc]/50 text-[#00513a] border border-[#006c4e]/30'
                    }`}
                  >
                    {isPending ? 'Chờ duyệt' : 'Đã duyệt'}
                  </span>
                  <CompanyTierBadge tier={formData.membershipTier || 'bronze'} size="sm" />
                </div>
                <p className="text-xs text-[#6e7977] mt-1 flex items-center gap-2">
                  <span className="font-semibold text-[#005c55]">
                    {formData.companyType === 'big'
                      ? 'Doanh nghiệp lớn / Tập đoàn'
                      : 'Doanh nghiệp vừa & nhỏ (SME)'}
                  </span>
                  <span>•</span>
                  <span>Người đại diện: <strong>{formData.fullName || 'Chưa cập nhật'}</strong></span>
                </p>
              </div>
            </div>

            {/* Quick Contact Tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {formData.companyEmail && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f2f3ff] rounded-xl text-[#3e4947]">
                  <span className="material-symbols-outlined text-[16px] text-[#005c55]">mail</span>
                  <span>{formData.companyEmail}</span>
                </div>
              )}
              {formData.companyPhone && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f2f3ff] rounded-xl text-[#3e4947]">
                  <span className="material-symbols-outlined text-[16px] text-[#005c55]">call</span>
                  <span>{formData.companyPhone}</span>
                </div>
              )}
            </div>

            {/* Membership Tier & Spending Card */}
            {(() => {
              const progress = getTierProgress(formData.totalSpending);
              return (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#f8fafc] via-[#f1f5f9] to-[#eaedff] border border-[#eaedff] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#005c55] shrink-0">
                      <span className="material-symbols-outlined text-[28px]">
                        {getTierConfig(formData.membershipTier).icon}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#6e7977]">Cấp bậc doanh nghiệp:</span>
                        <CompanyTierBadge tier={formData.membershipTier || 'bronze'} size="sm" />
                      </div>
                      <p className="text-xs text-[#131b2e] mt-0.5">
                        Tổng chi tiêu tích lũy: <strong className="text-[#005c55] text-sm">{formatCurrency(formData.totalSpending || 0)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Progress to next tier */}
                  <div className="flex-1 max-w-md">
                    {progress.isMaxTier ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Doanh nghiệp đã đạt thứ hạng cao nhất (Platinum VIP)!</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-[#475569]">
                            Tiến độ lên hạng <strong className="text-[#005c55]">{progress.nextTierName}</strong>
                          </span>
                          <span className="text-[#005c55]">
                            Chi thêm {formatCurrency(progress.neededAmount)} ({progress.percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#005c55] to-[#97f5cc] rounded-full transition-all duration-500"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/recruiter/orders"
                    className="px-3.5 py-2 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    <span>Nâng hạng gói</span>
                  </Link>
                </div>
              );
            })()}
          </div>

          {/* Form Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-[#f2f3ff]">
            {/* Left 2 Columns: General Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#6e7977] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#005c55]">info</span>
                  <span>Thông tin chung</span>
                </h3>

                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                        Tên công ty / Doanh nghiệp <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) =>
                          setFormData({ ...formData, companyName: e.target.value })
                        }
                        placeholder="VD: Công ty Cổ phần Công nghệ ABC..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#eaedff] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                        Quy mô công ty <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.companyType}
                        onChange={(e) =>
                          setFormData({ ...formData, companyType: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#eaedff] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55] bg-white"
                      >
                        <option value="small">Doanh nghiệp vừa & nhỏ (SME - Dưới 100 nhân sự)</option>
                        <option value="big">Doanh nghiệp lớn / Tập đoàn (Trên 100 nhân sự)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                        Họ và tên người đại diện tuyển dụng <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        placeholder="VD: Nguyễn Văn A"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#eaedff] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                        Email liên hệ doanh nghiệp
                      </label>
                      <input
                        type="email"
                        value={formData.companyEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, companyEmail: e.target.value })
                        }
                        placeholder="contact@company.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#eaedff] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                        Số điện thoại / Hotline
                      </label>
                      <input
                        type="tel"
                        value={formData.companyPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, companyPhone: e.target.value })
                        }
                        placeholder="024.1234.5678"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#eaedff] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                        Giới thiệu về công ty / Văn hóa doanh nghiệp
                      </label>
                      <textarea
                        rows={4}
                        value={formData.companyDescription}
                        onChange={(e) =>
                          setFormData({ ...formData, companyDescription: e.target.value })
                        }
                        placeholder="Mô tả tầm nhìn, sứ mệnh, sản phẩm nổi bật và môi trường làm việc..."
                        className="w-full p-3.5 rounded-xl border border-[#eaedff] text-xs sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#faf8ff] p-4 rounded-2xl border border-[#eaedff]">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e7977] block">
                          Tên công ty
                        </span>
                        <span className="text-sm font-bold text-[#131b2e]">
                          {formData.companyName || 'Chưa cung cấp'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e7977] block">
                          Quy mô
                        </span>
                        <span className="text-sm font-semibold text-[#131b2e]">
                          {formData.companyType === 'big'
                            ? 'Doanh nghiệp lớn / Tập đoàn'
                            : 'Doanh nghiệp vừa & nhỏ (SME)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e7977] block">
                          Người đại diện
                        </span>
                        <span className="text-sm font-semibold text-[#131b2e]">
                          {formData.fullName || 'Chưa cung cấp'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e7977] block">
                          Hotline liên hệ
                        </span>
                        <span className="text-sm font-semibold text-[#131b2e]">
                          {formData.companyPhone || 'Chưa cung cấp'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e7977] block mb-1.5">
                        Giới thiệu & Văn hóa doanh nghiệp
                      </span>
                      <div className="text-xs sm:text-sm text-[#3e4947] leading-relaxed bg-[#faf8ff] p-4 rounded-2xl border border-[#eaedff] whitespace-pre-line">
                        {formData.companyDescription ||
                          'Doanh nghiệp chưa bổ sung phần mô tả giới thiệu chi tiết.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Company Headquarters Addresses Section */}
              <div className="space-y-3 pt-4 border-t border-[#f2f3ff]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#6e7977] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#005c55]">location_on</span>
                    <span>Địa chỉ trụ sở & Chi nhánh</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(!showAddAddress)}
                    className="text-xs font-bold text-[#005c55] hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Thêm địa chỉ</span>
                  </button>
                </div>

                {/* Form Add Address */}
                {showAddAddress && (
                  <form
                    onSubmit={handleAddAddress}
                    className="p-4 bg-[#f2f3ff] rounded-2xl border border-[#eaedff] space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#131b2e] mb-1">
                          Tỉnh / Thành phố <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newAddress.provinceId}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, provinceId: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white rounded-xl border border-[#eaedff] text-xs font-semibold focus:ring-2 focus:ring-[#005c55]/20 focus:outline-none"
                          required
                        >
                          <option value="">-- Chọn Tỉnh / Thành phố --</option>
                          {provinces.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#131b2e] mb-1">
                          Địa chỉ chi tiết (Tòa nhà, số nhà, đường) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newAddress.addressDetail}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, addressDetail: e.target.value })
                          }
                          placeholder="VD: Tòa nhà Capital, Số 109 Trần Hưng Đạo"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-[#eaedff] text-xs font-semibold focus:ring-2 focus:ring-[#005c55]/20 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(false)}
                        className="px-3 py-1.5 rounded-lg border border-[#eaedff] text-xs font-semibold text-[#3e4947] bg-white hover:bg-[#faf8ff]"
                      >
                        Đóng
                      </button>
                      <button
                        type="submit"
                        disabled={addingAddress}
                        className="px-4 py-1.5 rounded-lg bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold transition-all shadow-sm"
                      >
                        {addingAddress ? 'Đang thêm...' : 'Lưu địa chỉ'}
                      </button>
                    </div>
                  </form>
                )}

                {/* List Addresses */}
                {addresses.length === 0 ? (
                  <div className="p-4 bg-[#faf8ff] rounded-2xl border border-dashed border-[#eaedff] text-center text-xs text-[#6e7977]">
                    Chưa có địa chỉ trụ sở nào được thiết lập. Hãy bấm nút "Thêm địa chỉ" ở trên.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {addresses.map((addr) => {
                      const prov = provinces.find((p) => p.id === addr.provinceId);
                      return (
                        <div
                          key={addr.id}
                          className="p-3.5 bg-[#faf8ff] rounded-2xl border border-[#eaedff] flex items-start gap-2.5"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#005c55] mt-0.5">
                            pin_drop
                          </span>
                          <div>
                            <span className="text-xs font-bold text-[#131b2e] block">
                              {prov?.name || `Tỉnh ID #${addr.provinceId}`}
                            </span>
                            <span className="text-xs text-[#3e4947] mt-0.5 block">
                              {addr.addressDetail}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Company Workplace & Culture Images Section */}
              <div className="space-y-3 pt-6 border-t border-[#f2f3ff]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#6e7977] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#005c55]">photo_library</span>
                      <span>Hình ảnh hoạt động & Môi trường làm việc</span>
                      {companyImages.length > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#005c55]/10 text-[#005c55]">
                          {companyImages.length} ảnh
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#6e7977] mt-0.5">
                      Hình ảnh văn phòng, đội ngũ nhân sự và hoạt động thực tế giúp hồ sơ công ty trở nên uy tín và thu hút ứng viên hơn.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => companyImagesInputRef.current?.click()}
                    disabled={uploadingCompanyImages}
                    className="px-3.5 py-2 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0 self-start sm:self-auto"
                  >
                    {uploadingCompanyImages ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                    )}
                    <span>{uploadingCompanyImages ? 'Đang tải...' : 'Thêm ảnh công ty'}</span>
                  </button>
                </div>

                {companyImages.length === 0 ? (
                  <div
                    onClick={() => companyImagesInputRef.current?.click()}
                    className="p-8 bg-[#faf8ff] rounded-2xl border-2 border-dashed border-[#eaedff] hover:border-[#005c55]/40 text-center cursor-pointer transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#eaedff]/60 group-hover:bg-[#005c55]/10 text-[#005c55] flex items-center justify-center mx-auto mb-2 transition-colors">
                      <span className="material-symbols-outlined text-[28px]">add_photo_alternate</span>
                    </div>
                    <span className="text-xs font-bold text-[#131b2e] block">
                      Chưa có hình ảnh hoạt động nào
                    </span>
                    <span className="text-xs text-[#6e7977] mt-1 block">
                      Bấm vào đây để tải lên hình ảnh văn phòng, hoạt động team building... (chọn được nhiều ảnh cùng lúc)
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {companyImages.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        className="group relative aspect-4/3 rounded-2xl overflow-hidden bg-gray-100 border border-[#eaedff] shadow-xs"
                      >
                        <img
                          src={img.url}
                          alt={`Ảnh công ty ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: img.url,
                                title: `Ảnh hoạt động công ty #${idx + 1}`,
                              })
                            }
                            className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#131b2e] flex items-center justify-center shadow transition-transform active:scale-90 cursor-pointer"
                            title="Xem kích thước lớn"
                          >
                            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompanyImage(img.id)}
                            className="w-8 h-8 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow transition-transform active:scale-90 cursor-pointer"
                            title="Xóa ảnh này"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Quick upload tile inside grid */}
                    <button
                      type="button"
                      onClick={() => companyImagesInputRef.current?.click()}
                      disabled={uploadingCompanyImages}
                      className="aspect-4/3 rounded-2xl border-2 border-dashed border-[#eaedff] hover:border-[#005c55] hover:bg-[#faf8ff] transition-all flex flex-col items-center justify-center text-[#6e7977] hover:text-[#005c55] cursor-pointer"
                    >
                      {uploadingCompanyImages ? (
                        <div className="w-6 h-6 border-2 border-[#005c55] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[24px]">add</span>
                          <span className="text-[11px] font-bold mt-1">Thêm ảnh</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Column: Legal & License Verification (Image only) */}
            <div className="space-y-6">
              <div className="p-5 bg-[#faf8ff] rounded-2xl border border-[#eaedff] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#6e7977] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#005c55]">verified_user</span>
                    <span>Giấy phép kinh doanh</span>
                  </h3>
                  {licenses.length > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#97f5cc]/40 text-[#00513a]">
                      Đã bổ sung ({licenses.length})
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#3e4947] leading-relaxed">
                  Bổ sung bản chụp <strong>Giấy phép đăng ký kinh doanh</strong> (dưới dạng file ảnh rõ nét: JPG, PNG, WebP) để xác minh tính chính danh của tài khoản tuyển dụng.
                </p>

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => licenseInputRef.current?.click()}
                  disabled={uploadingLicense}
                  className="w-full py-2.5 bg-[#005c55] hover:bg-[#007952] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {uploadingLicense ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                  )}
                  <span>{uploadingLicense ? 'Đang tải ảnh lên S3...' : 'Bổ sung ảnh giấy phép'}</span>
                </button>

                {/* Licenses Image Cards List */}
                <div className="space-y-3 pt-1">
                  {licenses.length === 0 ? (
                    <div
                      onClick={() => licenseInputRef.current?.click()}
                      className="p-6 bg-white rounded-2xl border-2 border-dashed border-[#eaedff] hover:border-[#005c55]/40 text-center text-xs text-[#6e7977] cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[32px] text-[#bdc9c6] block mb-1">
                        badge
                      </span>
                      <span className="font-semibold block text-[#131b2e]">Chưa có ảnh chụp giấy phép kinh doanh</span>
                      <span className="text-[11px] text-[#6e7977] mt-0.5 block">Nhấn vào đây để chọn file ảnh giấy phép</span>
                    </div>
                  ) : (
                    licenses.map((lic, idx) => {
                      const imgUrl = lic.fileUrl || lic.licenseUrl;
                      return (
                        <div
                          key={lic.id || idx}
                          className="bg-white rounded-2xl border border-[#eaedff] p-3 shadow-xs space-y-2.5"
                        >
                          {/* Image preview thumbnail */}
                          {imgUrl && (
                            <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group">
                              <img
                                src={imgUrl}
                                alt={`Ảnh giấy phép kinh doanh #${idx + 1}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: imgUrl,
                                      title: 'Ảnh chụp Giấy phép kinh doanh',
                                    })
                                  }
                                  className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#131b2e] flex items-center justify-center shadow transition-transform active:scale-90 cursor-pointer"
                                  title="Xem ảnh phóng to"
                                >
                                  <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                                </button>
                                <a
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#005c55] flex items-center justify-center shadow transition-transform active:scale-90"
                                  title="Mở ảnh gốc trong tab mới"
                                >
                                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                </a>
                              </div>
                            </div>
                          )}

                          {/* License Info & Delete */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="material-symbols-outlined text-[18px] text-[#005c55]">
                                verified
                              </span>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-[#131b2e] block truncate">
                                  Bản chụp giấy phép #{idx + 1}
                                </span>
                                <span className="text-[10px] text-[#6e7977] block">
                                  Định dạng: Hình ảnh
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteLicense(lic.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa giấy phép này"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Support & Quick tips */}
              <div className="p-4 bg-[#f2f3ff] rounded-2xl border border-[#eaedff] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#005c55]">
                  <span className="material-symbols-outlined text-[18px]">help</span>
                  <span>Hỗ trợ phê duyệt nhanh</span>
                </div>
                <p className="text-xs text-[#3e4947] leading-relaxed">
                  Hồ sơ có đầy đủ Logo chất lượng cao, Banner nhận diện, ảnh văn phòng và bản chụp Giấy phép kinh doanh rõ nét sẽ được ưu tiên duyệt trong vòng <strong>2 - 4 giờ làm việc</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Fullscreen Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#eaedff] bg-[#faf8ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#005c55]">image</span>
                <h4 className="text-sm font-bold text-[#131b2e]">
                  {previewImage.title || 'Xem chi tiết hình ảnh'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-[#eaedff] text-[#3e4947] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Image Area */}
            <div className="p-4 flex items-center justify-center overflow-auto bg-neutral-900/95 max-h-[72vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title || 'Hình ảnh'}
                className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#faf8ff] border-t border-[#eaedff] flex items-center justify-between text-xs text-[#6e7977]">
              <span>Nhấn vào nút Đóng hoặc click bên ngoài để thoát</span>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#005c55] font-bold hover:underline"
              >
                <span>Mở ảnh gốc trong tab mới</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
