import React, { useEffect, useState } from 'react';
import { useRecruiterChat } from '../../../application/context/RecruiterChatContext';
import {
  getCvById,
  getLatestCvAnalysis,
} from '../../../infrastructure/api/cvApi';
import {
  getCvPdfDownloadUrl,
} from '../../../infrastructure/api/cvPdfApi';
import {
  getCandidateProfileById,
  getCandidateLinksById,
} from '../../../infrastructure/api/profileApi';
import { createInterview } from '../../../infrastructure/api/interviewApi';
import { updateApplicationStatus } from '../../../infrastructure/api/applicationApi';

const unwrap = (response) => {
  let value = response?.data ?? response;
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, 'data')
  ) {
    value = value.data;
  }
  return value;
};

const toList = (response) => {
  const value = unwrap(response);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

export default function CvDetailModal({
  isOpen,
  onClose,
  candidate,
  jobTitle,
  onUpdateStatus,
}) {
  const [internalNote, setInternalNote] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Lịch phỏng vấn mini-modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [interviewNote, setInterviewNote] = useState('');
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // Tự động chuyển trạng thái sang "viewed" khi nhà tuyển dụng mở CV của đơn đang "pending"
  useEffect(() => {
    if (!isOpen || !candidate) return;

    const appId = candidate.applicationId || candidate.id;
    if (candidate.status === 'pending' && appId) {
      updateApplicationStatus(appId, { status: 'viewed' })
        .then(() => {
          if (onUpdateStatus) {
            onUpdateStatus(appId, 'viewed', { skipApi: true });
          }
        })
        .catch((err) => {
          console.warn('Không thể tự động chuyển trạng thái sang viewed:', err);
        });
    }
  }, [isOpen, candidate?.applicationId, candidate?.id, candidate?.status, onUpdateStatus]);

  const [cvData, setCvData] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState({
    fullname: '',
    headline: '',
    email: '',
    phone: '',
    address: '',
    avatarUrl: '',
    portfolioUrl: '',
  });

  const [pdfDownloadUrl, setPdfDownloadUrl] = useState('');
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [activeCvTab, setActiveCvTab] = useState('pdf'); // 'pdf' | 'ai'

  const [loadingCv, setLoadingCv] = useState(false);
  const [cvError, setCvError] = useState('');

  useEffect(() => {
    if (!isOpen || !candidate) return;

    const candidateId = candidate.candidateId || candidate.candidate?.id || candidate.candidate_id;
    const cvId = candidate.cvId || candidate.cv?.id || candidate.cv_id;

    if (!cvId) {
      setCvData(null);
      setPdfDownloadUrl('');
      setCvAnalysis(null);
      setCvError('Không tìm thấy mã CV (cvId) hợp lệ.');
      setLoadingCv(false);
      return;
    }

    let cancelled = false;

    const loadCv = async () => {
      setLoadingCv(true);
      setCvError('');
      setCvData(null);
      setPdfDownloadUrl('');
      setCvAnalysis(null);

      try {
        const [
          cvResult,
          profileResult,
          linksResult,
          pdfResult,
          analysisResult,
        ] = await Promise.allSettled([
          candidateId ? getCvById(candidateId, cvId) : Promise.reject('No candidateId'),
          candidateId ? getCandidateProfileById(candidateId) : Promise.reject('No candidateId'),
          candidateId ? getCandidateLinksById(candidateId) : Promise.reject('No candidateId'),
          getCvPdfDownloadUrl(cvId),
          getLatestCvAnalysis(cvId, candidateId),
        ]);

        if (cancelled) return;

        // 1. PDF Download URL
        if (pdfResult.status === 'fulfilled' && pdfResult.value?.downloadUrl) {
          setPdfDownloadUrl(pdfResult.value.downloadUrl);
        }

        // 2. AI Analysis
        if (analysisResult.status === 'fulfilled') {
          const unwrappedAnalysis = unwrap(analysisResult.value);
          if (unwrappedAnalysis) {
            setCvAnalysis(unwrappedAnalysis);
          }
        }

        // 3. CV Data
        if (cvResult.status === 'fulfilled') {
          const loadedCv = unwrap(cvResult.value);
          if (loadedCv) {
            setCvData(loadedCv);
          }
        }

        // 4. Profile mapping
        const pData = profileResult.status === 'fulfilled' ? unwrap(profileResult.value) : null;
        const linksData = linksResult.status === 'fulfilled' ? toList(linksResult.value) : [];
        const primaryLink = linksData.length > 0 ? (linksData[0].link || linksData[0].url) : '';

        const resolvedFullname =
          candidate.candidateName ||
          candidate.fullName ||
          candidate.full_name ||
          candidate.name ||
          pData?.fullname ||
          '';

        const resolvedHeadline =
          candidate.candidateHeadline ||
          candidate.headline ||
          pData?.headline ||
          cvData?.title ||
          '';

        const resolvedEmail =
          candidate.candidateEmail ||
          candidate.email ||
          pData?.email ||
          '';

        const resolvedPhone =
          candidate.candidatePhone ||
          candidate.phone ||
          pData?.phone ||
          '';

        const resolvedAddress =
          candidate.candidateAddress ||
          candidate.addressDetail ||
          candidate.address ||
          [pData?.addressDetail, pData?.provinceName].filter(Boolean).join(', ') ||
          '';

        const resolvedAvatar =
          candidate.candidateAvatar ||
          candidate.avatarUrl ||
          candidate.avatar ||
          pData?.avatarUrl ||
          '';

        setCandidateProfile({
          fullname: resolvedFullname,
          headline: resolvedHeadline,
          email: resolvedEmail,
          phone: resolvedPhone,
          address: resolvedAddress,
          avatarUrl: resolvedAvatar,
          portfolioUrl: primaryLink || candidate.portfolioUrl || candidate.github || candidate.githubUrl || '',
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Lỗi tải CV ứng viên:', error);
        setCvError('Không thể tải chi tiết CV ứng viên. Vui lòng thử lại sau.');
      } finally {
        if (!cancelled) setLoadingCv(false);
      }
    };

    loadCv();

    return () => {
      cancelled = true;
    };
  }, [isOpen, candidate?.candidateId, candidate?.cvId]);

  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const { openChatWithCandidate } = useRecruiterChat();

  const handleOpenChatWithCandidate = async () => {
    const candidateId = candidate?.candidateId || candidate?.id;
    if (!candidateId) {
      showToast('Không tìm thấy thông tin ứng viên để mở tin nhắn.');
      return;
    }
    try {
      if (openChatWithCandidate) {
        await openChatWithCandidate({ candidateId });
      }
      showToast(`Đã mở khung tin nhắn với ứng viên ${candidateProfile?.fullname || candidate.candidateName || ''}`);
    } catch (err) {
      showToast('Không thể mở cuộc trò chuyện với ứng viên. Vui lòng thử lại sau.');
    }
  };

  const handleAction = (statusKey, statusLabel) => {
    if (onUpdateStatus) {
      onUpdateStatus(candidate.id, statusKey);
    }
    showToast(`Đã chuyển trạng thái ứng viên sang: ${statusLabel}`);
  };

  const getMinDateTimeLocal = () => {
    const d = new Date(Date.now() + 60000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenScheduleModal = () => {
    setScheduledAt('');
    setInterviewNote('');
    setScheduleError('');
    setIsScheduleModalOpen(true);
  };

  const handleCloseScheduleModal = () => {
    if (scheduleSubmitting) return;
    setIsScheduleModalOpen(false);
    setScheduleError('');
  };

  const handleConfirmSchedule = async (e) => {
    if (e) e.preventDefault();
    setScheduleError('');

    if (!scheduledAt) {
      setScheduleError('Vui lòng chọn ngày và giờ phỏng vấn');
      return;
    }

    const selectedTime = new Date(scheduledAt).getTime();
    if (Number.isNaN(selectedTime) || selectedTime <= Date.now()) {
      setScheduleError('Thời gian phỏng vấn phải ở tương lai');
      return;
    }

    if (!interviewNote || !interviewNote.trim()) {
      setScheduleError('Vui lòng nhập ghi chú nơi gặp (ví dụ: Tầng 5, tòa A, 12 Duy Tân)');
      return;
    }

    const appId = candidate?.applicationId || candidate?.id;
    if (!appId) {
      setScheduleError('Không tìm thấy thông tin đơn ứng tuyển');
      return;
    }

    try {
      setScheduleSubmitting(true);
      await createInterview({
        applicationId: Number(appId),
        title: 'Phỏng vấn',
        scheduledAt,
        note: interviewNote.trim(),
      });

      setIsScheduleModalOpen(false);
      setScheduledAt('');
      setInterviewNote('');

      if (onUpdateStatus) {
        onUpdateStatus(appId, 'interview', { skipApi: true });
      }

      showToast('Đã chuyển trạng thái ứng viên sang: Đã qua vòng CV - chờ phỏng vấn');
    } catch (err) {
      console.error('Lỗi khi đặt lịch phỏng vấn:', err);
      const serverMsg = err?.data?.message || err?.message || 'Có lỗi xảy ra khi đặt lịch phỏng vấn';
      setScheduleError(serverMsg);
    } finally {
      setScheduleSubmitting(false);
    }
  };

  if (!isOpen || !candidate) return null;

  const coverLetterText = candidate.coverLetter || candidate.coverLatter;
  const cvId = candidate.cvId || candidate.cv?.id || candidate.cv_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn font-['Plus_Jakarta_Sans',system-ui,sans-serif]">
      {/* ==================== PRINT STYLES ==================== */}
      <style>{`
        @media print {
          body, html {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden, header, footer, button, .modal-header-bar, .modal-footer-bar {
            display: none !important;
          }
        }
      `}</style>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[60] bg-[#111111] text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2 border border-white/10 text-xs sm:text-sm font-semibold">
          <span className="material-symbols-outlined text-[#97f5cc] text-[20px]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal Dialog Window */}
      <div className="relative w-full max-w-5xl bg-[#F8FAFC] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200 max-h-[95vh]">
        {/* ============================================================ */}
        {/* MODAL TOP HEADER BAR                                         */}
        {/* ============================================================ */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs modal-header-bar print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs overflow-hidden">
              {candidateProfile.avatarUrl ? (
                <img src={candidateProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-lg">badge</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {candidateProfile.fullname || 'Ứng viên ứng tuyển'}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  CV #{cvId}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {candidateProfile.headline || cvData?.title || 'Hồ sơ CV'} • Ứng tuyển vị trí:{' '}
                <strong className="text-[#005c55]">{jobTitle || 'Tin tuyển dụng'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {pdfDownloadUrl && (
              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 rounded-lg bg-[#005c55] hover:bg-[#0f766e] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Mở file PDF gốc trong tab mới"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span className="hidden sm:inline">Mở PDF gốc</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                showToast('Đang chuẩn bị bản in...');
                setTimeout(() => window.print(), 300);
              }}
              className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="In thông tin"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span className="hidden sm:inline">In</span>
            </button>
            <div className="h-5 w-px bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MODAL BODY (Scrollable Workspace)                            */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start bg-[#F8FAFC]">
          {loadingCv && (
            <div className="w-full py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-9 h-9 border-3 border-teal-200 border-t-[#005c55] rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-600">Đang tải hồ sơ CV và phân tích AI...</p>
            </div>
          )}

          {!loadingCv && cvError && (
            <div className="w-full max-w-4xl p-5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-base">error</span>
                <span>Thông báo lỗi tải hồ sơ</span>
              </p>
              <p>{cvError}</p>
            </div>
          )}

          {!loadingCv && !cvError && (
            <>
              {/* Phân tích độ phù hợp theo yêu cầu bài đăng (Job Application AI Scoring) nếu có */}
              {(candidate.aiOverallScore != null || candidate.aiScoreStatus) && (
                <div className="w-full max-w-4xl mb-5 bg-white border border-teal-200 rounded-2xl p-5 text-xs shadow-xs print:hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border font-black ${
                          candidate.aiOverallScore >= 75
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : candidate.aiOverallScore >= 50
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        <span className="text-lg leading-none">{candidate.aiOverallScore ?? '--'}</span>
                        <span className="text-[9px] uppercase tracking-wider mt-0.5 opacity-80">Điểm khớp</span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-teal-600">auto_awesome</span>
                          <span>Độ phù hợp với bài đăng tuyển dụng</span>
                        </h4>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Trọng số: Kỹ năng (50%) • Kinh nghiệm (35%) • Học vấn (15%)
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 text-right">
                      {candidate.aiModel && <div>Mô hình: <span className="font-mono text-slate-600">{candidate.aiModel}</span></div>}
                      <span className="italic text-amber-700 font-medium">Điểm do AI gợi ý, nhà tuyển dụng quyết định</span>
                    </div>
                  </div>

                  {/* 3 Thanh Điểm Thành Phần */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 mb-1">
                        <span>Kỹ năng</span>
                        <span className="font-bold text-slate-800">{candidate.aiSkillScore ?? '--'}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${candidate.aiSkillScore || 0}%` }}></div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 mb-1">
                        <span>Kinh nghiệm</span>
                        <span className="font-bold text-slate-800">{candidate.aiExperienceScore ?? '--'}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${candidate.aiExperienceScore || 0}%` }}></div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 mb-1">
                        <span>Học vấn</span>
                        <span className="font-bold text-slate-800">{candidate.aiEducationScore ?? '--'}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${candidate.aiEducationScore || 0}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Nhận xét AI tóm tắt */}
                  {candidate.aiSummary && (
                    <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 text-slate-700 text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-teal-600 text-base shrink-0 mt-0.5">comment</span>
                      <p className="leading-relaxed">{candidate.aiSummary}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Thư giới thiệu (Cover Letter) nếu ứng viên có đính kèm */}
              {coverLetterText && (
                <div className="w-full max-w-4xl mb-5 bg-white border border-slate-200 rounded-2xl p-5 text-xs text-slate-800 shadow-xs print:hidden">
                  <div className="flex items-center gap-1.5 mb-2 font-bold text-slate-900 pb-2 border-b border-slate-100">
                    <span className="material-symbols-outlined text-base text-[#005c55]">mail</span>
                    <span>Thư giới thiệu của ứng viên (Cover Letter)</span>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed text-slate-700">
                    {coverLetterText}
                  </p>
                </div>
              )}

              {/* Tabs Switcher: PDF vs Phân tích AI */}
              <div className="w-full max-w-4xl flex items-center justify-between mb-4 flex-wrap gap-2 print:hidden">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">Hồ sơ ứng viên</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs text-slate-500">CV ID #{cvId}</span>
                </div>

                <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveCvTab('pdf')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeCvTab === 'pdf'
                        ? 'bg-[#005c55] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    <span>File PDF của CV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCvTab('ai')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeCvTab === 'ai'
                        ? 'bg-[#005c55] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    <span>Phân tích AI</span>
                    {cvAnalysis?.qualityScore != null && (
                      <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        activeCvTab === 'ai' ? 'bg-white/20 text-white' : 'bg-teal-100 text-[#005c55]'
                      }`}>
                        {cvAnalysis.qualityScore}đ
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab 1: PDF Viewer */}
              {activeCvTab === 'pdf' && (
                <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {pdfDownloadUrl ? (
                    <>
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-2 font-medium text-slate-700">
                          <span className="material-symbols-outlined text-rose-600 text-[18px]">picture_as_pdf</span>
                          <span>Bản xem trước tài liệu PDF gốc do ứng viên tải lên</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={pdfDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold flex items-center gap-1 text-[11px] transition-colors"
                            title="Mở PDF trong tab mới"
                          >
                            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                            <span>Mở tab mới</span>
                          </a>
                          <a
                            href={pdfDownloadUrl}
                            download
                            className="px-2.5 py-1 bg-[#005c55] hover:bg-[#0f766e] text-white rounded-lg font-semibold flex items-center gap-1 text-[11px] transition-colors"
                            title="Tải file PDF về máy"
                          >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                            <span>Tải xuống</span>
                          </a>
                        </div>
                      </div>
                      <iframe
                        src={`${pdfDownloadUrl}#toolbar=1&navpanes=0`}
                        title="CV PDF ứng viên"
                        className="w-full border-0"
                        style={{ height: '900px' }}
                      />
                    </>
                  ) : (
                    <div className="py-24 px-6 text-center text-slate-500 space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-700">Chưa có file PDF đính kèm</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Hồ sơ CV này hiện chưa có file PDF nào được lưu trữ trên hệ thống.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: AI Analysis & Detailed Evaluation */}
              {activeCvTab === 'ai' && (
                <div className="w-full max-w-4xl space-y-5">
                  {cvAnalysis ? (
                    <>
                      {/* Thẻ Điểm Đánh Giá & Tóm Tắt */}
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-black shadow-xs ${
                                (cvAnalysis.qualityScore ?? 0) >= 75
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : (cvAnalysis.qualityScore ?? 0) >= 50
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : 'bg-rose-50 border-rose-200 text-rose-700'
                              }`}
                            >
                              <span className="text-2xl leading-none">{cvAnalysis.qualityScore ?? '--'}</span>
                              <span className="text-[10px] uppercase tracking-wider mt-1 font-bold opacity-80">/ 100</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-base text-slate-900">
                                  Chất lượng tổng quan CV
                                </h4>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-[#005c55] border border-teal-200">
                                  {cvAnalysis.parsedData?.detectedField || 'Tổng hợp'}
                                </span>
                                {cvAnalysis.parsedData?.detectedLevel && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 uppercase">
                                    {cvAnalysis.parsedData.detectedLevel}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <span>Trạng thái: <strong className="text-slate-700">{cvAnalysis.analysisStatus || 'completed'}</strong></span>
                                {cvAnalysis.analyzedAt && (
                                  <>
                                    <span>•</span>
                                    <span>Đã phân tích: {new Date(cvAnalysis.analyzedAt).toLocaleString('vi-VN')}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tóm tắt CV từ AI */}
                        {(cvAnalysis.summary || cvAnalysis.parsedData?.summary) && (
                          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[17px] text-[#005c55]">subject</span>
                              <span>Tóm tắt hồ sơ năng lực (AI Summary)</span>
                            </div>
                            <p className="leading-relaxed text-slate-600 pl-6">
                              {cvAnalysis.summary || cvAnalysis.parsedData?.summary}
                            </p>
                          </div>
                        )}

                        {/* Điểm các hạng mục thành phần nếu có */}
                        {(cvAnalysis.parsedData?.skillsScore != null || cvAnalysis.parsedData?.experienceScore != null || cvAnalysis.parsedData?.educationScore != null) && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                            {cvAnalysis.parsedData?.skillsScore != null && (
                              <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                <div className="flex justify-between items-center text-xs font-semibold text-indigo-900 mb-1.5">
                                  <span>Kỹ năng chuyên môn</span>
                                  <span className="font-bold">{cvAnalysis.parsedData.skillsScore}/100</span>
                                </div>
                                <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${cvAnalysis.parsedData.skillsScore}%` }} />
                                </div>
                              </div>
                            )}
                            {cvAnalysis.parsedData?.experienceScore != null && (
                              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                                <div className="flex justify-between items-center text-xs font-semibold text-amber-900 mb-1.5">
                                  <span>Kinh nghiệm làm việc</span>
                                  <span className="font-bold">{cvAnalysis.parsedData.experienceScore}/100</span>
                                </div>
                                <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-amber-600 h-1.5 rounded-full" style={{ width: `${cvAnalysis.parsedData.experienceScore}%` }} />
                                </div>
                              </div>
                            )}
                            {cvAnalysis.parsedData?.educationScore != null && (
                              <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100">
                                <div className="flex justify-between items-center text-xs font-semibold text-teal-900 mb-1.5">
                                  <span>Học vấn & Bằng cấp</span>
                                  <span className="font-bold">{cvAnalysis.parsedData.educationScore}/100</span>
                                </div>
                                <div className="w-full bg-teal-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${cvAnalysis.parsedData.educationScore}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Top Priorities / Điểm nổi bật */}
                        {Array.isArray(cvAnalysis.parsedData?.topPriorities) && cvAnalysis.parsedData.topPriorities.length > 0 && (
                          <div className="mt-4 p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs">
                            <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                              <span className="material-symbols-outlined text-[18px] text-amber-600">priority_high</span>
                              <span>Các điểm nổi bật cần ưu tiên chú ý</span>
                            </div>
                            <ul className="space-y-1.5 pl-6 list-disc text-amber-950">
                              {cvAnalysis.parsedData.topPriorities.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Chi tiết từng phần (sections) từ parsedData */}
                      {Array.isArray(cvAnalysis.parsedData?.sections) && cvAnalysis.parsedData.sections.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="material-symbols-outlined text-[#005c55] text-lg">list_alt</span>
                            <span>Đánh giá chi tiết từng mục trong CV</span>
                          </h4>
                          <div className="space-y-3">
                            {cvAnalysis.parsedData.sections.map((sec, idx) => (
                              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900">{sec.title}</span>
                                    {sec.level && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                                        {sec.level}
                                      </span>
                                    )}
                                  </div>
                                  {sec.score != null && (
                                    <span className="text-xs font-extrabold text-[#005c55] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                                      {sec.score}/100
                                    </span>
                                  )}
                                </div>
                                {sec.feedback && (
                                  <p className="text-xs text-slate-600 leading-relaxed">{sec.feedback}</p>
                                )}
                                {Array.isArray(sec.strengths) && sec.strengths.length > 0 && (
                                  <div className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 space-y-1">
                                    <span className="font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                                      <span>Điểm mạnh:</span>
                                    </span>
                                    <ul className="list-disc pl-5 space-y-0.5">
                                      {sec.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {Array.isArray(sec.gaps) && sec.gaps.length > 0 && (
                                  <div className="text-[11px] text-amber-800 bg-amber-50/70 p-2.5 rounded-lg border border-amber-100 space-y-1">
                                    <span className="font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px] text-amber-600">warning</span>
                                      <span>Điểm cần hoàn thiện:</span>
                                    </span>
                                    <ul className="list-disc pl-5 space-y-0.5">
                                      {sec.gaps.map((g, i) => <li key={i}>{g}</li>)}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Gợi ý hoàn thiện CV */}
                      {cvAnalysis.suggestions && (
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
                          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="material-symbols-outlined text-teal-600 text-lg">tips_and_updates</span>
                            <span>Gợi ý cải thiện từ chuyên gia AI</span>
                          </h4>
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                            {cvAnalysis.suggestions}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-20 px-6 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-700">Chưa có kết quả phân tích AI cho CV này</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Bản CV này chưa được hệ thống phân tích. Kết quả sẽ tự động hiển thị khi ứng viên chấm điểm hoặc hệ thống quét CV.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================================ */}
        {/* MODAL FOOTER / RECRUITER ACTION TOOLBAR                      */}
        {/* ============================================================ */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20 shadow-lg modal-footer-bar print:hidden">
          <div className="w-full sm:w-80">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                edit_note
              </span>
              <input
                type="text"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Ghi chú đánh giá ứng viên..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#005c55] text-slate-800 bg-slate-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={() => handleAction('rejected', 'Từ chối')}
              className="h-8 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 hover:border-rose-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Từ chối
            </button>
            <button
              type="button"
              onClick={handleOpenChatWithCandidate}
              className="h-8 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-[#005c55]">chat</span>
              <span>Nhắn tin</span>
            </button>
            <button
              type="button"
              onClick={handleOpenScheduleModal}
              className="h-8 px-3 rounded-xl bg-[#005c55] hover:bg-[#0f766e] text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span>Đặt lịch phỏng vấn</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleAction('shortlisted', 'Duyệt hồ sơ (Pass Vòng 1)');
                onClose();
              }}
              className="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-teal-300">check_circle</span>
              <span>Duyệt hồ sơ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mini Modal Đặt lịch phỏng vấn */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#005c55] text-lg">calendar_month</span>
                  <span>Đặt lịch phỏng vấn</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ứng viên: <strong className="text-slate-800">{candidateProfile?.fullname || candidate.candidateName || candidate.full_name || 'Ứng viên'}</strong>
                </p>
              </div>
              <button
                type="button"
                disabled={scheduleSubmitting}
                onClick={handleCloseScheduleModal}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule} className="p-4 sm:p-5 space-y-4">
              {scheduleError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <span className="material-symbols-outlined text-[17px] shrink-0 text-rose-500">error</span>
                  <span className="font-semibold leading-relaxed">{scheduleError}</span>
                </div>
              )}

              {/* Ô 1: Ngày giờ phỏng vấn (Bắt buộc, tương lai) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Ngày giờ phỏng vấn <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  min={getMinDateTimeLocal()}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#005c55] focus:ring-1 focus:ring-[#005c55] text-slate-900 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  Thời gian phỏng vấn bắt buộc phải ở tương lai.
                </p>
              </div>

              {/* Ô 2: Ghi chú nơi gặp (Bắt buộc) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Ghi chú nơi gặp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tầng 5, tòa A, 12 Duy Tân"
                  value={interviewNote}
                  onChange={(e) => setInterviewNote(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#005c55] focus:ring-1 focus:ring-[#005c55] text-slate-900 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={scheduleSubmitting}
                  onClick={handleCloseScheduleModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={scheduleSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#005c55] hover:bg-[#0f766e] transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {scheduleSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Xác nhận đặt lịch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
