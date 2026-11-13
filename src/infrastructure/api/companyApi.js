import { apiClient } from './client';

/**
 * API Quản lý doanh nghiệp & Giấy phép kinh doanh
 */

// Lấy danh sách công ty đã duyệt (công khai)
export const getApprovedCompanies = async (page = 0, size = 10) => {
  const data = await apiClient.get('/companies', {
    params: { page, size }
  });
  return data?.data !== undefined ? data.data : data;
};

// Admin lấy danh sách công ty (hỗ trợ lọc status, search name, membershipTier, phân trang)
export const getAdminCompanies = async ({ status = '', search = '', membershipTier = '', page = 0, size = 10 } = {}) => {
  const params = { page, size };
  if (status && status !== 'all') params.status = status;
  if (search && search.trim()) params.search = search.trim();
  if (membershipTier && membershipTier !== 'all') params.membershipTier = membershipTier;

  const data = await apiClient.get('/companies/admin', { params });
  return data?.data !== undefined ? data.data : data;
};

// Admin lấy danh sách công ty chờ duyệt
export const getPendingCompanies = async (page = 0, size = 10) => {
  const data = await apiClient.get('/companies/admin/pending', {
    params: { page, size }
  });
  return data?.data !== undefined ? data.data : data;
};

// Lấy chi tiết công ty theo ID
export const getCompanyById = async (id) => {
  const data = await apiClient.get(`/companies/${id}`);
  return data?.data !== undefined ? data.data : data;
};

// Admin duyệt công ty
export const approveCompany = async (id) => {
  const data = await apiClient.patch(`/companies/${id}/approve`);
  return data?.data !== undefined ? data.data : data;
};

// Admin từ chối hoặc chuyển công ty về chờ duyệt
export const rejectCompany = async (id) => {
  const data = await apiClient.patch(`/companies/${id}/reject`);
  return data?.data !== undefined ? data.data : data;
};

// Xóa công ty
export const deleteCompany = async (id) => {
  const data = await apiClient.delete(`/companies/${id}`);
  return data?.data !== undefined ? data.data : data;
};

// Cập nhật thông tin công ty
export const updateCompany = async (id, companyData) => {
  const data = await apiClient.put(`/companies/${id}`, companyData);
  return data?.data !== undefined ? data.data : data;
};

// ==================== SUB-RESOURCES CỦA CÔNG TY ====================

// Lấy danh sách Giấy Phép Kinh Doanh của công ty
export const getCompanyLicenses = async (companyId) => {
  const data = await apiClient.get(`/companies/${companyId}/licenses`);
  return data?.data !== undefined ? data.data : data;
};

// Lấy danh sách địa chỉ / chi nhánh của công ty
export const getCompanyAddresses = async (companyId) => {
  const data = await apiClient.get(`/companies/${companyId}/addresses`);
  return data?.data !== undefined ? data.data : data;
};

// Thêm địa chỉ mới cho công ty
export const addCompanyAddress = async (companyId, addressData) => {
  const data = await apiClient.post(`/companies/${companyId}/addresses`, addressData);
  return data?.data !== undefined ? data.data : data;
};

// Cập nhật địa chỉ công ty
export const updateCompanyAddress = async (companyId, addressId, addressData) => {
  const data = await apiClient.put(`/companies/${companyId}/addresses/${addressId}`, addressData);
  return data?.data !== undefined ? data.data : data;
};

// Xóa địa chỉ công ty
export const deleteCompanyAddress = async (companyId, addressId) => {
  const data = await apiClient.delete(`/companies/${companyId}/addresses/${addressId}`);
  return data?.data !== undefined ? data.data : data;
};

// Lấy danh sách liên kết mạng xã hội / website của công ty
export const getCompanyLinks = async (companyId) => {
  const data = await apiClient.get(`/companies/${companyId}/links`);
  return data?.data !== undefined ? data.data : data;
};

// Thêm liên kết mới cho công ty
export const addCompanyLink = async (companyId, linkData) => {
  const data = await apiClient.post(`/companies/${companyId}/links`, linkData);
  return data?.data !== undefined ? data.data : data;
};

// Cập nhật liên kết công ty
export const updateCompanyLink = async (companyId, linkId, linkData) => {
  const data = await apiClient.put(`/companies/${companyId}/links/${linkId}`, linkData);
  return data?.data !== undefined ? data.data : data;
};

// Xóa liên kết công ty
export const deleteCompanyLink = async (companyId, linkId) => {
  const data = await apiClient.delete(`/companies/${companyId}/links/${linkId}`);
  return data?.data !== undefined ? data.data : data;
};

// Lấy danh sách hình ảnh hoạt động / văn phòng của công ty
export const getCompanyImages = async (companyId) => {
  const data = await apiClient.get(`/companies/${companyId}/images`);
  return data?.data !== undefined ? data.data : data;
};

// Thêm hình ảnh mới cho công ty
export const addCompanyImage = async (companyId, imageData) => {
  const payload = typeof imageData === 'string' ? { url: imageData } : { url: imageData?.url || '' };
  const data = await apiClient.post(`/companies/${companyId}/images`, payload);
  return data?.data !== undefined ? data.data : data;
};

// Xóa hình ảnh công ty
export const deleteCompanyImage = async (companyId, imageId) => {
  const data = await apiClient.delete(`/companies/${companyId}/images/${imageId}`);
  return data?.data !== undefined ? data.data : data;
};

export const companyApi = {
  getApprovedCompanies,
  getAdminCompanies,
  getPendingCompanies,
  getCompanyById,
  approveCompany,
  rejectCompany,
  deleteCompany,
  updateCompany,
  getCompanyLicenses,
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
};

export default companyApi;
