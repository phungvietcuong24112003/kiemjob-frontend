import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCvs,
  createCv,
  updateCv,
  deleteCv,
  setCvPublicStatus,
  getCurrentCvPdf,
  getCvPdfDownloadUrl,
  uploadCvPdf,
  profileApi,
  scoreCv,
  getCvAnalyses,
} from '../../../infrastructure/api';
import { hasAuthCookie } from '../../../infrastructure/utils/cookieUtils';

/**
 * Format bytes into human readable format (KB, MB)
 */
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Format ISO datetime string to VN format
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function CvListPage() {
  const navigate = useNavigate();

  // Candidate Profile & CV State
  const [candidateId, setCandidateId] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [cvList, setCvList] = useState([]);
  const [cvPdfMap, setCvPdfMap] = useState({}); // { [cvId]: { pdfInfo, downloadUrl, hasPdf: boolean, loading: boolean } }
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  // New CV Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [cvTitle, setCvTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Update PDF for existing CV Modal State
  const [updatePdfCv, setUpdatePdfCv] = useState(null);
  const [updateFile, setUpdateFile] = useState(null);
  const [isUpdatingPdf, setIsUpdatingPdf] = useState(false);
  const updateFileInputRef = useRef(null);

  // Rename CV Modal State
  const [renameCv, setRenameCv] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete CV Modal State
  const [deleteTargetCv, setDeleteTargetCv] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Public CV Toggle Modal State
  const [confirmPublicCv, setConfirmPublicCv] = useState(null);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);

  // PDF Preview Modal State
  const [previewPdf, setPreviewPdf] = useState(null); // { title, downloadUrl, fileName, versionNo, size }

  // AI Scoring Modal State
  const [scoringCv, setScoringCv] = useState(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringResult, setScoringResult] = useState(null);
  const [targetJobTitle, setTargetJobTitle] = useState('');
  const [scoringError, setScoringError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Initial Load: Check candidate auth & load profile
  useEffect(() => {
    if (!hasAuthCookie()) {
      navigate('/login?redirect=/cvs');
      return;
    }
    loadCandidateData();
  }, []);

  const loadCandidateData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const profile = await profileApi.getCandidateProfile();
      if (!profile || !profile.id) {
        throw new Error('Không tìm thấy thông tin ứng viên. Vui lòng hoàn tất hồ sơ cá nhân.');
      }
      setCandidateProfile(profile);
      setCandidateId(profile.id);

      // Load CV list for candidate
      await loadCvs(profile.id);
    } catch (err) {
      console.error('Lỗi khi tải thông tin ứng viên:', err);
      setErrorMsg(err.message || 'Không thể tải danh sách CV. Vui lòng đăng nhập lại.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Load CV list & fetch PDF metadata for each CV
  const loadCvs = async (cid) => {
    try {
      const cvs = await getCvs(cid);
      const list = Array.isArray(cvs) ? cvs : [];
      setCvList(list);

      // Fetch PDF metadata for each CV in parallel
      const pdfMap = {};
      await Promise.all(
        list.map(async (cv) => {
          try {
            const [pdfInfo, downloadRes] = await Promise.all([
              getCurrentCvPdf(cv.id).catch(() => null),
              getCvPdfDownloadUrl(cv.id).catch(() => null),
            ]);

            if (pdfInfo) {
              pdfMap[cv.id] = {
                hasPdf: true,
                pdfInfo,
                downloadUrl: downloadRes?.downloadUrl || '',
                loading: false,
              };
            } else {
              pdfMap[cv.id] = {
                hasPdf: false,
                pdfInfo: null,
                downloadUrl: '',
                loading: false,
              };
            }
          } catch {
            pdfMap[cv.id] = {
              hasPdf: false,
              pdfInfo: null,
              downloadUrl: '',
              loading: false,
            };
          }
        })
      );
      setCvPdfMap(pdfMap);
    } catch (err) {
      console.error('Lỗi tải danh sách CV:', err);
      showToast('Không thể tải danh sách CV.', 'error');
    }
  };

  // 3. Handle File Selection for New CV Upload
  const handleFileSelect = (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Vui lòng chọn file có định dạng .PDF', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Kích thước file PDF không được vượt quá 10 MB', 'error');
      return;
    }

    setSelectedFile(file);
    // Auto-generate title if not already provided
    if (!cvTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setCvTitle(cleanName);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setCvTitle('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 4. Create CV & Upload PDF to Backend & AWS S3
  const handleUploadNewCv = async (e) => {
    e.preventDefault();
    if (cvList.length >= 3) {
      showToast('Mỗi tài khoản chỉ được lưu tối đa 3 CV. Vui lòng xóa bớt CV cũ trước khi tải lên mới.', 'error');
      return;
    }
    if (!selectedFile) {
      showToast('Vui lòng chọn file PDF để tải lên', 'error');
      return;
    }
    if (!cvTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề cho CV', 'error');
      return;
    }
    if (!candidateId) {
      showToast('Không xác định được ID ứng viên', 'error');
      return;
    }

    setIsUploading(true);
    try {
      // Bước 1: Tạo bản ghi CV trong bảng cvs
      const newCv = await createCv(candidateId, { title: cvTitle.trim() });
      if (!newCv || !newCv.id) {
        throw new Error('Tạo bản ghi CV thất bại');
      }

      // Bước 2: Tải file PDF lên S3 và lưu vào cv_pdf_files
      const uploadRes = await uploadCvPdf(newCv.id, selectedFile);

      showToast(`Tải lên CV "${cvTitle.trim()}" thành công!`, 'success');

      // Reset form
      clearSelectedFile();

      // Reload list
      await loadCvs(candidateId);
    } catch (err) {
      console.error('Lỗi khi tải lên CV:', err);
      showToast(err.message || 'Tải lên CV thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // 5. Update / Re-upload PDF for existing CV
  const handleUpdatePdf = async (e) => {
    e.preventDefault();
    if (!updatePdfCv || !updateFile) {
      showToast('Vui lòng chọn file PDF mới', 'error');
      return;
    }

    setIsUpdatingPdf(true);
    try {
      await uploadCvPdf(updatePdfCv.id, updateFile);
      showToast(`Đã cập nhật file PDF mới cho CV "${updatePdfCv.title}"!`, 'success');
      setUpdatePdfCv(null);
      setUpdateFile(null);
      await loadCvs(candidateId);
    } catch (err) {
      console.error('Lỗi khi cập nhật file PDF:', err);
      showToast(err.message || 'Cập nhật PDF thất bại.', 'error');
    } finally {
      setIsUpdatingPdf(false);
    }
  };

  // 6. Rename CV
  const handleRenameCv = async (e) => {
    e.preventDefault();
    if (!renameCv || !renameTitle.trim()) {
      showToast('Tiêu đề CV không được để trống', 'error');
      return;
    }

    setIsRenaming(true);
    try {
      await updateCv(candidateId, renameCv.id, { title: renameTitle.trim() });
      showToast(`Đổi tên CV thành "${renameTitle.trim()}" thành công!`, 'success');
      setRenameCv(null);
      setRenameTitle('');
      await loadCvs(candidateId);
    } catch (err) {
      console.error('Lỗi đổi tên CV:', err);
      showToast(err.message || 'Không thể đổi tên CV.', 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  // 7. Delete CV
  const handleDeleteCv = async () => {
    if (!deleteTargetCv) return;

    setIsDeleting(true);
    try {
      await deleteCv(candidateId, deleteTargetCv.id);
      showToast(`Đã xóa CV "${deleteTargetCv.title}" thành công!`, 'success');
      setDeleteTargetCv(null);
      await loadCvs(candidateId);
    } catch (err) {
      console.error('Lỗi khi xóa CV:', err);
      showToast(err.message || 'Xóa CV thất bại.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 7.1 Toggle Public Status (Chỉ 1 CV được mở is_public)
  const handleTogglePublic = (cv) => {
    if (cv.isPublic) {
      // Đang công khai -> tắt về riêng tư
      executeSetPublic(cv, false);
    } else {
      // Đang riêng tư -> mở modal xác nhận sẽ tắt các CV công khai khác
      setConfirmPublicCv(cv);
    }
  };

  const executeSetPublic = async (cv, nextStatus) => {
    setIsTogglingPublic(true);
    try {
      await setCvPublicStatus(candidateId, cv.id, nextStatus);
      setCvList((prev) =>
        prev.map((item) => ({
          ...item,
          isPublic: item.id === cv.id ? nextStatus : false,
        }))
      );
      if (nextStatus) {
        showToast(`Đã bật công khai CV "${cv.title}" cho Nhà tuyển dụng tìm kiếm!`, 'success');
      } else {
        showToast(`Đã chuyển CV "${cv.title}" về chế độ riêng tư.`, 'success');
      }
      setConfirmPublicCv(null);
    } catch (err) {
      console.error('Lỗi khi đổi trạng thái công khai:', err);
      showToast(err.message || 'Không thể đổi trạng thái công khai của CV.', 'error');
    } finally {
      setIsTogglingPublic(false);
    }
  };

  // 8. Open PDF preview

  const handleOpenPreview = async (cv) => {
    const pdfState = cvPdfMap[cv.id];
    let downloadUrl = pdfState?.downloadUrl;

    // Lấy URL mới nếu chưa có URL tải PDF
    if (!downloadUrl) {
      try {
        const res = await getCvPdfDownloadUrl(cv.id);
        downloadUrl = res?.downloadUrl;
      } catch (err) {
        console.error('Lỗi lấy URL PDF:', err);
        showToast('Không lấy được link mở file PDF.', 'error');
        return;
      }
    }

    if (!downloadUrl) {
      showToast('Không tìm thấy file PDF để mở.', 'error');
      return;
    }

    // Mở PDF trong tab mới
    const newTab = window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  };

  // 9. AI Scoring handlers
  const handleOpenScoring = async (cv) => {
    setScoringCv(cv);
    setScoringResult(null);
    setScoringError('');
    setTargetJobTitle(cv.title || '');
    setLoadingHistory(true);
    try {
      const analyses = await getCvAnalyses(candidateId, cv.id);
      if (Array.isArray(analyses) && analyses.length > 0) {
        setScoringResult(analyses[0]); // Hiển thị kết quả chấm điểm gần nhất nếu có
      }
    } catch (err) {
      console.warn('Không thể tải lịch sử chấm điểm CV:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExecuteScore = async () => {
    if (!scoringCv) return;
    setIsScoring(true);
    setScoringError('');
    try {
      const payload = {};
      if (targetJobTitle && targetJobTitle.trim()) {
        payload.targetJobTitle = targetJobTitle.trim();
      }
      const result = await scoreCv(candidateId, scoringCv.id, payload);
      setScoringResult(result);
      showToast('AI đã hoàn tất chấm điểm CV của bạn!');
    } catch (err) {
      console.error('Lỗi khi AI chấm điểm CV:', err);
      const msg = err.response?.data?.message || err.message || 'Chấm điểm CV thất bại. Vui lòng thử lại sau.';
      setScoringError(msg);
      showToast(msg, 'error');
    } finally {
      setIsScoring(false);
    }
  };


  // Stats calculation
  const totalCvs = cvList.length;
  const cvsWithPdf = Object.values(cvPdfMap).filter((item) => item.hasPdf).length;

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] pb-16 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-24 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border transition-all animate-bounceIn text-sm font-semibold ${toast.type === 'error'
              ? 'bg-[#ba1a1a] text-white border-red-400'
              : 'bg-[#005c55] text-white border-emerald-400'
            }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HERO / BANNER HEADER                                                  */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-r from-[#005c55] via-[#007952] to-[#0f766e] text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-100/80 mb-3">
            <Link to="/" className="hover:text-white transition-colors">
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-white">Quản lý hồ sơ CV</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-white mb-3">
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span>Hồ sơ CV (File PDF)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                Danh Sách CV Của Bạn
              </h1>
              <p className="mt-2 text-sm sm:text-base text-emerald-100/90 max-w-2xl leading-relaxed">
                Tải lên và lưu trữ các bản CV dạng PDF để sẵn sàng ứng tuyển các cơ hội việc làm hấp
                dẫn tại KiemJob. Hệ thống hỗ trợ lưu trữ an toàn trên AWS S3 và phân tích CV bằng AI.
              </p>
            </div>

            {/* Quick Stats Badges & Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (cvList.length >= 3) {
                    showToast('Bạn đã đạt giới hạn tối đa 3 CV. Hãy xóa bớt CV cũ trước khi tải lên mới.', 'error');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white text-[#005c55] hover:bg-emerald-50 font-bold text-sm shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                <span>Tải lên CV (PDF)</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3.5 text-center min-w-[100px] flex-1 sm:flex-initial">
                  <p className="text-2xl font-black">{totalCvs}</p>
                  <p className="text-xs text-emerald-100 font-medium">Tổng số CV</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3.5 text-center min-w-[100px] flex-1 sm:flex-initial">
                  <p className="text-2xl font-black text-[#97f5cc]">{cvsWithPdf}</p>
                  <p className="text-xs text-emerald-100 font-medium">Đã có PDF</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER                                                         */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ==================== LEFT COLUMN: UPLOAD NEW CV (lg:col-span-5) ==================== */}
          <div className="lg:col-span-5 space-y-6">
            {/* Box Tải lên file PDF */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eaedff] relative overflow-hidden">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-[#e6f7f5] text-[#005c55] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">upload_file</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#131b2e]">Tải lên CV mới (PDF)</h2>
                  <p className="text-xs text-[#6e7977]">Định dạng PDF (tối đa 10 MB)</p>
                </div>
              </div>

              {cvList.length >= 3 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 mb-4">
                  <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
                  <div>
                    <p className="font-bold">Đã đạt giới hạn 3/3 CV</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Mỗi tài khoản chỉ được lưu tối đa 3 bản CV. Vui lòng xóa bớt 1 bản CV cũ nếu bạn muốn tải lên hoặc tạo bản CV mới.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleUploadNewCv} className="space-y-4">
                {/* Drag and Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (cvList.length >= 3) {
                      showToast('Bạn đã đạt giới hạn tối đa 3 CV. Hãy xóa bớt CV cũ nếu muốn tải thêm.', 'error');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 ${
                    cvList.length >= 3
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      : isDragging
                        ? 'border-[#005c55] bg-[#e6f7f5]/60 scale-[1.01] cursor-pointer'
                        : selectedFile
                          ? 'border-[#005c55] bg-[#e6f7f5]/20 cursor-pointer'
                          : 'border-[#cfd5d3] hover:border-[#005c55] hover:bg-[#faf8ff] cursor-pointer'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-[#005c55] text-white flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-[28px]">
                          picture_as_pdf
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#131b2e] break-all">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs font-semibold text-[#005c55]">
                        Dung lượng: {formatFileSize(selectedFile.size)}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSelectedFile();
                        }}
                        className="inline-flex items-center gap-1 text-xs text-[#ba1a1a] hover:underline pt-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        <span>Chọn lại file khác</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-[#f2f3ff] text-[#005c55] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px]">
                          cloud_upload
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#131b2e]">
                          Kéo thả file CV của bạn vào đây
                        </p>
                        <p className="text-xs text-[#6e7977] mt-0.5">
                          hoặc <span className="text-[#005c55] underline font-semibold">chọn file từ máy tính</span>
                        </p>
                      </div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#eaedff] text-[11px] font-semibold text-[#3e4947]">
                        Chỉ chấp nhận file .PDF
                      </span>
                    </div>
                  )}
                </div>

                {/* CV Title Input */}
                <div>
                  <label className="block text-xs font-bold text-[#131b2e] mb-1.5">
                    Tên / Tiêu đề hồ sơ CV <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cvTitle}
                    onChange={(e) => setCvTitle(e.target.value)}
                    placeholder="VD: CV - Frontend Developer - Tiếng Việt"
                    className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#d9e2ec] rounded-xl text-sm text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55] transition-all"
                  />
                  <p className="text-[11px] text-[#6e7977] mt-1">
                    Đặt tên gợi nhớ để bạn dễ dàng lựa chọn khi nộp hồ sơ ứng tuyển.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUploading || !selectedFile || !cvTitle.trim() || cvList.length >= 3}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                      isUploading || !selectedFile || !cvTitle.trim() || cvList.length >= 3
                        ? 'bg-[#a3b8b5] cursor-not-allowed shadow-none'
                        : 'bg-[#005c55] hover:bg-[#007952] active:scale-[0.99]'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang tải lên AWS S3...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                        <span>Tải lên & Lưu CV</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Tips Box */}
            <div className="bg-[#f0fbf8] rounded-3xl p-5 border border-[#80d5cb]/40 text-xs text-[#005c55] space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                <span>Lưu ý khi tải CV lên KiemJob</span>
              </div>
              <ul className="space-y-1.5 text-[11px] leading-relaxed text-[#1e463f] list-disc list-inside">
                <li>CV phải được lưu ở định dạng PDF chuẩn, không bị mã hóa mật khẩu.</li>
                <li>Dung lượng file tối đa là 10 MB.</li>
                <li>Bạn có thể tải lên nhiều bản CV phù hợp với từng vị trí công việc khác nhau.</li>
                <li>File sẽ được lưu trữ an toàn trên AWS S3 và bảo mật riêng tư.</li>
              </ul>
            </div>
          </div>

          {/* ==================== RIGHT COLUMN: CV LIST (lg:col-span-7) ==================== */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eaedff]">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#eaedff] flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-[#131b2e]">
                      Danh sách CV hiện có
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        cvList.length >= 3
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-teal-50 text-[#005c55] border-teal-200'
                      }`}
                    >
                      {cvList.length}/3 CV
                    </span>
                  </div>
                  <p className="text-xs text-[#6e7977] mt-0.5">
                    Mỗi tài khoản lưu tối đa 3 CV. Chỉ 1 CV được bật công khai cho Nhà tuyển dụng tìm kiếm.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => candidateId && loadCvs(candidateId)}
                  className="px-3 py-1.5 rounded-xl border border-[#eaedff] hover:bg-[#f2f3ff] text-xs font-semibold text-[#005c55] flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Làm mới danh sách"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Làm mới</span>
                </button>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-[#005c55] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-[#6e7977]">
                    Đang tải danh sách CV của bạn...
                  </p>
                </div>
              )}

              {/* Error State */}
              {!loading && errorMsg && (
                <div className="p-4 rounded-2xl bg-[#ffdad6]/40 border border-[#ba1a1a]/30 text-xs text-[#ba1a1a] flex items-center justify-between">
                  <span>{errorMsg}</span>
                  <button
                    onClick={loadCandidateData}
                    className="font-bold underline ml-2 cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!loading && !errorMsg && cvList.length === 0 && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-[#f2f3ff] text-[#005c55] flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[36px]">folder_open</span>
                  </div>
                  <div className="max-w-sm mx-auto">
                    <h3 className="text-base font-bold text-[#131b2e]">Chưa có bản CV nào</h3>
                    <p className="text-xs text-[#6e7977] mt-1 leading-relaxed">
                      Bạn chưa tải lên CV nào. Hãy sử dụng form bên trái để chọn file PDF và tạo
                      bản CV đầu tiên ngay nhé!
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#005c55] text-white text-xs font-bold shadow-md hover:bg-[#007952] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                      <span>Tải lên CV (PDF) ngay</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CV Cards List */}
              {!loading && !errorMsg && cvList.length > 0 && (
                <div className="space-y-4">
                  {cvList.map((cv) => {
                    const pdfData = cvPdfMap[cv.id];
                    const hasPdf = pdfData?.hasPdf;
                    const pdfInfo = pdfData?.pdfInfo;

                    return (
                      <div
                        key={cv.id}
                        className="p-5 rounded-2xl border border-[#eaedff] bg-[#faf8ff] hover:bg-white hover:border-[#80d5cb] hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          {/* Left: Icon & CV Details */}
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#005c55] text-white shadow-sm">
                              <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-[#131b2e] truncate">
                                  {cv.title || 'CV chưa đặt tên'}
                                </h3>

                                {/* Badges */}
                                {cv.isPublic ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>★ Đang công khai tìm việc</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200">
                                    <span className="material-symbols-outlined text-[12px] text-slate-400">lock</span>
                                    <span>Riêng tư</span>
                                  </span>
                                )}

                                {hasPdf ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#97f5cc]/40 text-[#005c55] text-[10px] font-bold border border-[#005c55]/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#005c55]" />
                                    <span>Đã có PDF v{pdfInfo?.versionNo || 1}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffe082]/40 text-[#b45309] text-[10px] font-bold border border-[#b45309]/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#b45309]" />
                                    <span>Chưa có file PDF</span>
                                  </span>
                                )}
                              </div>

                              {/* Details text */}
                              <div className="mt-2 text-xs text-[#6e7977] space-y-1">
                                {hasPdf && pdfInfo ? (
                                  <>
                                    <p className="flex items-center gap-1.5 text-[#131b2e] font-semibold truncate">
                                      <span className="material-symbols-outlined text-[16px] text-[#005c55]">
                                        attach_file
                                      </span>
                                      <span className="truncate">{pdfInfo.fileName}</span>
                                      <span className="text-[11px] text-[#6e7977] font-normal">
                                        ({formatFileSize(pdfInfo.fileSizeBytes)})
                                      </span>
                                    </p>
                                    {pdfInfo.createdAt && (
                                      <p className="text-[11px] text-[#8e9997]">
                                        Tải lên: {formatDate(pdfInfo.createdAt)}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-[11px] text-[#b45309]">
                                    CV này chưa được đính kèm file PDF. Vui lòng tải file lên để nộp ứng tuyển.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                            {/* Rename button */}
                            <button
                              type="button"
                              onClick={() => {
                                setRenameCv(cv);
                                setRenameTitle(cv.title);
                              }}
                              className="p-2 rounded-xl text-[#6e7977] hover:text-[#005c55] hover:bg-[#e6f7f5] transition-colors cursor-pointer"
                              title="Đổi tên tiêu đề CV"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>

                            {/* Delete CV button */}
                            <button
                              type="button"
                              onClick={() => setDeleteTargetCv(cv)}
                              className="p-2 rounded-xl text-[#6e7977] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
                              title="Xóa CV này"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Bottom Actions Bar */}
                        <div className="mt-4 pt-3 border-t border-[#eaedff] flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasPdf ? (
                              <>
                                {/* Preview PDF */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPreview(cv)}
                                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#f2f3ff] text-[#005c55] border border-[#eaedff] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                  title="Xem trước file PDF"
                                >
                                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                                  <span>Xem PDF</span>
                                </button>

                                {/* Download PDF */}
                                {pdfData?.downloadUrl && (
                                  <a
                                    href={pdfData.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={pdfInfo?.fileName || `${cv.title}.pdf`}
                                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#f2f3ff] text-[#005c55] border border-[#eaedff] text-xs font-bold flex items-center gap-1.5 transition-all"
                                    title="Tải file PDF về máy"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      download
                                    </span>
                                  </a>
                                )}

                                {/* Upload new version */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUpdatePdfCv(cv);
                                    setUpdateFile(null);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-transparent hover:bg-[#e6f7f5] text-[#005c55] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Cập nhật phiên bản PDF mới"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    cloud_sync
                                  </span>
                                  <span>Thay file PDF</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setUpdatePdfCv(cv);
                                  setUpdateFile(null);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#f2f3ff] text-[#005c55] border border-[#005c55]/30 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  upload_file
                                </span>
                                <span>Tải lên file PDF</span>
                              </button>
                            )}

                            {/* Nút Chấm điểm AI */}
                            <button
                              type="button"
                              onClick={() => handleOpenScoring(cv)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                              title="Dùng AI để chấm điểm và phân tích CV của bạn"
                            >
                              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                              <span>Chấm điểm AI</span>
                            </button>

                            {/* Nút Bật / Tắt công khai tìm việc (Cho phép tất cả CV) */}
                            <button
                              type="button"
                              onClick={() => handleTogglePublic(cv)}
                              disabled={isTogglingPublic}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                cv.isPublic
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50 hover:text-[#005c55] hover:border-[#005c55]'
                              }`}
                              title={cv.isPublic ? "Bấm để tắt công khai (chuyển về riêng tư)" : "Bật công khai để Nhà tuyển dụng có thể tìm kiếm và xem CV này"}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {cv.isPublic ? 'visibility' : 'visibility_off'}
                              </span>
                              <span>{cv.isPublic ? 'Đang công khai' : 'Bật tìm việc'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: UPDATE / UPLOAD PDF FOR EXISTING CV                            */}
      {/* ========================================================================= */}
      {updatePdfCv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005c55]">cloud_upload</span>
                <span>Tải lên file PDF cho CV</span>
              </h3>
              <button
                type="button"
                onClick={() => setUpdatePdfCv(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdatePdf} className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">Đang chọn CV:</p>
                <p className="text-sm font-bold text-slate-900">{updatePdfCv.title}</p>
              </div>

              {/* File selector */}
              <div
                onClick={() => updateFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#005c55] rounded-2xl p-5 text-center cursor-pointer bg-slate-50 hover:bg-[#e6f7f5]/30 transition-all"
              >
                <input
                  ref={updateFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      if (!f.name.toLowerCase().endsWith('.pdf')) {
                        showToast('Chỉ chấp nhận file .PDF', 'error');
                        return;
                      }
                      if (f.size > 10 * 1024 * 1024) {
                        showToast('File không được vượt quá 10 MB', 'error');
                        return;
                      }
                      setUpdateFile(f);
                    }
                  }}
                  className="hidden"
                />

                {updateFile ? (
                  <div className="space-y-1">
                    <span className="material-symbols-outlined text-[32px] text-[#005c55]">
                      picture_as_pdf
                    </span>
                    <p className="text-xs font-bold text-slate-900 break-all">{updateFile.name}</p>
                    <p className="text-[11px] text-[#005c55] font-semibold">
                      {formatFileSize(updateFile.size)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="material-symbols-outlined text-[32px] text-slate-400">
                      upload_file
                    </span>
                    <p className="text-xs font-bold text-slate-700">Chọn file PDF mới từ máy tính</p>
                    <p className="text-[11px] text-slate-400">Tối đa 10 MB (.pdf)</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdatePdfCv(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPdf || !updateFile}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer ${isUpdatingPdf || !updateFile
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-[#005c55] hover:bg-[#007952]'
                    }`}
                >
                  {isUpdatingPdf ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Xác nhận tải lên</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: RENAME CV                                                       */}
      {/* ========================================================================= */}
      {renameCv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005c55]">edit</span>
              <span>Đổi tên tiêu đề CV</span>
            </h3>

            <form onSubmit={handleRenameCv} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tiêu đề mới
                </label>
                <input
                  type="text"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  placeholder="Nhập tên mới cho CV..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameCv(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !renameTitle.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer ${isRenaming || !renameTitle.trim()
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-[#005c55] hover:bg-[#007952]'
                    }`}
                >
                  {isRenaming ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: DELETE CONFIRMATION                                             */}
      {/* ========================================================================= */}
      {deleteTargetCv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">delete_forever</span>
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa bản CV này?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn có chắc chắn muốn xóa bản CV{' '}
                <strong className="text-slate-800">"{deleteTargetCv.title}"</strong> không? Toàn bộ
                file PDF đính kèm cũng sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetCv(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteCv}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <span>Đồng ý xóa</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6.1 MODAL: CONFIRM TOGGLE PUBLIC CV                                       */}
      {/* ========================================================================= */}
      {confirmPublicCv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#005c55] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">public</span>
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Bật công khai tìm việc?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Bạn có muốn mở công khai CV <strong className="text-slate-800">"{confirmPublicCv.title}"</strong> để Nhà tuyển dụng có thể tìm thấy và xem hồ sơ của bạn?
              </p>
              <div className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-2xl border border-amber-200 mt-3 text-left space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-amber-600">info</span>
                  <span>Quy định hệ thống:</span>
                </p>
                <p>
                  Mỗi tài khoản chỉ có duy nhất <strong>1 CV được mở công khai</strong>. Khi bật CV này, các CV công khai trước đó của bạn (nếu có) sẽ tự động chuyển về chế độ riêng tư.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPublicCv(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => executeSetPublic(confirmPublicCv, true)}
                disabled={isTogglingPublic}
                className="px-5 py-2.5 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                {isTogglingPublic ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <span>Đồng ý mở công khai</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: AI SCORING CV                                                   */}
      {/* ========================================================================= */}
      {scoringCv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
                <div>
                  <h3 className="font-bold text-base">Chấm điểm CV bằng AI</h3>
                  <p className="text-xs text-white/80 mt-0.5 truncate max-w-[240px]">{scoringCv.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setScoringCv(null); setScoringResult(null); setScoringError(''); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Input: Vị trí muốn ứng tuyển */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Vị trí muốn ứng tuyển <span className="text-slate-400">(tuỳ chọn)</span>
                </label>
                <input
                  type="text"
                  value={targetJobTitle}
                  onChange={(e) => setTargetJobTitle(e.target.value)}
                  placeholder="VD: Lập trình viên Java, Kỹ sư Frontend..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  disabled={isScoring}
                />
                <p className="mt-1 text-[11px] text-slate-400">AI sẽ đánh giá CV phù hợp với vị trí này. Để trống nếu muốn đánh giá tổng quát.</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteScore}
                  disabled={isScoring || loadingHistory}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isScoring || loadingHistory
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md'
                  }`}
                >
                  {isScoring ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang phân tích...</span>
                    </>
                  ) : scoringResult ? (
                    <>
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      <span>Chấm điểm lại</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      <span>Bắt đầu chấm điểm</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error message */}
              {scoringError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-red-500 shrink-0 mt-0.5">error</span>
                  <span>{scoringError}</span>
                </div>
              )}

              {/* Loading history */}
              {loadingHistory && !scoringResult && (
                <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
                  <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải kết quả trước đó...</span>
                </div>
              )}

              {/* Results */}
              {scoringResult && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Overall Score */}
                  {(() => {
                    const score = Number(scoringResult.qualityScore) || 0;
                    const color = score >= 80 ? 'emerald' : score >= 50 ? 'amber' : 'red';
                    const colorClasses = {
                      emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-500', badge: 'bg-emerald-500' },
                      amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-500', badge: 'bg-amber-500' },
                      red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-500', badge: 'bg-red-500' },
                    }[color];
                    const label = score >= 80 ? 'Xuất sắc' : score >= 60 ? 'Tốt' : score >= 40 ? 'Trung bình' : 'Cần cải thiện';
                    return (
                      <div className={`p-4 rounded-2xl ${colorClasses.bg} border ${colorClasses.border} flex items-center gap-4`}>
                        <div className={`w-16 h-16 rounded-2xl ${colorClasses.badge} text-white flex flex-col items-center justify-center shrink-0 shadow-md`}>
                          <span className="text-2xl font-black leading-none">{score}</span>
                          <span className="text-[9px] font-bold opacity-80">/100</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold ${colorClasses.text}`}>Điểm tổng quát: {label}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Tính trên cơ sở: Kỹ năng (40%), Kinh nghiệm (40%), Học vấn (20%)</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Score Breakdown */}
                  {scoringResult.parsedData && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#005c55]">analytics</span>
                        Điểm chi tiết theo mục
                      </h4>
                      {[
                        { key: 'skillMatchScore', label: 'Kỹ năng phù hợp', icon: 'code', weight: '40%' },
                        { key: 'experienceScore', label: 'Kinh nghiệm thực tế', icon: 'work', weight: '40%' },
                        { key: 'educationScore', label: 'Học vấn & Chứng chỉ', icon: 'school', weight: '20%' },
                      ].map(({ key, label, icon, weight }) => {
                        const val = Number(scoringResult.parsedData[key]) || 0;
                        const barColor = val >= 80 ? 'bg-emerald-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-500';
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">{icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-semibold text-slate-600">{label} <span className="text-slate-400">({weight})</span></span>
                                <span className="text-[11px] font-bold text-slate-800">{val}/100</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${val}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary */}
                  {scoringResult.parsedData?.summary && (
                    <div className="p-3.5 rounded-xl bg-[#f0f9ff] border border-[#bae6fd]">
                      <h4 className="text-xs font-bold text-[#0369a1] mb-1.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">summarize</span>
                        Tổng quan
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">{scoringResult.parsedData.summary}</p>
                    </div>
                  )}

                  {/* Strengths */}
                  {scoringResult.parsedData?.strengths?.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <h4 className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                        Điểm mạnh nổi bật
                      </h4>
                      <ul className="space-y-1.5">
                        {scoringResult.parsedData.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Gaps / Suggestions */}
                  {scoringResult.parsedData?.gaps?.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                      <h4 className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                        Gợi ý cải thiện
                      </h4>
                      <ul className="space-y-1.5">
                        {scoringResult.parsedData.gaps.map((g, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action link */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">Kết quả mang tính tham khảo</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
