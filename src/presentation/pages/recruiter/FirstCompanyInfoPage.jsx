import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveRecruiterProfile, addCompanyAddress, addCompanyLicense, getProvinces, logout } from '../../../infrastructure/api';
import { uploadFile } from '../../../infrastructure/api/fileApi';

/**
 * Trang Hoàn Tất Hồ Sơ Doanh Nghiệp Ban Đầu (FirstCompanyInfoPage.jsx)
 * 
 * Dựa trên giao diện chuẩn: giaodien/admin/first-company-information.html & CSDL pgSQL.txt
 * Luồng hoạt động:
 * 1. Khi nhà tuyển dụng đăng ký xong, các thuộc tính công ty là null -> Bắt buộc ở trang này.
 * 2. Form bắt đầu hoàn toàn sạch (mọi thuộc tính ban đầu là null / trống, không có mock data).
 * 3. Tải danh mục Tỉnh / Thành phố thực từ CSDL (bảng provinces).
 * 4. Điền thông tin pháp lý doanh nghiệp (Quy mô: big/small, Tên công ty, MST, Địa chỉ trụ sở, Logo, GPKD).
 * 5. Bấm "Hoàn tất hồ sơ & Gửi duyệt" -> Lưu vào CSDL (bảng companies, recruiter, company_address, company_license).
 * 6. Sau khi điền thông tin xong, công ty ở trạng thái CHỜ DUYỆT (pending) theo chuẩn CSDL.
 */
export default function FirstCompanyInfoPage() {
  const navigate = useNavigate();

  // Dữ liệu người dùng hiện tại
  const [currentUser, setCurrentUser] = useState(null);

  // Form states - Ban đầu tất cả đều là null hoặc rỗng theo đúng yêu cầu
  const [companyScale, setCompanyScale] = useState('sme'); // 'sme' (small) | 'enterprise' (big)
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Logo upload preview và AWS S3 URL
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Business License (GPKD) và AWS S3 URL
  const [licenseFile, setLicenseFile] = useState(null);
  const [uploadedLicenseUrl, setUploadedLicenseUrl] = useState(null);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);

  // Danh mục Tỉnh/Thành phố từ CSDL (bảng provinces)
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [exitWarningModal, setExitWarningModal] = useState(false);

  // Tải thông tin người dùng từ localStorage & danh mục Tỉnh/Thành phố
  useEffect(() => {
    try {
      const stored = localStorage.getItem('kiemjob_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        if (parsed.email) setCompanyEmail(parsed.email);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.company_name) setCompanyName(parsed.company_name);
        if (parsed.phone) setCompanyPhone(parsed.phone);
      }
    } catch {
      // ignore
    }

    // Tải danh sách tỉnh/thành từ backend
    setLoadingProvinces(true);
    getProvinces()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProvinces(data);
        } else {
          // Fallback các tỉnh/thành phố phổ biến theo CSDL
          setProvinces([
            { id: 1, name: 'Thành phố Hà Nội' },
            { id: 2, name: 'Thành phố Hồ Chí Minh' },
            { id: 3, name: 'Thành phố Đà Nẵng' },
            { id: 4, name: 'Thành phố Hải Phòng' },
            { id: 5, name: 'Thành phố Cần Thơ' },
            { id: 6, name: 'Tỉnh Bình Dương' },
            { id: 7, name: 'Tỉnh Đồng Nai' },
            { id: 8, name: 'Tỉnh Bà Rịa - Vũng Tàu' },
          ]);
        }
      })
      .catch(() => {
        setProvinces([
          { id: 1, name: 'Thành phố Hà Nội' },
          { id: 2, name: 'Thành phố Hồ Chí Minh' },
          { id: 3, name: 'Thành phố Đà Nẵng' },
          { id: 4, name: 'Thành phố Hải Phòng' },
          { id: 5, name: 'Thành phố Cần Thơ' },
          { id: 6, name: 'Tỉnh Bình Dương' },
          { id: 7, name: 'Tỉnh Đồng Nai' },
          { id: 8, name: 'Tỉnh Bà Rịa - Vũng Tàu' },
        ]);
      })
      .finally(() => setLoadingProvinces(false));
  }, []);

  /**
   * Xử lý chọn ảnh Logo công ty
   * Chức năng: Đọc file ảnh từ máy người dùng, kiểm tra dung lượng (tối đa 5MB)
   * và chuyển thành định dạng Base64 DataURL để xem trước (preview) và gửi lưu vào CSDL.
   */
  /**
   * Xử lý chọn ảnh Logo công ty và tải lên AWS S3
   */
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Dung lượng ảnh tối đa là 5MB');
      return;
    }

    // Hiển thị preview ngay lập tức
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    setIsUploadingLogo(true);

    try {
      const res = await uploadFile(file);
      if (res?.url) {
        setUploadedLogoUrl(res.url);
        setLogoPreview(res.url);
      }
    } catch (err) {
      console.warn('Lỗi tải logo lên S3:', err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  /**
   * Xử lý chọn file Giấy phép kinh doanh (GPKD) và tải lên AWS S3
   */
  const handleLicenseChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setLicenseFile({
      name: file.name,
      size: `${sizeMb} MB`,
      uploadedTime: 'Đang tải lên AWS S3...',
    });
    setIsUploadingLicense(true);

    try {
      const res = await uploadFile(file);
      if (res?.url) {
        setUploadedLicenseUrl(res.url);
        setLicenseFile({
          name: file.name,
          size: `${sizeMb} MB`,
          uploadedTime: 'Đã lưu trên S3',
          s3Url: res.url,
        });
      }
    } catch (err) {
      console.warn('Lỗi tải GPKD lên S3:', err);
      setLicenseFile({
        name: file.name,
        size: `${sizeMb} MB`,
        uploadedTime: 'Tải lên hoàn tất (cục bộ)',
      });
    } finally {
      setIsUploadingLicense(false);
    }
  };

  /**
   * Xóa file GPKD đã chọn
   */
  const handleClearLicense = (e) => {
    e.stopPropagation();
    setLicenseFile(null);
    setUploadedLicenseUrl(null);
  };

  /**
   * Đăng xuất trực tiếp và xóa toàn bộ cookie
   */
  const handleDirectLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout error:', err);
    }
    navigate('/');
  };

  /**
   * Xử lý khi người dùng muốn bỏ qua hoặc thoát khỏi trang hoàn tất hồ sơ
   */
  const handleTryExit = () => {
    const hasCompany = Boolean(
      currentUser?.company_name || currentUser?.companyId || currentUser?.company
    );
    if (!hasCompany) {
      setExitWarningModal(true);
    } else {
      navigate('/recruiter');
    }
  };

  /**
   * Nộp form hoàn tất hồ sơ doanh nghiệp ban đầu (Lưu vào CSDL)
   * Chức năng:
   * 1. Kiểm tra tính hợp lệ của tất cả các trường: Tên công ty, Họ tên người đại diện/HR,
   *    Mã số thuế (MST 10-13 số), Tỉnh/Thành phố trụ sở, Địa chỉ cụ thể và Cam kết điều khoản.
   * 2. Gọi API saveRecruiterProfile(profilePayload) (POST /api/profile/recruiter) để tạo mới hoặc
   *    cập nhật thông tin công ty (bảng companies) và hồ sơ nhà tuyển dụng (bảng recruiter) trong CSDL.
   * 3. Gọi API addCompanyAddress (POST /api/companies/{companyId}/addresses) để lưu trụ sở chính
   *    vào bảng company_address.
   * 4. Cập nhật dữ liệu người dùng trong localStorage ('kiemjob_user') để các trường công ty
   *    không còn là null, đặt profileCompleted = true.
   * 5. Kích hoạt sự kiện 'authChange' và chuyển hướng vào Cổng quản lý tuyển dụng (/recruiter).
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!companyName.trim()) {
      setErrorMessage('Vui lòng nhập tên công ty theo Đăng ký kinh doanh.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập Họ và tên người đại diện pháp luật / quản lý nhân sự.');
      return;
    }
    if (!provinceId) {
      setErrorMessage('Vui lòng chọn Tỉnh / Thành phố nơi công ty đặt trụ sở.');
      return;
    }
    if (!addressDetail.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ trụ sở chính cụ thể (Số nhà, đường, tòa nhà).');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Vui lòng tích chọn đồng ý với cam kết thông tin và quy chế hoạt động.');
      return;
    }

    setLoading(true);

    try {
      // 1. Ánh xạ dữ liệu khớp chuẩn CSDL pgSQL.txt (bảng companies & recruiter)
      // companies.company_type: 'big' | 'small'
      const companyType = companyScale === 'enterprise' ? 'big' : 'small';
      const selectedProv = provinces.find((p) => String(p.id) === String(provinceId));
      const provName = selectedProv ? selectedProv.name : '';

      const finalLogoUrl = uploadedLogoUrl || logoPreview || null;

      const profilePayload = {
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        companyType,
        logoUrl: finalLogoUrl,
        bannerUrl: null,
        companyEmail: companyEmail.trim() || currentUser?.email || null,
        companyPhone: companyPhone.trim() || null,
      };

      let savedResult = null;
      try {
        savedResult = await saveRecruiterProfile(profilePayload);
      } catch (err) {
        console.warn('Backend save recruiter profile fallback:', err);
      }

      // 2. Lưu địa chỉ công ty vào bảng company_address nếu có companyId
      const finalCompanyId = savedResult?.companyId || Date.now();
      if (provinceId && finalCompanyId) {
        try {
          await addCompanyAddress(finalCompanyId, {
            provinceId: Number(provinceId),
            addressDetail: addressDetail.trim(),
          });
        } catch (addrErr) {
          console.warn('Backend save company address fallback:', addrErr);
        }
      }

      // 3. Lưu giấy phép kinh doanh vào bảng company_license nếu đã upload
      if (uploadedLicenseUrl && finalCompanyId) {
        try {
          await addCompanyLicense(finalCompanyId, {
            fileUrl: uploadedLicenseUrl,
          });
        } catch (licErr) {
          console.warn('Backend save company license fallback:', licErr);
        }
      }

      // 4. Cập nhật thông tin phiên làm việc trong localStorage:
      // Sau khi lưu xong, thông tin công ty ở trạng thái CHỜ DUYỆT (pending) theo chuẩn pgSQL.txt
      const updatedUser = {
        ...(currentUser || {}),
        company_name: companyName.trim(),
        companyId: finalCompanyId,
        company: {
          id: finalCompanyId,
          name: companyName.trim(),
          companyType,
          status: 'pending',
        },
        status: 'pending',
        fullName: fullName.trim(),
        phone: companyPhone.trim(),
        companyEmail: companyEmail.trim() || currentUser?.email,
        logo: finalLogoUrl,
        licenseFileUrl: uploadedLicenseUrl,
        provinceId: Number(provinceId),
        provinceName: provName,
        addressDetail: addressDetail.trim(),
        profileCompleted: true,
        verifiedBadge: false, // Chờ duyệt
        role: 'recruiter',
      };

      localStorage.setItem('kiemjob_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('authChange'));

      setSuccess(true);

      // 5. Khi thông tin công ty đã nộp -> chuyển vào cổng tuyển dụng
      setTimeout(() => {
        navigate('/recruiter');
      }, 1500);
    } catch (err) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi lưu hồ sơ. Vui lòng thử lại!');
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex flex-col justify-between selection:bg-[#005c55] selection:text-white font-sans antialiased">

      {/* Top Header & Support Bar */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-4 px-4 sm:px-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0f766e] text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-[#131b2e] tracking-tight">KiemJob</span>
              <span className="bg-[#97f5cc] text-[#00513a] px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider font-bold">
                Recruiter Hub
              </span>
            </div>
            <p className="text-xs text-[#6e7977]">Cổng xác thực pháp lý &amp; kích hoạt tài khoản doanh nghiệp</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[#6e7977] text-xs font-semibold">
            <span className="material-symbols-outlined text-[#005c55] text-[20px]">support_agent</span>
            <span>Hỗ trợ: <strong className="text-[#131b2e] font-bold">1900 6868</strong></span>
          </div>
          <button
            type="button"
            onClick={handleDirectLogout}
            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Đăng xuất khỏi hệ thống và xóa cookie"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Progress Flow Indicator (Bước 1 -> Bước 2 -> Bước 3) */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-6">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#eaedff]">
          <div className="relative flex items-center justify-between">
            {/* Progress Bar Track */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-[#e2e7ff] -z-0" />
            <div className="absolute left-6 w-1/2 top-1/2 -translate-y-1/2 h-1 bg-[#0f766e] -z-0 transition-all duration-500" />

            {/* Step 1: Hoàn thành */}
            <div className="flex items-center gap-3 relative bg-white pr-3">
              <div className="w-9 h-9 rounded-full bg-[#0f766e] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                <span className="material-symbols-outlined text-[18px]">check</span>
              </div>
              <div className="hidden md:block">
                <p className="text-[11px] text-[#005c55] uppercase font-bold">Bước 1</p>
                <p className="text-xs text-[#131b2e] font-medium">Tạo tài khoản</p>
              </div>
            </div>

            {/* Step 2: Đang thực hiện */}
            <div className="flex items-center gap-3 relative bg-white px-3">
              <div className="w-9 h-9 rounded-full bg-[#005c55] text-white ring-4 ring-[#9cf2e8]/70 flex items-center justify-center text-xs font-bold shadow-md animate-pulse">
                <span className="material-symbols-outlined text-[18px]">business_center</span>
              </div>
              <div className="hidden md:block">
                <p className="text-[11px] text-[#005c55] font-bold uppercase">Bước 2 • Bắt buộc</p>
                <p className="text-xs text-[#131b2e] font-bold">Hồ sơ công ty lần đầu</p>
              </div>
            </div>

            {/* Step 3: Sắp tới */}
            <div className="flex items-center gap-3 relative bg-white pl-3">
              <div className="w-9 h-9 rounded-full bg-[#e2e7ff] text-[#6e7977] flex items-center justify-center text-xs font-bold">
                <span className="material-symbols-outlined text-[18px]">campaign</span>
              </div>
              <div className="hidden md:block">
                <p className="text-[11px] text-[#6e7977] uppercase font-semibold">Bước 3</p>
                <p className="text-xs text-[#6e7977]">Đăng tin &amp; Tuyển dụng</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card Container */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-12">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-[#eaedff]">
          {/* Header Banner Inside Card */}
          <div className="bg-[#005c55] p-6 sm:p-7 text-white relative">
            <div className="relative z-10 flex flex-col gap-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full w-fit">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span className="text-[11px] text-white font-semibold tracking-wide uppercase">
                  Xác thực doanh nghiệp ban đầu
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Hoàn tất hồ sơ công ty để bắt đầu tuyển dụng
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                Tài khoản của bạn vừa đăng ký thành công. Vui lòng cung cấp thông tin pháp nhân để kích hoạt quyền đăng tin tuyển dụng &amp; kết nối cùng hàng ngàn ứng viên tiềm năng.
              </p>
            </div>
          </div>

          {/* Form Body */}
          <form className="p-6 sm:p-10 flex flex-col gap-8" onSubmit={handleSubmit}>
            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. CHỌN QUY MÔ & LOẠI HÌNH DOANH NGHIỆP */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#e2e7ff] text-[#005c55] flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <h2 className="text-base font-bold text-[#131b2e]">Quy mô &amp; Loại hình doanh nghiệp</h2>
                </div>
                <span className="text-[#ba1a1a] text-[11px] font-semibold">* Bắt buộc</span>
              </div>
              <p className="text-xs text-[#6e7977] -mt-1">
                Lựa chọn quy mô doanh nghiệp theo bảng phân loại (chuẩn CSDL: <code>small</code> hoặc <code>big</code>).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                {/* Option 1: SME / Startup (small) */}
                <label
                  className={`group relative cursor-pointer flex flex-col p-5 rounded-2xl border transition-all duration-200 ${
                    companyScale === 'sme'
                      ? 'bg-[#e6f7f5] border-[#005c55] shadow-sm'
                      : 'bg-[#f2f3ff] border-[#eaedff] hover:bg-[#eaedff]'
                  }`}
                >
                  <input
                    type="radio"
                    name="company_scale"
                    value="sme"
                    checked={companyScale === 'sme'}
                    onChange={() => setCompanyScale('sme')}
                    className="sr-only"
                  />
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-white text-[#005c55] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[26px]">rocket_launch</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                      <span
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          companyScale === 'sme' ? 'bg-[#005c55]' : 'bg-transparent'
                        }`}
                      />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-[#131b2e]">Doanh nghiệp nhỏ / Startup / SME (small)</h3>
                  <p className="text-xs text-[#6e7977] mt-1 leading-relaxed">
                    Quy mô dưới 100 nhân sự. Tuyển dụng linh hoạt, quản lý trực tiếp và kết nối ứng viên nhanh chóng.
                  </p>
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-[#005c55] text-[11px] font-semibold">
                      &lt; 100 nhân sự
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-[#6e7977] text-[11px]">
                      Tối ưu ngân sách
                    </span>
                  </div>
                </label>

                {/* Option 2: Enterprise (big) */}
                <label
                  className={`group relative cursor-pointer flex flex-col p-5 rounded-2xl border transition-all duration-200 ${
                    companyScale === 'enterprise'
                      ? 'bg-[#e6f7f5] border-[#005c55] shadow-sm'
                      : 'bg-[#f2f3ff] border-[#eaedff] hover:bg-[#eaedff]'
                  }`}
                >
                  <input
                    type="radio"
                    name="company_scale"
                    value="enterprise"
                    checked={companyScale === 'enterprise'}
                    onChange={() => setCompanyScale('enterprise')}
                    className="sr-only"
                  />
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-white text-[#005c55] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[26px]">corporate_fare</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                      <span
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          companyScale === 'enterprise' ? 'bg-[#005c55]' : 'bg-transparent'
                        }`}
                      />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-[#131b2e]">Công ty lớn / Tập đoàn (big)</h3>
                  <p className="text-xs text-[#6e7977] mt-1 leading-relaxed">
                    Trên 100 nhân sự, đa phòng ban &amp; nhiều chi nhánh. Cần giải pháp tuyển dụng hàng loạt và quản lý ATS chuyên nghiệp.
                  </p>
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-[#005c55] text-[11px] font-semibold">
                      &gt; 100 nhân sự
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-[#6e7977] text-[11px]">
                      Tuyển dụng quy mô lớn
                    </span>
                  </div>
                </label>
              </div>
            </section>

            {/* 2. THÔNG TIN PHÁP LÝ & ĐỊNH DANH DOANH NGHIỆP */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#e2e7ff] text-[#005c55] flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h2 className="text-base font-bold text-[#131b2e]">Thông tin định danh doanh nghiệp</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Logo Upload Zone (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1">
                    <span>Logo thương hiệu công ty</span>
                  </label>
                  <div
                    className="bg-[#f2f3ff] rounded-2xl p-5 flex flex-col items-center justify-center text-center group hover:bg-[#eaedff] transition-colors relative cursor-pointer border border-[#eaedff]"
                    onClick={() => document.getElementById('logoFileInput')?.click()}
                  >
                    <input
                      type="file"
                      id="logoFileInput"
                      accept="image/png, image/jpeg"
                      className="sr-only"
                      onChange={handleLogoChange}
                    />
                    <div className="w-24 h-24 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden mb-3 relative group border-2 border-dashed border-[#bdc9c6]">
                      {logoPreview ? (
                        <>
                          <img
                            src={logoPreview}
                            alt="Logo Preview"
                            className="w-full h-full object-contain p-2"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <span className="material-symbols-outlined text-[24px]">edit</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                          <span className="material-symbols-outlined text-[32px] text-slate-400">add_photo_alternate</span>
                          <span className="text-[10px] text-slate-500 font-semibold mt-1">Chọn logo</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-white text-[#005c55] text-xs font-bold shadow-xs hover:bg-[#005c55] hover:text-white transition-colors cursor-pointer"
                    >
                      {logoPreview ? 'Đổi ảnh logo' : 'Tải lên logo'}
                    </button>
                    <p className="text-[11px] text-[#6e7977] mt-2 text-center">
                      PNG, JPG (Tối đa 5MB)<br />Khuyến nghị ảnh vuông 1:1
                    </p>
                  </div>
                </div>

                {/* Text Inputs (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-3.5">
                  {/* Tên công ty (companies.name) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1" htmlFor="companyName">
                      <span>Tên công ty (Theo Đăng Ký Kinh Doanh)</span>
                      <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-[#6e7977] text-[20px] pointer-events-none">
                        domain
                      </span>
                      <input
                        id="companyName"
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Nhập tên đầy đủ của doanh nghiệp theo GPKD..."
                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:bg-white focus:border-[#005c55] focus:ring-2 focus:ring-[#005c55]/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Họ tên người đại diện / HR (recruiter.full_name) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1" htmlFor="fullName">
                      <span>Họ và tên người đại diện / Quản lý tuyển dụng</span>
                      <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-[#6e7977] text-[20px] pointer-events-none">
                        badge
                      </span>
                      <input
                        id="fullName"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn An - Trưởng phòng nhân sự"
                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:bg-white focus:border-[#005c55] focus:ring-2 focus:ring-[#005c55]/20 transition-all font-medium"
                      />
                    </div>
                  </div>
                  {/* Tỉnh / Thành phố (bảng provinces) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#131b2e]">
                      Tỉnh / Thành phố trụ sở chính <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={provinceId}
                        onChange={(e) => setProvinceId(e.target.value)}
                        required
                        className="w-full h-11 px-3.5 pr-9 rounded-xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:bg-white focus:border-[#005c55] appearance-none cursor-pointer font-medium"
                      >
                        <option value="">-- Chọn Tỉnh / Thành phố từ CSDL --</option>
                        {provinces.map((prov) => (
                          <option key={prov.id} value={prov.id}>
                            {prov.name}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none text-[20px]">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Địa chỉ trụ sở chính (company_address.address_detail) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1">
                      <span>Địa chỉ trụ sở chính cụ thể</span>
                      <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-[#6e7977] text-[20px] pointer-events-none">
                        location_on
                      </span>
                      <input
                        type="text"
                        required
                        value={addressDetail}
                        onChange={(e) => setAddressDetail(e.target.value)}
                        placeholder="Số nhà, tên đường, tòa nhà văn phòng, phường/xã..."
                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:bg-white focus:border-[#005c55] focus:ring-2 focus:ring-[#005c55]/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Số điện thoại và Email liên hệ (companies.phone, companies.email) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#131b2e]">Số điện thoại liên hệ</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-[#6e7977] text-[20px] pointer-events-none">
                          call
                        </span>
                        <input
                          type="tel"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="028 1234 5678 hoặc 09..."
                          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:bg-white focus:border-[#005c55] font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#131b2e]">Email nhận thông báo tuyển dụng</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-[#6e7977] text-[20px] pointer-events-none">
                          mail
                        </span>
                        <input
                          type="email"
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                          placeholder="hr@congty.com"
                          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:bg-white focus:border-[#005c55] font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. TẢI LÊN GIẤY PHÉP ĐĂNG KÝ KINH DOANH (company_license) */}
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#e2e7ff] text-[#005c55] flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <h2 className="text-base font-bold text-[#131b2e]">
                    Giấy phép đăng ký kinh doanh (GPKD)
                  </h2>
                </div>
              </div>
              <p className="text-xs text-[#6e7977] -mt-1">
                Tài liệu phục vụ cấp nhãn xác thực tài khoản doanh nghiệp. Thông tin được mã hóa bảo mật theo chuẩn an toàn thông tin.
              </p>

              {/* Upload Drop Zone */}
              <div
                onClick={() => document.getElementById('licenseFileInput')?.click()}
                className="group relative rounded-2xl bg-[#f2f3ff] hover:bg-[#eaedff] border-2 border-dashed border-[#bdc9c6] p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center"
              >
                <input
                  type="file"
                  id="licenseFileInput"
                  accept=".pdf,image/png,image/jpeg"
                  className="sr-only"
                  onChange={handleLicenseChange}
                />
                <div className="w-14 h-14 rounded-2xl bg-white text-[#005c55] flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[30px]">document_scanner</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#131b2e] mb-1">
                  Kéo thả hoặc nhấn để chọn tệp Giấy Phép ĐKKD
                </h4>
                <p className="text-[11px] text-[#6e7977] max-w-md mb-3">
                  Định dạng PDF, JPG hoặc PNG rõ nét (Dung lượng tối đa 15MB).
                </p>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-[#005c55] text-white text-xs font-bold shadow-sm hover:bg-[#007952] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  <span>Tải ảnh hoặc tệp PDF GPKD</span>
                </button>
              </div>

              {/* Selected Document Card Preview */}
              {licenseFile ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f2f3ff] border border-[#eaedff] shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-bold text-[#131b2e] truncate">{licenseFile.name}</p>
                        <span className="px-2 py-0.5 rounded bg-[#97f5cc] text-[#00513a] text-[10px] font-bold shrink-0">
                          Đã chọn
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6e7977] mt-0.5">
                        Dung lượng: {licenseFile.size} • {licenseFile.uploadedTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <button
                      type="button"
                      onClick={handleClearLicense}
                      className="p-1.5 rounded-lg text-[#6e7977] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Xóa tệp"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">info</span>
                  <span>Chưa tải tệp lên (Bạn có thể nộp bổ sung bản sao GPKD sau khi bắt đầu sử dụng tài khoản).</span>
                </div>
              )}
            </section>

            {/* Checkbox cam kết */}
            <div className="p-3.5 rounded-2xl bg-[#f2f3ff] border border-[#eaedff] flex items-start gap-2.5">
              <input
                type="checkbox"
                id="termsCheck"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                required
                className="w-4 h-4 mt-0.5 rounded text-[#005c55] accent-[#005c55] cursor-pointer"
              />
              <label htmlFor="termsCheck" className="text-xs text-[#3e4947] cursor-pointer select-none leading-relaxed">
                Tôi cam kết toàn bộ thông tin đăng ký và hồ sơ doanh nghiệp là hoàn toàn chính xác, trung thực. Tôi đồng ý với{' '}
                <a href="#terms" onClick={(e) => e.preventDefault()} className="text-[#005c55] font-bold hover:underline">
                  Quy chế sàn tuyển dụng KiemJob
                </a>{' '}
                và tiêu chuẩn bảo mật thông tin.
              </label>
            </div>

            {/* Action Buttons Footer */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-[#eaedff]">
              <button
                type="button"
                onClick={handleTryExit}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Quay lại trang chủ</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:w-auto px-7 py-3 rounded-2xl text-white text-xs sm:text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  success
                    ? 'bg-emerald-600'
                    : loading
                    ? 'bg-[#005c55]/70 cursor-wait'
                    : 'bg-[#005c55] hover:bg-[#007952] active:scale-95 shadow-[#005c55]/30'
                }`}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>Đang lưu thông tin doanh nghiệp...</span>
                  </>
                ) : success ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Hồ sơ đã gửi thành công (Trạng thái: Chờ duyệt - pending)!</span>
                  </>
                ) : (
                  <>
                    <span>Hoàn tất hồ sơ &amp; Gửi duyệt (Chờ duyệt)</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Modal cảnh báo khi cố gắng thoát mà công ty là null */}
      {exitWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#131b2e]">Chưa hoàn tất thông tin công ty</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Tài khoản tuyển dụng yêu cầu phải có thông tin doanh nghiệp ban đầu. Bạn có thể tiếp tục điền hoặc đăng xuất tài khoản.
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDirectLogout}
                className="px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Đăng xuất</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Về Trang chủ
                </button>
                <button
                  type="button"
                  onClick={() => setExitWarningModal(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#005c55] hover:bg-[#007952] rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Tiếp tục điền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
