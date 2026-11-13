import React, { useState, useEffect } from 'react';
import jobPostApi from '../../../infrastructure/api/jobPostApi';
import { provinceApi } from '../../../infrastructure/api/provinceApi';
import { getCompanyAddresses } from '../../../infrastructure/api/companyApi';

/**
 * EditJobModal - Modal chỉnh sửa tin tuyển dụng & các mục chi tiết
 */
export default function EditJobModal({
  isOpen,
  onClose,
  job,
  categories = [],
  jobDetails = [],
  onSaved,
  initialTab = 'general',
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'general' | 'addresses' | 'details'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    vacancies: 1,
    workingMode: 'onsite',
    educationalRequirement: 'Đại học trở lên',
    applicationDeadline: '',
    salaryMin: '',
    salaryMax: '',
    status: 'open',
  });

  // Details list: [{ id, title, content }]
  const [detailsList, setDetailsList] = useState([]);

  // Job Addresses list: [{ id, provinceId, addressDetail, provinceName }]
  const [jobAddresses, setJobAddresses] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [companyAddresses, setCompanyAddresses] = useState([]);
  const [showCompanyAddrDropdown, setShowCompanyAddrDropdown] = useState(false);

  useEffect(() => {
    if (isOpen && job) {
      setActiveTab(initialTab);
      setFormData({
        title: job.title || '',
        categoryId: job.categoryId || (categories[0]?.id ?? ''),
        vacancies: job.vacancies || 1,
        workingMode: job.workingMode || 'onsite',
        educationalRequirement: job.educationalRequirement || 'Đại học trở lên',
        applicationDeadline: job.applicationDeadline || '',
        salaryMin: job.salaryMin !== null && job.salaryMin !== undefined ? job.salaryMin : '',
        salaryMax: job.salaryMax !== null && job.salaryMax !== undefined ? job.salaryMax : '',
        status: job.status || 'open',
      });

      setDetailsList(
        Array.isArray(jobDetails) && jobDetails.length > 0
          ? jobDetails.map((d) => ({
              id: d.id,
              title: d.title || '',
              content: d.content || '',
            }))
          : [
              { title: 'Mô tả công việc', content: '' },
              { title: 'Yêu cầu ứng viên', content: '' },
              { title: 'Quyền lợi ứng viên', content: '' },
            ]
      );

      // Load Provinces
      provinceApi
        .getProvinces()
        .then((data) => {
          if (Array.isArray(data)) setProvinces(data);
        })
        .catch((err) => console.warn('Lỗi tải tỉnh thành:', err));

      // Load Company Addresses for quick selection
      if (job.companyId) {
        getCompanyAddresses(job.companyId)
          .then((data) => {
            const list = Array.isArray(data) ? data : data?.content || [];
            setCompanyAddresses(list);
          })
          .catch((err) => console.warn('Lỗi tải địa chỉ công ty:', err));
      }

      // Load Job Addresses
      const initAddresses = async () => {
        try {
          let addrs = Array.isArray(job.addresses) ? job.addresses : [];
          if (addrs.length === 0 && job.id) {
            const res = await jobPostApi.getJobAddresses(job.id);
            const fetched = res?.data !== undefined ? res.data : res;
            if (Array.isArray(fetched)) addrs = fetched;
          }

          if (addrs.length > 0) {
            setJobAddresses(
              addrs.map((a) => ({
                id: a.id || null,
                provinceId: a.provinceId ? String(a.provinceId) : '',
                addressDetail: a.addressDetail || '',
                provinceName: a.provinceName || '',
              }))
            );
          } else {
            setJobAddresses([{ provinceId: '', addressDetail: '' }]);
          }
        } catch (err) {
          console.warn('Lỗi tải địa chỉ việc làm:', err);
          setJobAddresses([{ provinceId: '', addressDetail: '' }]);
        }
      };

      initAddresses();

      setErrorMessage('');
      setActiveTab('general');
    }
  }, [isOpen, job, categories, jobDetails]);

  const addAddressItem = () => {
    setJobAddresses((prev) => [...prev, { provinceId: '', addressDetail: '' }]);
  };

  const updateAddressItem = (index, field, value) => {
    setJobAddresses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeAddressItem = (index) => {
    setJobAddresses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCompanyAddress = (compAddr) => {
    const provId = compAddr.provinceId || compAddr.province?.id || '';
    const provName = compAddr.provinceName || compAddr.province?.name || '';
    const detail = compAddr.addressDetail || '';

    setJobAddresses((prev) => {
      // Nếu hàng đầu tiên đang trống thì điền vào đó
      if (prev.length === 1 && !prev[0].provinceId && !prev[0].addressDetail) {
        return [{ provinceId: String(provId), addressDetail: detail, provinceName: provName }];
      }
      return [
        ...prev,
        { provinceId: String(provId), addressDetail: detail, provinceName: provName },
      ];
    });
    setShowCompanyAddrDropdown(false);
  };

  if (!isOpen || !job) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrorMessage('');
  };

  const handleDetailChange = (index, field, value) => {
    setDetailsList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddDetail = () => {
    setDetailsList((prev) => [
      ...prev,
      { title: 'Thông tin bổ sung', content: '' },
    ]);
  };

  const handleRemoveDetail = async (index) => {
    const target = detailsList[index];
    if (target.id) {
      if (!window.confirm(`Bạn có chắc chắn muốn xóa mục "${target.title}" này?`)) {
        return;
      }
      try {
        await jobPostApi.deleteJobDetail(job.id, target.id);
      } catch (err) {
        console.error('Lỗi xóa mục chi tiết:', err);
      }
    }
    setDetailsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề tin tuyển dụng.');
      setActiveTab('general');
      return;
    }

    if (!formData.categoryId) {
      setErrorMessage('Vui lòng chọn danh mục ngành nghề.');
      setActiveTab('general');
      return;
    }

    const vacancies = Number(formData.vacancies);
    if (!vacancies || vacancies <= 0) {
      setErrorMessage('Số lượng tuyển dụng phải lớn hơn 0.');
      setActiveTab('general');
      return;
    }

    const min = formData.salaryMin !== '' ? Number(formData.salaryMin) : null;
    const max = formData.salaryMax !== '' ? Number(formData.salaryMax) : null;
    if (min !== null && min < 0) {
      setErrorMessage('Lương tối thiểu không được âm.');
      setActiveTab('general');
      return;
    }
    if (max !== null && max < 0) {
      setErrorMessage('Lương tối đa không được âm.');
      setActiveTab('general');
      return;
    }
    if (min !== null && max !== null && min > max) {
      setErrorMessage('Lương tối thiểu không được lớn hơn lương tối đa.');
      setActiveTab('general');
      return;
    }

    setIsSubmitting(true);

    try {
      // Chuẩn bị danh sách địa chỉ làm việc hợp lệ (Bảng job_address)
      const validAddresses = jobAddresses
        .filter((a) => a.provinceId)
        .map((a) => ({
          id: a.id || null,
          provinceId: Number(a.provinceId),
          addressDetail: a.addressDetail?.trim() || null,
        }));

      // 1. Cập nhật thông tin chung bài post (Table job_posts)
      const payload = {
        companyId: job.companyId,
        categoryId: Number(formData.categoryId),
        postedById: job.postedById,
        title: formData.title.trim(),
        educationalRequirement: formData.educationalRequirement || null,
        applicationDeadline: formData.applicationDeadline || null,
        vacancies: Number(formData.vacancies) || 1,
        workingMode: formData.workingMode,
        salaryMin: min,
        salaryMax: max,
        status: formData.status,
        addresses: validAddresses,
      };

      await jobPostApi.updateJobPost(job.id, payload);

      // Đồng bộ địa chỉ làm việc vào bảng job_address
      try {
        await jobPostApi.syncJobAddresses(job.id, validAddresses);
      } catch (addrErr) {
        console.warn('Lỗi đồng bộ địa chỉ làm việc:', addrErr);
      }

      // 2. Cập nhật hoặc tạo mới các mục chi tiết (Table job_details)
      for (const item of detailsList) {
        if (!item.title.trim() && !item.content.trim()) continue;

        if (item.id) {
          // Update existing
          await jobPostApi.updateJobDetail(job.id, item.id, {
            title: item.title.trim() || 'Thông tin chi tiết',
            content: item.content || '',
          });
        } else if (item.title.trim() || item.content.trim()) {
          // Create new
          await jobPostApi.createJobDetail(job.id, {
            title: item.title.trim() || 'Thông tin chi tiết',
            content: item.content || '',
          });
        }
      }

      if (onSaved) {
        onSaved();
      }
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu bài đăng:', err);
      setErrorMessage(
        err?.response?.data?.message ||
        err?.message ||
        'Có lỗi xảy ra khi lưu tin tuyển dụng. Vui lòng kiểm tra lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-[2px] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-[#eaedff] flex flex-col my-auto max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#eaedff] flex items-center justify-between bg-gradient-to-r from-white to-[#faf8ff] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005c55] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">edit_document</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#131b2e]">
                Chỉnh Sửa Tin Tuyển Dụng
              </h2>
              <p className="text-xs text-[#6e7977]">
                Mã tin #{job.id} • {job.companyName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6e7977] hover:bg-[#f2f3ff] hover:text-[#131b2e] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-[#eaedff] flex items-center gap-4 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'general'
                ? 'border-[#005c55] text-[#005c55]'
                : 'border-transparent text-[#6e7977] hover:text-[#131b2e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>Thông tin cơ bản</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'addresses'
                ? 'border-[#005c55] text-[#005c55]'
                : 'border-transparent text-[#6e7977] hover:text-[#131b2e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">location_on</span>
            <span>Địa chỉ làm việc ({jobAddresses.filter((a) => a.provinceId).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'details'
                ? 'border-[#005c55] text-[#005c55]'
                : 'border-transparent text-[#6e7977] hover:text-[#131b2e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">article</span>
            <span>Mô tả & Yêu cầu ({detailsList.length})</span>
          </button>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#93000a] text-xs font-semibold flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Tiêu đề */}
              <div>
                <label className="block text-xs font-bold text-[#131b2e] mb-1">
                  Tiêu đề bài đăng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ví dụ: Kỹ sư lập trình Frontend (ReactJS / TypeScript)..."
                  className="w-full h-10 px-3.5 rounded-xl bg-[#f2f3ff] text-xs text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white outline-none transition-colors"
                />
              </div>

              {/* Danh mục & Hình thức làm việc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1">
                    Ngành nghề / Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-xl bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white outline-none transition-colors cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1">
                    Hình thức làm việc
                  </label>
                  <select
                    name="workingMode"
                    value={formData.workingMode}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-xl bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white outline-none transition-colors cursor-pointer"
                  >
                    <option value="onsite">Tại văn phòng (Onsite)</option>
                    <option value="remote">Làm việc từ xa (Remote)</option>
                    <option value="hybrid">Linh hoạt kết hợp (Hybrid)</option>
                  </select>
                </div>
              </div>

              {/* Số lượng tuyển & Học vấn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1">
                    Số lượng tuyển dụng (Chỉ tiêu)
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="vacancies"
                    value={formData.vacancies}
                    onChange={handleChange}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#f2f3ff] text-xs text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1">
                    Yêu cầu trình độ học vấn
                  </label>
                  <input
                    type="text"
                    name="educationalRequirement"
                    value={formData.educationalRequirement}
                    onChange={handleChange}
                    placeholder="Đại học, Cao đẳng, Không yêu cầu..."
                    className="w-full h-10 px-3.5 rounded-xl bg-[#f2f3ff] text-xs text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Mức lương Min - Max */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1">
                    Mức lương tối thiểu (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="500000"
                    name="salaryMin"
                    value={formData.salaryMin}
                    onChange={handleChange}
                    placeholder="Ví dụ: 15000000"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#f2f3ff] text-xs text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1">
                    Mức lương tối đa (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="500000"
                    name="salaryMax"
                    value={formData.salaryMax}
                    onChange={handleChange}
                    placeholder="Ví dụ: 25000000"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#f2f3ff] text-xs text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Hạn nộp & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1">
                    Hạn nộp hồ sơ (Deadline)
                  </label>
                  <input
                    type="date"
                    name="applicationDeadline"
                    value={formData.applicationDeadline}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-xl bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white outline-none transition-colors cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1">
                    Trạng thái hiển thị
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-xl bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] border border-transparent focus:border-[#005c55] focus:bg-white outline-none transition-colors cursor-pointer"
                  >
                    <option value="open">Đang hiển thị (Mở tuyển dụng)</option>
                    <option value="closed">Tạm dừng nhận CV</option>
                    <option value="draft">Bản nháp (Lưu tạm)</option>
                    <option value="expired">Đã hết hạn</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#eaedff]">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#005c55] text-base">pin_drop</span>
                    Địa điểm làm việc cụ thể (job_address)
                  </h3>
                  <p className="text-[11px] text-[#6e7977]">
                    Khai báo các địa điểm làm việc cụ thể để ứng viên tìm kiếm theo khu vực và định vị nơi làm việc.
                  </p>
                </div>

                {/* Dropdown lấy từ địa chỉ công ty */}
                {companyAddresses.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCompanyAddrDropdown(!showCompanyAddrDropdown)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#005c55]/10 text-[#005c55] text-xs font-bold hover:bg-[#005c55]/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">apartment</span>
                      <span>Lấy từ địa chỉ công ty</span>
                      <span className="material-symbols-outlined text-xs">arrow_drop_down</span>
                    </button>

                    {showCompanyAddrDropdown && (
                      <div className="absolute right-0 mt-1 w-80 bg-white rounded-2xl shadow-xl border border-[#eaedff] p-2 z-30 space-y-1">
                        <div className="text-[11px] font-bold text-[#6e7977] px-2 py-1">
                          Chọn địa chỉ chi nhánh công ty:
                        </div>
                        {companyAddresses.map((cAddr, idx) => (
                          <button
                            key={cAddr.id ?? idx}
                            type="button"
                            onClick={() => handleAddCompanyAddress(cAddr)}
                            className="w-full text-left p-2 rounded-xl text-xs hover:bg-[#f2f3ff] transition-colors flex flex-col"
                          >
                            <span className="font-bold text-[#131b2e]">
                              {cAddr.provinceName || cAddr.province?.name || `Tỉnh #${cAddr.provinceId}`}
                            </span>
                            <span className="text-[11px] text-[#6e7977] line-clamp-1">
                              {cAddr.addressDetail || 'Chưa có số nhà / đường'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Danh sách các địa chỉ */}
              <div className="space-y-3">
                {jobAddresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#eaedff] bg-[#faf8ff] space-y-2.5 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#005c55] flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        Địa điểm làm việc #{idx + 1}
                      </span>
                      {jobAddresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAddressItem(idx)}
                          className="text-[#ba1a1a] hover:bg-[#ffdad6] p-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Chọn tỉnh thành */}
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold text-[#3e4947] mb-1">
                          Tỉnh / Thành phố <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={addr.provinceId || ''}
                          onChange={(e) => updateAddressItem(idx, 'provinceId', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-white text-xs font-semibold text-[#131b2e] border border-[#eaedff] focus:border-[#005c55] outline-none cursor-pointer"
                        >
                          <option value="">-- Chọn Tỉnh / TP --</option>
                          {provinces.map((prov) => (
                            <option key={prov.id} value={prov.id}>
                              {prov.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Địa chỉ chi tiết */}
                      <div className="sm:col-span-7">
                        <label className="block text-[11px] font-bold text-[#3e4947] mb-1">
                          Địa chỉ cụ thể (Tòa nhà, số nhà, đường...)
                        </label>
                        <input
                          type="text"
                          value={addr.addressDetail || ''}
                          onChange={(e) => updateAddressItem(idx, 'addressDetail', e.target.value)}
                          placeholder="VD: Tòa Landmark 81, số 720A Điện Biên Phủ, P.22, Bình Thạnh"
                          className="w-full h-9 px-3 rounded-lg bg-white text-xs text-[#131b2e] border border-[#eaedff] focus:border-[#005c55] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Nút thêm địa chỉ */}
              <button
                type="button"
                onClick={addAddressItem}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#eaedff] hover:border-[#005c55] hover:bg-[#005c55]/5 text-xs font-bold text-[#005c55] flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                <span>Thêm địa điểm làm việc khác</span>
              </button>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#6e7977]">
                  Các khối nội dung chi tiết hiển thị cho ứng viên (Mô tả, Yêu cầu, Đãi ngộ...):
                </p>
                <button
                  type="button"
                  onClick={handleAddDetail}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-xs font-bold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Thêm mục</span>
                </button>
              </div>

              {detailsList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#faf8ff] rounded-xl border border-[#eaedff] space-y-2.5 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleDetailChange(idx, 'title', e.target.value)}
                      placeholder="Tiêu đề mục (VD: Mô tả công việc, Yêu cầu ứng viên...)"
                      className="flex-1 font-bold text-xs sm:text-sm text-[#131b2e] bg-white px-3 py-1.5 rounded-lg border border-[#eaedff] outline-none focus:border-[#005c55]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDetail(idx)}
                      className="p-1.5 text-[#6e7977] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/60 rounded-lg transition-colors"
                      title="Xóa khối này"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={item.content}
                    onChange={(e) => handleDetailChange(idx, 'content', e.target.value)}
                    placeholder="Nội dung chi tiết (xuống dòng cho từng ý hoặc gạch đầu dòng)..."
                    className="w-full text-xs text-[#3e4947] bg-white p-3 rounded-lg border border-[#eaedff] outline-none focus:border-[#005c55] leading-relaxed resize-y"
                  />
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#eaedff] bg-white flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#3e4947] rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#005c55] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 active:scale-[.98]"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
