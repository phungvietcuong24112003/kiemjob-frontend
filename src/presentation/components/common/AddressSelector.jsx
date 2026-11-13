import React, { useEffect, useState } from 'react';
import { getProvinces } from '../../../infrastructure/api';

/**
 * Component lựa chọn địa chỉ Tỉnh / Thành phố và Địa chỉ chi tiết
 * Khớp với DTO Backend KiemJob: JobAddressRequest, CompanyAddressRequest (provinceId, addressDetail)
 */
export default function AddressSelector({
  provinceId,
  communeId: _communeId,
  addressDetail,
  onProvinceChange,
  onCommuneChange: _onCommuneChange,
  onAddressDetailChange,
  showAddressDetail = true,
  disabled = false,
  className = '',
}) {
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadError, setLoadError] = useState('');

  const fetchProvinces = () => {
    setLoadingProvinces(true);
    setLoadError('');
    getProvinces()
      .then((data) => {
        setProvinces(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setLoadError(err.message || 'Không tải được danh sách tỉnh/thành');
      })
      .finally(() => {
        setLoadingProvinces(false);
      });
  };

  useEffect(() => {
    fetchProvinces();
  }, []);

  const handleProvinceSelect = (e) => {
    const newProvId = e.target.value ? Number(e.target.value) : '';
    onProvinceChange?.(newProvId);
    onCommuneChange?.('');
  };

  const labelClass = 'text-[11px] font-bold text-[#6e7977] block mb-1';
  const selectClass =
    'w-full h-11 px-3 bg-white rounded-xl text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:ring-2 focus:ring-[#005c55]/20 appearance-none shadow-sm cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed';

  return (
    <div className={`space-y-3 ${className}`}>
      {loadError && (
        <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={fetchProvinces}
            className="font-bold underline ml-2 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Chọn Tỉnh / Thành phố */}
        <div>
          <label className={labelClass}>
            Tỉnh / Thành phố <span className="text-[#ba1a1a]">*</span>
          </label>
          <div className="relative">
            <select
              value={provinceId || ''}
              onChange={handleProvinceSelect}
              disabled={disabled || loadingProvinces}
              className={selectClass}
            >
              <option value="">
                {loadingProvinces ? 'Đang tải tỉnh/thành...' : '-- Chọn Tỉnh / TP --'}
              </option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none text-[16px]">
              expand_more
            </span>
          </div>
        </div>

        {/* Địa chỉ chi tiết (gộp số nhà, đường, phường/xã) */}
        {showAddressDetail && (
          <div>
            <label className={labelClass}>
              Địa chỉ chi tiết (Số nhà, đường, phường/xã) <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Số 12 Đường Duy Tân, Phường Dịch Vọng Hậu"
              value={addressDetail || ''}
              onChange={(e) => onAddressDetailChange?.(e.target.value)}
              disabled={disabled}
              className="w-full h-11 px-3 bg-white rounded-xl text-xs sm:text-sm text-[#131b2e] outline-none border border-[#eaedff] focus:ring-2 focus:ring-[#005c55]/20 shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        )}
      </div>
    </div>
  );
}
