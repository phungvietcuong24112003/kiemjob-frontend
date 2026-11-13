import React, { useState } from 'react';
import { getAiScoreBadge } from '../../../domain/constants/applicationStatus';

export default function AiScoreDetailModal({
  isOpen,
  onClose,
  application,
  scoreData,
  onRescore,
}) {
  const [rescoring, setRescoring] = useState(false);

  if (!isOpen || (!application && !scoreData)) return null;

  const merged = scoreData || application || {};
  const applicationId = application?.id || merged?.applicationId;
  const candidateName = application?.candidateName || merged?.candidateName;
  const jobTitle = application?.jobTitle || merged?.jobTitle;

  const aiScoreStatus = merged.status || merged.aiScoreStatus;
  const aiOverallScore =
    merged.overallScore !== undefined ? merged.overallScore : merged.aiOverallScore;
  const aiSkillScore =
    merged.skillScore !== undefined ? merged.skillScore : merged.aiSkillScore;
  const aiExperienceScore =
    merged.experienceScore !== undefined ? merged.experienceScore : merged.aiExperienceScore;
  const aiEducationScore =
    merged.educationScore !== undefined ? merged.educationScore : merged.aiEducationScore;
  const aiStrengths = merged.strengths || merged.aiStrengths;
  const aiGaps = merged.gaps || merged.aiGaps;
  const aiMatchedSkills = merged.matchedSkills || merged.aiMatchedSkills;
  const aiMissingSkills = merged.missingSkills || merged.aiMissingSkills;
  const aiSummary = merged.summary || merged.aiSummary;
  const aiModel = merged.model || merged.aiModel;
  const aiPromptVersion = merged.promptVersion || merged.aiPromptVersion;
  const aiScoredAt = merged.scoredAt || merged.aiScoredAt;
  const isCached = merged.cached || false;

  const parseJsonArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const strengthsList = parseJsonArray(aiStrengths);
  const gapsList = parseJsonArray(aiGaps);
  const matchedSkillsList = parseJsonArray(aiMatchedSkills);
  const missingSkillsList = parseJsonArray(aiMissingSkills);

  const missingRequired = missingSkillsList.filter(
    (s) => (s?.type || 'required').toLowerCase() === 'required'
  );
  const missingPreferred = missingSkillsList.filter(
    (s) =>
      (s?.type || '').toLowerCase() === 'preferred' ||
      (s?.type || '').toLowerCase() === 'nice-to-have'
  );

  const scoreBadge = getAiScoreBadge(aiOverallScore, aiScoreStatus);

  const handleRescoreClick = async () => {
    if (!onRescore || rescoring) return;
    setRescoring(true);
    try {
      await onRescore(applicationId);
    } finally {
      setRescoring(false);
    }
  };

  const formatScoredAt = (dateString) => {
    if (!dateString) return 'Chưa ghi nhận';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50/50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">
                Chi tiết đánh giá độ phù hợp AI
              </h3>
              <p className="text-xs text-slate-500">
                {candidateName || 'Ứng viên'} • {jobTitle || 'Tin tuyển dụng'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Card Điểm Tổng Thể */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border ${
                  aiOverallScore >= 75
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : aiOverallScore >= 50
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                <span className="text-2xl font-black leading-none">
                  {aiOverallScore != null ? aiOverallScore : '--'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80">
                  Điểm tổng
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreBadge.badgeClass}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {scoreBadge.icon}
                    </span>
                    {scoreBadge.label} {scoreBadge.tag ? `• ${scoreBadge.tag}` : ''}
                  </span>
                  {isCached && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-600">
                      Bộ nhớ đệm
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Trọng số tính điểm: Kỹ năng (50%) + Kinh nghiệm (35%) + Học vấn (15%)
                </p>
              </div>
            </div>

            {onRescore && (
              <button
                type="button"
                onClick={handleRescoreClick}
                disabled={rescoring}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <span
                  className={`material-symbols-outlined text-[16px] text-teal-600 ${
                    rescoring ? 'animate-spin' : ''
                  }`}
                >
                  refresh
                </span>
                <span>{rescoring ? 'Đang chấm lại...' : 'Chấm lại bằng AI'}</span>
              </button>
            )}
          </div>

          {/* 3 Thanh Điểm Thành Phần */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Điểm thành phần chi tiết
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Kỹ năng */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-indigo-500">code</span>
                    Kỹ năng
                  </span>
                  <span className="font-bold text-slate-800">
                    {aiSkillScore != null ? `${aiSkillScore}/100` : '--'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, aiSkillScore || 0))}%` }}
                  ></div>
                </div>
              </div>

              {/* Kinh nghiệm */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-amber-500">work</span>
                    Kinh nghiệm
                  </span>
                  <span className="font-bold text-slate-800">
                    {aiExperienceScore != null ? `${aiExperienceScore}/100` : '--'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, aiExperienceScore || 0))}%` }}
                  ></div>
                </div>
              </div>

              {/* Học vấn */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-teal-500">school</span>
                    Học vấn
                  </span>
                  <span className="font-bold text-slate-800">
                    {aiEducationScore != null ? `${aiEducationScore}/100` : 'Không yêu cầu'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, aiEducationScore || 0))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Kỹ năng Khớp vs Còn Thiếu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kỹ năng khớp */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Kỹ năng đáp ứng ({matchedSkillsList.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkillsList.length > 0 ? (
                  matchedSkillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100/80 text-emerald-800"
                    >
                      {typeof skill === 'string' ? skill : skill?.skill || JSON.stringify(skill)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Chưa xác định kỹ năng khớp</span>
                )}
              </div>
            </div>

            {/* Kỹ năng còn thiếu */}
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>Kỹ năng còn thiếu ({missingSkillsList.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missingRequired.length > 0 &&
                  missingRequired.map((item, idx) => (
                    <span
                      key={`req-${idx}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200"
                      title="Kỹ năng bắt buộc bị thiếu"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      {typeof item === 'string' ? item : item?.skill} (Bắt buộc)
                    </span>
                  ))}
                {missingPreferred.length > 0 &&
                  missingPreferred.map((item, idx) => (
                    <span
                      key={`pref-${idx}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-800"
                      title="Kỹ năng ưu tiên"
                    >
                      {typeof item === 'string' ? item : item?.skill} (Ưu tiên)
                    </span>
                  ))}
                {missingSkillsList.length === 0 && (
                  <span className="text-xs text-slate-400 italic">Đáp ứng đủ các kỹ năng chính</span>
                )}
              </div>
            </div>
          </div>

          {/* Điểm mạnh có bằng chứng trích dẫn */}
          {strengthsList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-teal-600">thumb_up</span>
                <span>Điểm mạnh nổi bật & Bằng chứng từ CV</span>
              </h4>
              <div className="space-y-2.5">
                {strengthsList.map((st, idx) => {
                  const point = typeof st === 'string' ? st : st?.point;
                  const quote = st?.evidenceQuote;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                    >
                      <div className="font-semibold text-slate-800 text-xs flex items-start gap-1.5">
                        <span className="text-teal-600 font-bold">•</span>
                        <span>{point}</span>
                      </div>
                      {quote && (
                        <blockquote className="text-xs text-slate-500 italic pl-4 border-l-2 border-teal-500 bg-white py-1 pr-2 rounded-r">
                          "{quote}"
                        </blockquote>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Điểm thiếu sót / Hạn chế */}
          {gapsList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-rose-500">info</span>
                <span>Điểm cần cân nhắc / Hạn chế</span>
              </h4>
              <ul className="space-y-1.5">
                {gapsList.map((gap, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-lg bg-rose-50/40 text-xs text-slate-700 flex items-start gap-2 border border-rose-100"
                  >
                    <span className="material-symbols-outlined text-[15px] text-rose-500 shrink-0 mt-0.5">
                      arrow_right
                    </span>
                    <span>{typeof gap === 'string' ? gap : JSON.stringify(gap)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nhận xét tóm tắt */}
          {aiSummary && (
            <div className="p-3.5 rounded-2xl bg-teal-50/40 border border-teal-100 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-teal-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">comment</span>
                Nhận định tổng quan:
              </span>
              <p className="leading-relaxed">{aiSummary}</p>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div>
              Mô hình: <span className="font-mono text-slate-600">{aiModel || 'Groq AI'}</span> • Phiên bản prompt:{' '}
              <span className="font-mono text-slate-600">{aiPromptVersion || 'v1.0'}</span>
            </div>
            <div>
              Thời điểm chấm: <span className="text-slate-600">{formatScoredAt(aiScoredAt)}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 italic flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-amber-500">info</span>
            Điểm do AI gợi ý, nhà tuyển dụng quyết định
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
