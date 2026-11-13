import React, { useState, useEffect, useMemo } from 'react';
import { jobCategoryApi, jobSpecializationApi } from '../../../infrastructure/api';
import CategoryModal from './components/CategoryModal';
import DeleteCategoryModal from './components/DeleteCategoryModal';
import SpecializationModal from './components/SpecializationModal';

/**
 * JobCategoryManagementPage - Trang Quản lý Danh mục Nghề nghiệp & Chuyên môn (Admin)
 *
 * Giao diện Thẻ danh mục (Category Cards Grid):
 * - Mỗi thẻ đại diện cho một danh mục ngành nghề lớn.
 * - Bên trong thẻ hiển thị danh sách các chuyên môn dưới dạng chip/tag nhỏ.
 * - Nút "+ Thêm chuyên môn" trực tiếp trên từng thẻ.
 * - Nhấn vào chip chuyên môn để chỉnh sửa tên hoặc xóa chuyên môn đó.
 * - Cuối thẻ hiển thị số lượng chuyên môn và các nút Sửa / Xóa danh mục.
 * - Tích hợp đầy đủ Backend API Spring Boot + PostgreSQL:
 *    + jobs_categories (GET, POST, PUT, DELETE)
 *    + job_specializations (GET, POST, PUT, DELETE)
 */

export default function JobCategoryManagementPage() {
  // ── State Dữ liệu ──
  const [categories, setCategories] = useState([]);
  const [specsMap, setSpecsMap] = useState({}); // { [categoryId]: Array<Specialization> }
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ── State Modal Danh Mục (Thêm / Sửa) ──
  const [categoryModal, setCategoryModal] = useState({
    isOpen: false,
    initialData: null,
  });
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // ── State Modal Xóa Danh Mục ──
  const [deleteCatModal, setDeleteCatModal] = useState({
    isOpen: false,
    category: null,
  });
  const [isDeletingCat, setIsDeletingCat] = useState(false);

  // ── State Modal Chuyên Môn (Thêm / Sửa / Xóa trực tiếp) ──
  const [specModal, setSpecModal] = useState({
    isOpen: false,
    mode: 'add', // 'add' | 'edit'
    category: null,
    specialization: null,
  });

  // ── State Toast Thông Báo ──
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 3200);
  };

  // ── Fetch toàn bộ dữ liệu từ API ──
  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Lấy danh sách danh mục
      const catsData = await jobCategoryApi.getCategories();
      const catList = Array.isArray(catsData) ? catsData : [];
      setCategories(catList);

      // 2. Lấy tất cả chuyên môn và gom nhóm theo id_job_category
      try {
        const specsData = await jobSpecializationApi.getSpecializations();
        const map = {};
        if (Array.isArray(specsData)) {
          specsData.forEach((spec) => {
            const cid = spec.jobCategoryId;
            if (!map[cid]) map[cid] = [];
            map[cid].push(spec);
          });
        }
        setSpecsMap(map);
      } catch (specErr) {
        console.warn('[JobCategory] Lỗi tải chuyên môn ban đầu:', specErr);
      }
    } catch (err) {
      console.error('[JobCategory] Lỗi tải danh mục:', err);
      showToast(err.message || 'Không thể tải danh sách danh mục nghề nghiệp', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ── Tìm kiếm theo tên ngành nghề, mô tả hoặc tên chuyên môn ──
  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((cat) => {
      const matchName = cat.name?.toLowerCase().includes(q);
      const matchDesc = cat.description?.toLowerCase().includes(q);
      const specs = specsMap[cat.id] || [];
      const matchSpec = specs.some((s) => s.name?.toLowerCase().includes(q));
      return matchName || matchDesc || matchSpec;
    });
  }, [categories, specsMap, searchTerm]);

  // Tổng số chuyên môn trên toàn hệ thống
  const totalSpecsCount = useMemo(() => {
    return Object.values(specsMap).reduce((acc, list) => acc + (list?.length || 0), 0);
  }, [specsMap]);

  // ── Xử lý Danh Mục (Thêm mới / Chỉnh sửa) ──
  const handleOpenAddCategory = () => {
    setCategoryModal({ isOpen: true, initialData: null });
  };

  const handleOpenEditCategory = (category) => {
    setCategoryModal({ isOpen: true, initialData: category });
  };

  const handleCloseCategoryModal = () => {
    if (!isSubmittingCat) {
      setCategoryModal({ isOpen: false, initialData: null });
    }
  };

  const handleSubmitCategory = async (formData) => {
    setIsSubmittingCat(true);
    const isEdit = Boolean(categoryModal.initialData?.id);
    try {
      if (isEdit) {
        const updated = await jobCategoryApi.updateCategory(
          categoryModal.initialData.id,
          formData
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        showToast(`Đã cập nhật danh mục "${updated.name}" thành công!`);
      } else {
        const created = await jobCategoryApi.createCategory(formData);
        setCategories((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
        );
        showToast(`Đã thêm danh mục "${created.name}" thành công!`);
      }
      handleCloseCategoryModal();
    } catch (err) {
      console.error('[JobCategory] Lỗi lưu danh mục:', err);
      let errMsg = 'Không thể lưu danh mục nghề nghiệp.';
      if (err.message?.includes('409') || err.message?.toLowerCase().includes('tồn tại')) {
        errMsg = 'Tên danh mục này đã tồn tại trên hệ thống.';
      } else if (err.message) {
        errMsg = err.message;
      }
      showToast(errMsg, 'error');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // ── Xử lý Xóa Danh Mục ──
  const handleOpenDeleteCategory = (category) => {
    setDeleteCatModal({ isOpen: true, category });
  };

  const handleCloseDeleteCategory = () => {
    if (!isDeletingCat) {
      setDeleteCatModal({ isOpen: false, category: null });
    }
  };

  const handleConfirmDeleteCategory = async () => {
    const target = deleteCatModal.category;
    if (!target) return;

    setIsDeletingCat(true);
    try {
      await jobCategoryApi.deleteCategory(target.id);
      setCategories((prev) => prev.filter((c) => c.id !== target.id));
      setSpecsMap((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
      showToast(`Đã xóa danh mục "${target.name}" thành công!`);
      handleCloseDeleteCategory();
    } catch (err) {
      console.error('[JobCategory] Lỗi xóa danh mục:', err);
      let errMsg = `Không thể xóa danh mục "${target.name}".`;
      if (
        err.message?.includes('409') ||
        err.message?.toLowerCase().includes('tin tuyển dụng') ||
        err.message?.toLowerCase().includes('ràng buộc')
      ) {
        errMsg = 'Không thể xóa danh mục đang được tin tuyển dụng sử dụng.';
      } else if (err.message) {
        errMsg = err.message;
      }
      showToast(errMsg, 'error');
    } finally {
      setIsDeletingCat(false);
    }
  };

  // ── Xử lý Chuyên Môn (Thêm / Sửa / Xóa) ──
  // 1. Nhấn nút "+ Thêm chuyên môn" trên thẻ
  const handleOpenAddSpec = (category) => {
    setSpecModal({
      isOpen: true,
      mode: 'add',
      category,
      specialization: null,
    });
  };

  // 2. Nhấn vào một chip chuyên môn để chỉnh sửa hoặc xóa
  const handleOpenEditSpec = (category, spec) => {
    setSpecModal({
      isOpen: true,
      mode: 'edit',
      category,
      specialization: spec,
    });
  };

  const handleCloseSpecModal = () => {
    setSpecModal({
      isOpen: false,
      mode: 'add',
      category: null,
      specialization: null,
    });
  };

  // Callback khi lưu hoặc xóa chuyên môn thành công
  const handleSpecSuccess = (message, actionType, item) => {
    showToast(message, 'success');
    const catId = specModal.category?.id;
    if (!catId) return;

    setSpecsMap((prev) => {
      const currentList = prev[catId] || [];
      let updatedList = [];

      if (actionType === 'add' && item) {
        updatedList = [...currentList, item].sort((a, b) =>
          a.name.localeCompare(b.name, 'vi')
        );
      } else if (actionType === 'edit' && item) {
        updatedList = currentList.map((s) => (s.id === item.id ? item : s));
      } else if (actionType === 'delete' && item) {
        updatedList = currentList.filter((s) => s.id !== item.id);
      } else {
        updatedList = currentList;
      }

      return {
        ...prev,
        [catId]: updatedList,
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Toast Thông Báo ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[999] px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 transition-all ${
            toast.type === 'success'
              ? 'bg-[#131b2e] text-white border border-[#283044]'
              : 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]'
          }`}
          style={{ animation: 'catToastIn .25s cubic-bezier(.22,1,.36,1)' }}
        >
          <span
            className={`material-symbols-outlined text-[20px] ${
              toast.type === 'success' ? 'text-[#97f5cc]' : 'text-[#ba1a1a]'
            }`}
          >
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-[13px] font-semibold">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-current opacity-60 hover:opacity-100"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[18px] font-bold text-[#131b2e] tracking-tight">
              Quản Lý Danh Mục Nghề Nghiệp
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddCategory}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005c55] hover:bg-[#0f766e] text-white text-[13px] font-semibold rounded-lg transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Thêm Danh Mục Mới
        </button>
      </div>

      {/* ── Toolbar: Tìm kiếm & Thống kê ── */}
      <div className="bg-white rounded-xl border border-[#eaedff] shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên ngành nghề, mô tả hoặc chuyên môn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-[#f2f3ff] text-[#131b2e] rounded-lg text-[13px] outline-none border border-transparent focus:border-[#005c55] focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6e7977] hover:text-[#131b2e]"
              title="Xóa tìm kiếm"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          )}
        </div>

        {/* Stats & Nút Làm Mới */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-[12px]">
          <div className="px-3 py-1.5 bg-[#f2f3ff] rounded-lg text-[#3e4947] font-semibold text-[11px] sm:text-[12px] flex items-center gap-2 border border-[#eaedff]">
            <span className="material-symbols-outlined text-[16px] text-[#005c55]">category</span>
            <span>
              <strong>{categories.length}</strong> danh mục
            </span>
            <span className="text-[#eaedff]">|</span>
            <span className="material-symbols-outlined text-[16px] text-[#005c55]">school</span>
            <span>
              <strong>{totalSpecsCount}</strong> chuyên môn
            </span>
            {searchTerm && (
              <span className="text-[#005c55] font-bold">
                (Khớp: {filteredCategories.length})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-[11px] font-bold rounded-lg transition-colors border border-[#eaedff] disabled:opacity-50"
            title="Tải lại dữ liệu từ máy chủ"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                loading ? 'animate-spin' : ''
              }`}
            >
              refresh
            </span>
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Content Khu vực Thẻ Danh Mục (Category Cards Grid) ── */}
      {loading ? (
        /* Loading State */
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#eaedff] border-t-[#005c55] rounded-full animate-spin" />
          <p className="text-[13px] text-[#6e7977] font-semibold mt-3">
            Đang tải danh mục nghề nghiệp và chuyên môn từ máy chủ...
          </p>
        </div>
      ) : filteredCategories.length === 0 ? (
        /* Empty State */
        <div className="py-20 px-4 text-center bg-white rounded-xl border border-[#eaedff] shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#6e7977] mb-3">
            <span className="material-symbols-outlined text-[32px]">
              {searchTerm ? 'search_off' : 'category'}
            </span>
          </div>
          <p className="text-[15px] font-bold text-[#131b2e]">
            {searchTerm ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nghề nghiệp nào'}
          </p>
          <p className="text-[12px] text-[#6e7977] max-w-sm mx-auto mt-1 mb-4">
            {searchTerm
              ? `Không tìm thấy danh mục hoặc chuyên môn nào khớp với từ khóa "${searchTerm}".`
              : 'Hệ thống hiện chưa có danh mục nào. Hãy tạo danh mục đầu tiên để quản lý chuyên môn và tin tuyển dụng.'}
          </p>
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-[12px] font-bold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">backspace</span>
              Xóa bộ lọc tìm kiếm
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddCategory}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#005c55] hover:bg-[#0f766e] text-white text-[12px] font-bold rounded-lg transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Thêm danh mục đầu tiên
            </button>
          )}
        </div>
      ) : (
        /* ── Category Cards Grid ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCategories.map((category) => {
            const specs = specsMap[category.id] || [];
            const specCount = specs.length;

            return (
              <div
                key={category.id}
                className="bg-white rounded-xl border border-[#eaedff] shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                {/* ── Thẻ Header: Tên ngành nghề, ID và Mô tả ── */}
                <div className="p-4 sm:p-5 pb-3.5 border-b border-[#eaedff] bg-gradient-to-b from-white to-[#faf8ff]">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#005c55] shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[20px]">
                          work_outline
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2
                          className="text-[15px] font-bold text-[#131b2e] uppercase tracking-wide leading-snug line-clamp-2"
                          title={category.name}
                        >
                          {category.name}
                        </h2>
                        <span className="text-[11px] text-[#6e7977] font-medium">
                          Mã danh mục: #{category.id}
                        </span>
                      </div>
                    </div>

                    {/* Huy hiệu số lượng chuyên môn góc phải */}
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#f2f3ff] rounded-md text-[11px] font-bold text-[#005c55] border border-[#eaedff] shrink-0"
                      title={`${specCount} chuyên môn`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        school
                      </span>
                      <span>{specCount}</span>
                    </div>
                  </div>

                  {/* Mô tả ngắn */}
                  {category.description ? (
                    <p
                      className="mt-2.5 text-[12.5px] text-[#3e4947] leading-relaxed line-clamp-3"
                      title={category.description}
                    >
                      {category.description}
                    </p>
                  ) : (
                    <p className="mt-2.5 text-[12px] italic text-[#9ca3af]">
                      (Chưa có mô tả cho ngành nghề này)
                    </p>
                  )}
                </div>

                {/* ── Thẻ Body: Danh sách chuyên môn (Chips/Tags) & Nút Thêm Chuyên Môn ── */}
                <div className="p-4 sm:p-5 pt-3.5 flex-1 flex flex-col justify-start">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold text-[#6e7977] uppercase tracking-wider">
                      Chuyên môn trực thuộc:
                    </span>
                    <span className="text-[11px] text-[#6e7977]">
                      {specCount} chuyên môn
                    </span>
                  </div>

                  {/* Danh sách chips và nút "+ Thêm chuyên môn" */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {specs.map((spec) => (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => handleOpenEditSpec(category, spec)}
                        className="group inline-flex items-center gap-1 px-2.5 py-1 bg-[#f2f3ff] hover:bg-[#e4e8ff] text-[#005c55] text-[12px] font-medium rounded-md border border-[#d6e0ff] hover:border-[#b4c7ff] transition-all cursor-pointer active:scale-[.97]"
                        title={`Nhấn để sửa hoặc xóa chuyên môn "${spec.name}"`}
                      >
                        <span className="leading-snug">{spec.name}</span>
                        <span className="material-symbols-outlined text-[13px] opacity-40 group-hover:opacity-100 transition-opacity">
                          edit
                        </span>
                      </button>
                    ))}

                    {/* Nút "+ Thêm chuyên môn" trực tiếp trên thẻ */}
                    <button
                      type="button"
                      onClick={() => handleOpenAddSpec(category)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#005c55]/5 text-[#005c55] text-[12px] font-bold rounded-md border border-dashed border-[#005c55]/50 hover:border-[#005c55] transition-all cursor-pointer active:scale-[.97]"
                      title={`Thêm chuyên môn mới vào "${category.name}"`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        add
                      </span>
                      <span>Thêm chuyên môn</span>
                    </button>
                  </div>

                  {specCount === 0 && (
                    <p className="text-[11px] text-[#9ca3af] italic mt-1.5">
                      Chưa có chuyên môn nào. Hãy nhấn "+ Thêm chuyên môn" để bổ sung các vị trí thuộc ngành này.
                    </p>
                  )}
                </div>

                {/* ── Thẻ Footer: Thống kê số lượng & Nút Sửa / Xóa danh mục ── */}
                <div className="px-4 sm:px-5 py-3 border-t border-[#eaedff] bg-[#faf8ff] flex items-center justify-between gap-2">
                  {/* Số lượng chuyên môn */}
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#005c55]">
                    <span className="material-symbols-outlined text-[16px]">
                      school
                    </span>
                    <span>{specCount} chuyên môn</span>
                  </div>

                  {/* Nút Sửa & Xóa danh mục */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditCategory(category)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold text-[#005c55] hover:bg-[#eaedff] rounded-lg transition-colors cursor-pointer"
                      title={`Chỉnh sửa thông tin danh mục "${category.name}"`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        edit
                      </span>
                      <span>Sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDeleteCategory(category)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/60 rounded-lg transition-colors cursor-pointer"
                      title={`Xóa danh mục "${category.name}"`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer Stats ── */}
      {!loading && filteredCategories.length > 0 && (
        <div className="text-center text-[11px] text-[#6e7977] py-2">
          <span className="font-semibold tabular-nums">
            Hiển thị {filteredCategories.length} / {categories.length} danh mục nghề nghiệp ({totalSpecsCount} chuyên môn)
          </span>
          <span className="mx-2 text-[#eaedff]">|</span>
          <span className="text-[10px] text-[#bdc9c6]">
            Bảng: jobs_categories + job_specializations (PostgreSQL)
          </span>
        </div>
      )}

      {/* ── Modal Thêm / Chỉnh Sửa Danh Mục ── */}
      <CategoryModal
        isOpen={categoryModal.isOpen}
        initialData={categoryModal.initialData}
        onClose={handleCloseCategoryModal}
        onSubmit={handleSubmitCategory}
        isSubmitting={isSubmittingCat}
        existingCategories={categories}
      />

      {/* ── Modal Xác Nhận Xóa Danh Mục ── */}
      <DeleteCategoryModal
        isOpen={deleteCatModal.isOpen}
        category={deleteCatModal.category}
        onClose={handleCloseDeleteCategory}
        onConfirm={handleConfirmDeleteCategory}
        isDeleting={isDeletingCat}
        specializationCount={
          deleteCatModal.category
            ? (specsMap[deleteCatModal.category.id] || []).length
            : 0
        }
      />

      {/* ── Modal Quản Lý Chuyên Môn (Thêm / Sửa / Xóa) ── */}
      <SpecializationModal
        isOpen={specModal.isOpen}
        mode={specModal.mode}
        category={specModal.category}
        specialization={specModal.specialization}
        existingSpecs={
          specModal.category ? specsMap[specModal.category.id] || [] : []
        }
        onClose={handleCloseSpecModal}
        onSuccess={handleSpecSuccess}
      />

      {/* ── Micro Animations ── */}
      <style>{`
        @keyframes catToastIn {
          from { opacity: 0; transform: translateY(12px) scale(.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes catFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes catModalScale {
          from { opacity: 0; transform: scale(.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}
      </style>
    </div>
  );
}
