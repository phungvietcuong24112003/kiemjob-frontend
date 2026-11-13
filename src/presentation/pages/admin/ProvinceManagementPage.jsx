import React, { useState, useEffect, useRef } from 'react';
import { provinceApi } from '../../../infrastructure/api';

/* ═══════════════════════════════════════════════════════════
   ProvinceManagementPage — Admin Quản lý Tỉnh / Thành Phố
   CRUD trực tiếp với bảng provinces phía Backend
   ═══════════════════════════════════════════════════════════ */
export default function ProvinceManagementPage() {
  /* ──── State ──── */
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Province CRUD
  const [addingProvince, setAddingProvince] = useState(false);
  const [editProvince, setEditProvince] = useState(null); // { id, name }
  const [provinceForm, setProvinceForm] = useState('');
  const [provinceError, setProvinceError] = useState('');
  const [savingProvince, setSavingProvince] = useState(false);
  const [deleteProvince, setDeleteProvince] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const provinceInputRef = useRef(null);

  /* ──── Toast helper ──── */
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  /* ──── Fetch provinces ──── */
  const fetchProvinces = async () => {
    setLoading(true);
    try {
      const data = await provinceApi.getProvinces();
      setProvinces(data);
    } catch {
      showToast('Không thể tải dữ liệu tỉnh thành', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvinces();
  }, []);

  /* ──── Auto focus ──── */
  useEffect(() => {
    if (addingProvince && provinceInputRef.current) provinceInputRef.current.focus();
  }, [addingProvince]);
  useEffect(() => {
    if (editProvince && provinceInputRef.current) provinceInputRef.current.focus();
  }, [editProvince]);

  /* ════════════════ Province CRUD ════════════════ */
  const openAddProvince = () => {
    setAddingProvince(true);
    setEditProvince(null);
    setProvinceForm('');
    setProvinceError('');
  };

  const openEditProvince = (p) => {
    setEditProvince(p);
    setAddingProvince(false);
    setProvinceForm(p.name);
    setProvinceError('');
  };

  const cancelProvince = () => {
    setAddingProvince(false);
    setEditProvince(null);
    setProvinceForm('');
    setProvinceError('');
  };

  const saveProvince = async () => {
    const name = provinceForm.trim();
    if (!name) {
      setProvinceError('Tên không được để trống');
      return;
    }
    if (provinces.some(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== editProvince?.id)) {
      setProvinceError('Tên tỉnh/thành phố đã tồn tại');
      return;
    }
    setSavingProvince(true);
    try {
      const isEdit = !!editProvince;
      if (isEdit) {
        await provinceApi.updateProvince(editProvince.id, { name });
      } else {
        await provinceApi.createProvince({ name });
      }
      await fetchProvinces();
      cancelProvince();
      showToast(isEdit ? `Đã cập nhật thành "${name}"` : `Đã thêm "${name}" thành công`);
    } catch {
      showToast('Lỗi khi lưu tỉnh/thành phố', 'error');
    } finally {
      setSavingProvince(false);
    }
  };

  const confirmDeleteProvince = async () => {
    if (!deleteProvince) return;
    try {
      await provinceApi.deleteProvince(deleteProvince.id);
      await fetchProvinces();
      showToast(`Đã xóa "${deleteProvince.name}"`);
    } catch {
      showToast('Lỗi khi xóa tỉnh/thành phố', 'error');
    } finally {
      setDeleteProvince(null);
    }
  };

  /* ──── Filter ──── */
  const filtered = provinces.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* ─── Toast ─── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[999] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 transition-all
          ${toast.type === 'success'
            ? 'bg-gradient-to-r from-[#131b2e] to-[#283044] text-white'
            : 'bg-gradient-to-r from-[#ffdad6] to-[#ffb4ab] text-[#690005]'
          }`}
          style={{ animation: 'toastIn .35s cubic-bezier(.22,1,.36,1)' }}
        >
          <span className={`material-symbols-outlined fill text-[20px] ${toast.type === 'success' ? 'text-[#97f5cc]' : 'text-[#ba1a1a]'}`}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-[13px] font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deleteProvince && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/25 backdrop-blur-[3px]"
          style={{ animation: 'fadeIn .2s ease' }}>
          <div className="bg-white rounded-[20px] p-6 max-w-sm w-full mx-4 shadow-[0_24px_80px_rgba(0,0,0,.12)] space-y-4"
            style={{ animation: 'modalPop .25s cubic-bezier(.22,1,.36,1)' }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#ffdad6] flex items-center justify-center">
                <span className="material-symbols-outlined fill text-[#ba1a1a] text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#131b2e]">Xác nhận xóa</h3>
                <p className="text-[11px] text-[#6e7977]">Thao tác này không thể hoàn tác</p>
              </div>
            </div>
            <p className="text-[13px] text-[#3e4947] leading-relaxed">
              Bạn có chắc chắn muốn xóa tỉnh/thành phố{' '}
              <strong className="text-[#131b2e]">
                "{deleteProvince.name}"
              </strong>{' '}
              không?
            </p>
            <div className="flex gap-2.5 justify-end pt-1">
              <button type="button"
                onClick={() => setDeleteProvince(null)}
                className="px-4 py-2.5 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] text-[12px] font-semibold rounded-xl transition-colors">
                Hủy bỏ
              </button>
              <button type="button"
                onClick={confirmDeleteProvince}
                className="px-4 py-2.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[12px] font-bold rounded-xl transition-colors shadow-sm">
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-[#131b2e] tracking-tight">
            Quản Lý Tỉnh / Thành Phố
          </h1>
          <p className="text-[12px] text-[#6e7977] mt-0.5">
            Danh mục địa phương hiển thị trong bộ lọc tìm việc và địa chỉ công ty
          </p>
        </div>
        <button
          type="button"
          onClick={openAddProvince}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#005c55] hover:bg-[#0f766e] text-white text-[12px] font-bold rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,92,85,.2)] hover:shadow-md active:scale-[.98]"
        >
          <span className="material-symbols-outlined text-[17px]">add_location_alt</span>
          <span>Thêm Tỉnh / Thành Phố</span>
        </button>
      </div>

      {/* ─── Add Province Form (Inline Top) ─── */}
      {addingProvince && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#005c55]/20 shadow-md space-y-3"
          style={{ animation: 'slideDown .2s cubic-bezier(.22,1,.36,1)' }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#005c55] text-[20px]">add_circle</span>
            <h3 className="text-[14px] font-bold text-[#131b2e]">Thêm mới Tỉnh / Thành phố</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex-1">
              <input
                ref={provinceInputRef}
                type="text"
                placeholder="Nhập tên tỉnh hoặc thành phố (VD: Đà Nẵng, Bình Dương...)"
                value={provinceForm}
                onChange={e => { setProvinceForm(e.target.value); setProvinceError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') saveProvince(); if (e.key === 'Escape') cancelProvince(); }}
                className={`w-full px-3.5 py-2 bg-[#f2f3ff] rounded-xl text-[13px] text-[#131b2e] outline-none border transition-colors ${
                  provinceError ? 'border-[#ba1a1a]/50' : 'border-transparent focus:border-[#005c55]'
                }`}
              />
              {provinceError && <p className="text-[11px] text-[#ba1a1a] font-semibold mt-1">{provinceError}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={saveProvince}
                disabled={savingProvince}
                className="px-4 py-2 bg-[#005c55] hover:bg-[#0f766e] text-white text-[12px] font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {savingProvince ? 'Đang lưu...' : 'Lưu lại'}
              </button>
              <button
                type="button"
                onClick={cancelProvince}
                className="px-3.5 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#3e4947] text-[12px] font-semibold rounded-xl transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Card ─── */}
      <div className="bg-white rounded-[22px] border border-[#eaedff] shadow-[0_2px_12px_rgba(0,0,0,.03)] overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-[#f2f3ff]">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bdc9c6] text-[18px]">search</span>
            <input
              type="text"
              placeholder="Tìm kiếm tỉnh / thành phố..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#f2f3ff] rounded-lg text-[13px] text-[#131b2e] outline-none border border-transparent focus:border-[#005c55] transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchProvinces}
              className="flex items-center gap-1 px-3 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#005c55] text-[11px] font-semibold rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>Làm mới
            </button>
          </div>
        </div>

        {/* Content Table / List */}
        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-7 h-7 border-[2.5px] border-[#eaedff] border-t-[#005c55] rounded-full animate-spin" />
              <p className="text-[13px] text-[#6e7977] font-semibold mt-3">Đang tải dữ liệu...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-[44px] text-[#dae2fd]">location_off</span>
              <p className="text-[14px] font-bold text-[#3e4947] mt-2">
                {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu'}
              </p>
              <p className="text-[12px] text-[#6e7977] mt-1">
                {searchTerm ? 'Thử từ khóa khác' : 'Nhấn "Thêm Tỉnh / Thành Phố" để bắt đầu'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#f2f3ff]">
              {filtered.map((province, idx) => {
                const isEditingThis = editProvince?.id === province.id;

                return (
                  <div
                    key={province.id}
                    className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl hover:bg-[#f2f3ff]/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Number */}
                      <span className="w-7 h-7 rounded-lg bg-[#eaedff] flex items-center justify-center text-[11px] font-bold text-[#6e7977] tabular-nums shrink-0">
                        {idx + 1}
                      </span>

                      {/* Icon */}
                      <div className="w-8 h-8 rounded-xl bg-[#eaedff] group-hover:bg-[#dae2fd] flex items-center justify-center shrink-0 transition-colors">
                        <span className="material-symbols-outlined text-[17px] text-[#005c55]">
                          location_city
                        </span>
                      </div>

                      {/* Name or inline edit */}
                      <div className="flex-1 min-w-0">
                        {isEditingThis ? (
                          <div className="flex items-center gap-2">
                            <input
                              ref={provinceInputRef}
                              type="text"
                              value={provinceForm}
                              onChange={e => { setProvinceForm(e.target.value); setProvinceError(''); }}
                              onKeyDown={e => { if (e.key === 'Enter') saveProvince(); if (e.key === 'Escape') cancelProvince(); }}
                              className={`flex-1 min-w-0 px-3 py-1.5 bg-white rounded-lg text-[13px] text-[#131b2e] outline-none border transition-colors ${
                                provinceError ? 'border-[#ba1a1a]/50' : 'border-[#005c55]'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={saveProvince}
                              disabled={savingProvince}
                              className="px-3 py-1.5 bg-[#005c55] hover:bg-[#0f766e] text-white text-[11px] font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              {savingProvince ? '...' : 'Lưu'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelProvince}
                              className="px-2.5 py-1.5 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#3e4947] text-[11px] font-semibold rounded-lg transition-colors"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[13px] sm:text-[14px] font-bold text-[#131b2e] truncate">{province.name}</p>
                            <p className="text-[10px] text-[#bdc9c6] mt-px">Mã định danh ID #{province.id}</p>
                          </div>
                        )}
                        {isEditingThis && provinceError && (
                          <p className="text-[10px] text-[#ba1a1a] font-semibold mt-1">{provinceError}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {!isEditingThis && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEditProvince(province)}
                          title="Sửa tên tỉnh"
                          className="p-1.5 rounded-lg hover:bg-[#eaedff] text-[#005c55] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[17px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteProvince(province)}
                          title="Xóa tỉnh"
                          className="p-1.5 rounded-lg hover:bg-[#ffdad6]/60 text-[#ba1a1a] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
