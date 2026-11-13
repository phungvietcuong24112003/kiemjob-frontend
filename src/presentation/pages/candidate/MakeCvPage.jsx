import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  getCvs, getCvById, createCv, updateCv, deleteCv,
  getCvEducations, createCvEducation, updateCvEducation, deleteCvEducation,
  getCvWorkExperiences, createCvWorkExperience, updateCvWorkExperience, deleteCvWorkExperience,
  getCvSkillGroups, createCvSkillGroup, updateCvSkillGroup, deleteCvSkillGroup,
  getCvMores, createCvMore, updateCvMore, deleteCvMore,
  getCvCertificates, createCvCertificate, updateCvCertificate, deleteCvCertificate,
  getCvAwards, createCvAward, updateCvAward, deleteCvAward,
  getCvHobbies, createCvHobby, updateCvHobby, deleteCvHobby,
  getCvProjects, createCvProject, updateCvProject, deleteCvProject,
  getCvSectionOrders, saveCvSectionOrders,
  getCvCareerObjective, saveCvCareerObjective, deleteCvCareerObjective,
  getCandidateProfile, updateCandidateProfile,
  uploadFile
} from '../../../infrastructure/api';
import { hasAuthCookie } from '../../../infrastructure/utils/cookieUtils';

// Helper chuẩn hóa ngày tháng sang định dạng 'yyyy-MM-dd' cho Spring Boot LocalDate
const normalizeLocalDate = (val, fallback = null) => {
  if (!val) return fallback;

  const str = String(val).trim();
  if (!str) return fallback;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}$/.test(str)) return `${str}-01`;

  const mYMatch = str.match(/^(\d{1,2})[/-](\d{4})$/);
  if (mYMatch) {
    return `${mYMatch[2]}-${mYMatch[1].padStart(2, '0')}-01`;
  }

  const dmYMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmYMatch) {
    return `${dmYMatch[3]}-${dmYMatch[2].padStart(2, '0')}-${dmYMatch[1].padStart(2, '0')}`;
  }

  return fallback;
};

// ID tạm cho bản ghi chưa lưu (thay cho Date.now()).
let tempIdCounter = 0;
const newTempId = () => `tmp_${Date.now()}_${++tempIdCounter}`;
// Bản ghi đã tồn tại ở Backend = có ID và không phải ID tạm.
const isPersistedId = (id) =>
  id !== null && id !== undefined && id !== '' && !String(id).startsWith('tmp_');
const isBlank = (...vals) => vals.every((v) => !String(v ?? '').trim());
const isNotFoundError = (err) => err?.status === 404 || err?.response?.status === 404;
const createEmptyDeleted = () => ({
  education: [], work: [], project: [], skillGroup: [], certificate: [], award: [], more: [],
});
// Chỉ các trường mà API updateCandidateProfile hiện đang gửi.
const PROFILE_API_FIELDS = ['fullname', 'headline', 'phone', 'addressDetail', 'avatarUrl'];
const pickProfileFields = (p = {}) =>
  PROFILE_API_FIELDS.reduce((acc, f) => ({ ...acc, [f]: String(p[f] ?? '').trim() }), {});

const SECTION_TARGET_MAP = {
  career_objective: 'section-objective',
  education: 'section-education',
  skills: 'section-skill-groups',
  skill_groups: 'section-skill-groups',
  work_experiences: 'section-work',
  projects: 'section-projects',
  certificates: 'section-certificates',
  awards: 'section-awards',
  hobbies: 'section-hobbies',
  mores: 'section-mores'
};

const ALL_AVAILABLE_SECTIONS = [
  { key: 'career_objective', title: 'Mục tiêu nghề nghiệp', desc: 'Định hướng và mục tiêu phát triển chuyên môn nghề nghiệp' },
  { key: 'education', title: 'Học vấn', desc: 'Bằng cấp, trường đại học và quá trình đào tạo chuyên môn' },
  { key: 'skill_groups', title: 'Nhóm kỹ năng', desc: 'Phân loại kỹ năng theo từng nhóm chuyên ngành và công nghệ' },
  { key: 'work_experiences', title: 'Kinh nghiệm làm việc', desc: 'Lịch sử công tác, trách nhiệm và thành tích đạt được' },
  { key: 'projects', title: 'Dự án tiêu biểu', desc: 'Các dự án thực tế đã tham gia xây dựng và vai trò' },
  { key: 'certificates', title: 'Chứng chỉ', desc: 'Chứng chỉ nghề nghiệp và bằng cấp quốc tế' },
  { key: 'awards', title: 'Giải thưởng', desc: 'Khen thưởng, giải thưởng và vinh danh' },
  { key: 'hobbies', title: 'Sở thích', desc: 'Sở thích cá nhân và hoạt động thể thao ngoại khóa' },
  { key: 'mores', title: 'Thông tin bổ sung', desc: 'Hoạt động cộng đồng, ngoại ngữ, chứng chỉ khác' }
];

const DEFAULT_INITIAL_STATE = {
  cvTitle: '',
  profile: {
    fullname: '',
    headline: '',
    email: '',
    phone: '',
    addressDetail: '',
    portfolioUrl: '',
    avatarUrl: '',
    bio: '',
  },
  careerObjective: '',
  educations: [],
  skillGroups: [],
  experiences: [],
  projects: [],
  certificates: [],
  awards: [],
  hobbies: [],
  mores: [],
  sectionKeysOrder: [
    'career_objective',
    'education',
    'skill_groups',
    'work_experiences',
    'projects',
    'certificates',
    'awards',
    'hobbies',
    'mores'
  ],
};

// Helper mở bao bọc mảng từ API phản hồi
const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

export default function MakeCvPage({ embeddedCvId, onBack }) {
  const navigate = useNavigate();
  const { cvId: routeCvId } = useParams();
  const activeParamCvId = embeddedCvId !== undefined ? embeddedCvId : routeCvId;
  const location = useLocation();

  // === Auth & Candidate Profile ===
  const [candidateId, setCandidateId] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_INITIAL_STATE.profile);

  // === CV list & Active CV ===
  const [cvList, setCvList] = useState([]);
  const [activeCvId, setActiveCvId] = useState(null);
  const [cvTitle, setCvTitle] = useState(DEFAULT_INITIAL_STATE.cvTitle);

  // === Sub-entities ===
  const [careerObjective, setCareerObjective] = useState(DEFAULT_INITIAL_STATE.careerObjective);
  const [educations, setEducations] = useState(DEFAULT_INITIAL_STATE.educations);
  const [skillGroups, setSkillGroups] = useState(DEFAULT_INITIAL_STATE.skillGroups);
  const [experiences, setExperiences] = useState(DEFAULT_INITIAL_STATE.experiences);
  const [projects, setProjects] = useState(DEFAULT_INITIAL_STATE.projects);
  const [certificates, setCertificates] = useState(DEFAULT_INITIAL_STATE.certificates);
  const [awards, setAwards] = useState(DEFAULT_INITIAL_STATE.awards);
  const [hobbies, setHobbies] = useState(DEFAULT_INITIAL_STATE.hobbies);
  const [mores, setMores] = useState(DEFAULT_INITIAL_STATE.mores);

  // === Section Orders ===
  const [sectionKeysOrder, setSectionKeysOrder] = useState(DEFAULT_INITIAL_STATE.sectionKeysOrder);

  // === UI States ===
  const [saveStatus, setSaveStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const [pageState, setPageState] = useState('loading'); // loading | ready | no-cv | not-found
  const [isDirty, setIsDirty] = useState(false);

  // Modals
  const [showCvModal, setShowCvModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newCvTitleInput, setNewCvTitleInput] = useState('');

  // Refs theo dõi thay đổi (không gây render lại)
  const cvStateRef = useRef({});
  const deletedRef = useRef(createEmptyDeleted()); // ID bản ghi đã lưu nhưng bị xóa ở UI
  const dirtyVersionRef = useRef(0);
  const loadSeqRef = useRef(0);
  const pendingAvatarRef = useRef(null); // File ảnh chờ upload khi bấm Lưu CV
  const originalRef = useRef({ title: '', objective: '', orders: '', profile: pickProfileFields() });

  // Cập nhật ref state mới nhất để hàm lưu không bị stale closure
  cvStateRef.current = {
    candidateId,
    activeCvId,
    cvTitle,
    careerObjective,
    profile,
    educations,
    skillGroups,
    experiences,
    projects,
    certificates,
    awards,
    hobbies,
    mores,
    sectionKeysOrder
  };

  const showToast = (msg, isError = false) => {
    setToastMsg({ text: msg, isError });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Chỉ đánh dấu thay đổi ở Frontend, KHÔNG gọi API.
  const markDirty = () => {
    dirtyVersionRef.current += 1;
    setIsDirty(true);
    setSaveStatus('Chưa lưu thay đổi');
  };

  // Ghi nhận ID bản ghi đã tồn tại ở Backend để xóa khi bấm Lưu CV
  const trackDeleted = (type, id) => {
    if (isPersistedId(id) && !deletedRef.current[type].includes(id)) {
      deletedRef.current[type].push(id);
    }
  };

  const removeItem = (type, setter, id) => {
    setter((prev) => prev.filter((i) => i.id !== id));
    trackDeleted(type, id);
    markDirty();
  };

  const confirmDiscardChanges = () =>
    !isDirty ||
    window.confirm('Bạn có thay đổi chưa lưu. Tiếp tục sẽ làm mất các thay đổi này. Bạn có chắc không?');

  // Cảnh báo khi đóng/tải lại tab lúc còn thay đổi chưa lưu
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ==================== LƯU TOÀN BỘ DỮ LIỆU CV (CHỈ GỌI KHI BẤM "LƯU CV") ====================
  const saveAllCvData = async () => {
    const s = cvStateRef.current;
    const cid = s.candidateId;
    const cvId = s.activeCvId;

    if (!cid || !cvId) {
      setSaveStatus('Lưu thất bại');
      showToast('Không xác định được bản CV cần lưu. Hãy quay lại danh sách CV và chọn lại.', true);
      return false;
    }

    const versionAtStart = dirtyVersionRef.current;
    const tasks = []; // { label, run }
    const errors = [];

    // Đồng bộ một danh sách: xóa -> cập nhật (đã có ID thật) -> tạo mới (ID tạm)
    const queueList = ({ label, deletedKey, items, setItems, isEmpty, missing, toPayload, api }) => {
      deletedRef.current[deletedKey].forEach((id) => {
        tasks.push({
          label: `Xóa ${label}`,
          run: async () => {
            try { await api.remove(cid, cvId, id); } catch (e) { if (!isNotFoundError(e)) throw e; }
            deletedRef.current[deletedKey] = deletedRef.current[deletedKey].filter((x) => x !== id);
          },
        });
      });

      (items || []).forEach((item, i) => {
        const persisted = isPersistedId(item.id);
        if (!persisted && isEmpty(item)) return; // bản ghi mới còn trống -> bỏ qua, không gửi dữ liệu mẫu
        const msg = missing(item);
        if (msg) { errors.push(`${label} #${i + 1}: ${msg}`); return; }
        const payload = toPayload(item, i);
        if (persisted) {
          tasks.push({ label: `Cập nhật ${label}`, run: () => api.update(cid, cvId, item.id, payload) });
        } else {
          tasks.push({
            label: `Thêm ${label}`,
            run: async () => {
              const res = await api.create(cid, cvId, payload);
              if (res && res.id != null) {
                // chỉ đổi ID, giữ nguyên nội dung người dùng có thể vừa gõ -> thử lại không bị tạo trùng
                setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, id: res.id } : x)));
              }
            },
          });
        }
      });
    };

    // ---- 1. Danh sách các section ----
    queueList({
      label: 'học vấn', deletedKey: 'education', items: s.educations, setItems: setEducations,
      isEmpty: (e) => isBlank(e.schoolName, e.startDate, e.endDate, e.rank, e.achivements),
      missing: (e) => ((e.schoolName || '').trim() ? null : 'thiếu tên trường'),
      toPayload: (e) => ({
        schoolName: e.schoolName.trim(),
        startDate: normalizeLocalDate(e.startDate),
        endDate: normalizeLocalDate(e.endDate),
        rank: e.rank || '',
        achivements: e.achivements || '',
      }),
      api: { create: createCvEducation, update: updateCvEducation, remove: deleteCvEducation },
    });

    queueList({
      label: 'kinh nghiệm', deletedKey: 'work', items: s.experiences, setItems: setExperiences,
      isEmpty: (e) => isBlank(e.companyName, e.position, e.startDate, e.endDate, e.description),
      missing: (e) =>
        (e.companyName || '').trim() && (e.position || '').trim() ? null : 'thiếu tên công ty hoặc vị trí',
      toPayload: (e) => ({
        companyName: e.companyName.trim(),
        position: e.position.trim(),
        employmentType: e.employmentType || 'Toàn thời gian',
        startDate: normalizeLocalDate(e.startDate),
        endDate: e.isCurrent ? null : normalizeLocalDate(e.endDate),
        isCurrent: !!e.isCurrent,
        description: e.description || '',
      }),
      api: { create: createCvWorkExperience, update: updateCvWorkExperience, remove: deleteCvWorkExperience },
    });

    queueList({
      label: 'dự án', deletedKey: 'project', items: s.projects, setItems: setProjects,
      isEmpty: (p) => isBlank(p.projectName, p.role, p.technologies, p.startDate, p.endDate, p.description),
      missing: (p) => ((p.projectName || '').trim() ? null : 'thiếu tên dự án'),
      toPayload: (p) => ({
        projectName: p.projectName.trim(),
        role: p.role || '',
        startDate: normalizeLocalDate(p.startDate),
        endDate: p.isCurrent ? null : normalizeLocalDate(p.endDate),
        isCurrent: !!p.isCurrent,
        description: p.description || '',
        technologies: p.technologies || '',
      }),
      api: { create: createCvProject, update: updateCvProject, remove: deleteCvProject },
    });

    queueList({
      label: 'nhóm kỹ năng', deletedKey: 'skillGroup', items: s.skillGroups, setItems: setSkillGroups,
      isEmpty: (g) => isBlank(g.title, g.content),
      missing: (g) => ((g.title || '').trim() ? null : 'thiếu tên nhóm'),
      toPayload: (g, idx) => ({
        title: g.title.trim(),
        content: (g.content || '').trim(),
        displayOrder: idx, // thứ tự hiện tại trên màn hình
      }),
      api: { create: createCvSkillGroup, update: updateCvSkillGroup, remove: deleteCvSkillGroup },
    });

    queueList({
      label: 'chứng chỉ', deletedKey: 'certificate', items: s.certificates, setItems: setCertificates,
      isEmpty: (c) => isBlank(c.certificateName, c.description, c.certificateDate),
      missing: (c) => ((c.certificateName || '').trim() ? null : 'thiếu tên chứng chỉ'),
      toPayload: (c) => ({
        certificateName: c.certificateName.trim(),
        certificateDate: normalizeLocalDate(c.certificateDate),
        description: c.description || '',
      }),
      api: { create: createCvCertificate, update: updateCvCertificate, remove: deleteCvCertificate },
    });

    queueList({
      label: 'giải thưởng', deletedKey: 'award', items: s.awards, setItems: setAwards,
      isEmpty: (a) => isBlank(a.awardName, a.description, a.awardDate),
      missing: (a) => ((a.awardName || '').trim() ? null : 'thiếu tên giải thưởng'),
      toPayload: (a) => ({
        awardName: a.awardName.trim(),
        awardDate: normalizeLocalDate(a.awardDate),
        description: a.description || '',
      }),
      api: { create: createCvAward, update: updateCvAward, remove: deleteCvAward },
    });

    queueList({
      label: 'thông tin bổ sung', deletedKey: 'more', items: s.mores, setItems: setMores,
      isEmpty: (m) => isBlank(m.title, m.content),
      missing: (m) => ((m.title || '').trim() ? null : 'thiếu tiêu đề'),
      toPayload: (m) => ({ title: m.title.trim(), content: (m.content || '').trim() }),
      api: { create: createCvMore, update: updateCvMore, remove: deleteCvMore },
    });

    // ---- 2. Sở thích: UI chỉ sửa bản ghi đầu tiên, các bản ghi khác giữ nguyên ----
    const hobby = (s.hobbies || [])[0];
    if (hobby) {
      const name = (hobby.hobbyName || '').trim();
      if (isPersistedId(hobby.id)) {
        if (name) {
          tasks.push({ label: 'Cập nhật sở thích', run: () => updateCvHobby(cid, cvId, hobby.id, { hobbyName: name }) });
        } else {
          tasks.push({
            label: 'Xóa sở thích',
            run: async () => {
              try { await deleteCvHobby(cid, cvId, hobby.id); } catch (e) { if (!isNotFoundError(e)) throw e; }
              setHobbies((prev) => prev.filter((x) => x.id !== hobby.id));
            },
          });
        }
      } else if (name) {
        tasks.push({
          label: 'Thêm sở thích',
          run: async () => {
            const res = await createCvHobby(cid, cvId, { hobbyName: name });
            if (res && res.id != null) {
              setHobbies((prev) => prev.map((x) => (x.id === hobby.id ? { ...x, id: res.id } : x)));
            }
          },
        });
      }
    }

    // ---- 3. Tiêu đề CV ----
    const title = (s.cvTitle || '').trim();
    if (!title) errors.push('Tên bản CV không được để trống');
    else if (title !== originalRef.current.title) {
      tasks.push({
        label: 'Tên CV',
        run: async () => { await updateCv(cid, cvId, { title }); originalRef.current.title = title; },
      });
    }

    // ---- 4. Mục tiêu nghề nghiệp (chỉ gọi API khi có thay đổi) ----
    const objective = (s.careerObjective || '').trim();
    if (objective !== originalRef.current.objective) {
      tasks.push({
        label: 'Mục tiêu nghề nghiệp',
        run: async () => {
          if (objective) await saveCvCareerObjective(cvId, { content: objective });
          else {
            try { await deleteCvCareerObjective(cvId); } catch (e) { if (!isNotFoundError(e)) throw e; }
          }
          originalRef.current.objective = objective;
        },
      });
    }

    // ---- 5. Thứ tự các mục (chỉ ghi khi đổi; ẩn mục KHÔNG xóa dữ liệu của mục) ----
    const ordersJson = JSON.stringify(s.sectionKeysOrder);
    if (Array.isArray(s.sectionKeysOrder) && s.sectionKeysOrder.length > 0 && ordersJson !== originalRef.current.orders) {
      const payload = s.sectionKeysOrder.map((sec, idx) => ({
        sectionType: sec === 'skills' ? 'skill_groups' : sec,
        displayOrder: idx,
      }));
      tasks.push({
        label: 'Thứ tự các mục',
        run: async () => { await saveCvSectionOrders(cvId, payload); originalRef.current.orders = ordersJson; },
      });
    }

    // ---- 6. Hồ sơ ứng viên (dữ liệu dùng chung, chỉ ghi khi thật sự đổi) ----
    const draftProfile = pickProfileFields(s.profile);
    const avatarPending = !!pendingAvatarRef.current;
    const profileChanged =
      avatarPending || PROFILE_API_FIELDS.some((f) => draftProfile[f] !== originalRef.current.profile[f]);
    if (profileChanged && !draftProfile.fullname) errors.push('Họ và tên không được để trống');

    // Dừng trước khi ghi bất cứ thứ gì nếu dữ liệu chưa hợp lệ
    if (errors.length > 0) {
      setSaveStatus('Lưu thất bại');
      showToast(`Chưa thể lưu: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`, true);
      return false;
    }

    if (profileChanged) {
      let avatarUrl = draftProfile.avatarUrl;
      if (avatarPending) {
        try {
          const up = await uploadFile(pendingAvatarRef.current);
          if (!up?.url) throw new Error('Không nhận được URL ảnh');
          avatarUrl = up.url;
          pendingAvatarRef.current = null;
          setProfile((prev) => ({ ...prev, avatarUrl: up.url }));
        } catch (err) {
          console.error('Upload avatar failed:', err);
          setSaveStatus('Lưu thất bại');
          showToast('Tải ảnh đại diện thất bại. CV chưa được lưu.', true);
          return false;
        }
      }
      if (avatarUrl.startsWith('blob:')) avatarUrl = originalRef.current.profile.avatarUrl; // không bao giờ gửi blob URL
      const payload = {
        fullname: draftProfile.fullname,
        headline: draftProfile.headline,
        phone: draftProfile.phone,
        addressDetail: draftProfile.addressDetail,
        avatarUrl,
      };
      tasks.push({
        label: 'Thông tin cá nhân',
        run: async () => { await updateCandidateProfile(payload); originalRef.current.profile = pickProfileFields(payload); },
      });
    }

    // ---- Thực thi và KIỂM TRA TỪNG KẾT QUẢ ----
    const results = await Promise.allSettled(tasks.map((t) => t.run()));
    const failed = results
      .map((r, i) => (r.status === 'rejected' ? `${tasks[i].label}: ${r.reason?.message || 'lỗi không xác định'}` : null))
      .filter(Boolean);

    if (failed.length > 0) {
      console.error('Save failures:', failed);
      setSaveStatus('Lưu thất bại');
      showToast(`Lưu thất bại ${failed.length}/${tasks.length} thao tác. ${failed[0]}`, true);
      return false; // KHÔNG đánh dấu thành công
    }

    if (dirtyVersionRef.current === versionAtStart) {
      setIsDirty(false);
      const t = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSaveStatus(`Đã lưu lúc ${t}`);
    } else {
      setSaveStatus('Chưa lưu thay đổi'); // người dùng gõ thêm trong lúc đang lưu
    }
    showToast('Đã lưu CV thành công!');
    return true;
  };

  const triggerManualSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus('Đang lưu...');
    try {
      await saveAllCvData();
    } catch (err) {
      console.error(err);
      setSaveStatus('Lưu thất bại');
      showToast(`Lưu thất bại: ${err?.message || 'lỗi không xác định'}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  // Tải chi tiết CV (chỉ đọc)
  const loadCvData = async (cid, cvId) => {
    const seq = ++loadSeqRef.current;
    try {
      setLoading(true);
      const cv = await getCvById(cid, cvId).catch(() => null);
      if (seq !== loadSeqRef.current) return false;
      if (!cv) { setPageState('not-found'); return false; }

      let partialFail = false;
      const safe = (p) => p.catch(() => { partialFail = true; return []; });

      const [eduData, expData, skillGroupData, moreData, certData, awardData, hobbyData, projectData, orderData, careerObjRes] =
        await Promise.all([
          safe(getCvEducations(cid, cvId)),
          safe(getCvWorkExperiences(cid, cvId)),
          safe(getCvSkillGroups(cid, cvId)),
          safe(getCvMores(cid, cvId)),
          safe(getCvCertificates(cid, cvId)),
          safe(getCvAwards(cid, cvId)),
          safe(getCvHobbies(cid, cvId)),
          safe(getCvProjects(cid, cvId)),
          safe(getCvSectionOrders(cvId)),
          getCvCareerObjective(cid, cvId).catch(() => ({ content: '' })),
        ]);
      if (seq !== loadSeqRef.current) return false;

      const unwrapOrders = unwrapList(orderData);
      const rawSections = unwrapOrders.length > 0
        ? [...unwrapOrders].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).map((i) => i.sectionType)
        : DEFAULT_INITIAL_STATE.sectionKeysOrder;
      // Chuẩn hóa, chuyển 'skills' cũ thành 'skill_groups' mà không bị trùng lặp
      const sortedSections = [];
      rawSections.forEach((sec) => {
        const n = sec === 'skills' ? 'skill_groups' : sec;
        if (!sortedSections.includes(n)) sortedSections.push(n);
      });

      setActiveCvId(cvId);
      setCvTitle(cv.title || '');
      setEducations(unwrapList(eduData));
      setExperiences(unwrapList(expData));
      setSkillGroups(unwrapList(skillGroupData));
      setMores(unwrapList(moreData));
      setCertificates(unwrapList(certData));
      setAwards(unwrapList(awardData));
      setHobbies(unwrapList(hobbyData));
      setProjects(unwrapList(projectData));
      setSectionKeysOrder(sortedSections);
      setCareerObjective(careerObjRes?.content || '');

      // Reset toàn bộ theo dõi thay đổi cho CV vừa tải
      deletedRef.current = createEmptyDeleted();
      pendingAvatarRef.current = null;
      originalRef.current = {
        ...originalRef.current,
        title: (cv.title || '').trim(),
        objective: (careerObjRes?.content || '').trim(),
        orders: JSON.stringify(sortedSections),
      };
      setIsDirty(false);
      setSaveStatus('');
      setPageState('ready');
      if (partialFail) showToast('Một số phần dữ liệu CV không tải được. Hãy tải lại trang trước khi lưu.', true);
      return true;
    } catch (err) {
      console.error('Error loading CV details:', err);
      showToast('Không thể tải dữ liệu CV.', true);
      if (seq === loadSeqRef.current) setPageState('not-found');
      return false;
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  };

  // ==================== KHỞI TẠO DỮ LIỆU BAN ĐẦU (CHỈ ĐỌC, KHÔNG TẠO CV) ====================
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!hasAuthCookie()) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }
      try {
        setLoading(true);
        setPageState('loading');
        const profileData = await getCandidateProfile().catch(() => null);
        if (cancelled) return;
        if (!profileData || !profileData.id) {
          navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
          return;
        }
        setCandidateId(profileData.id);
        const loaded = pickProfileFields(profileData);
        // email là trường chỉ đọc (từ tài khoản), không nằm trong PROFILE_API_FIELDS nhưng cần hiển thị
        const emailFromProfile = profileData.email || profileData.user?.email || '';
        setProfile((prev) => ({ ...prev, ...loaded, email: emailFromProfile }));
        originalRef.current.profile = loaded;

        const cvs = await getCvs(profileData.id).catch(() => []);
        if (cancelled) return;
        setCvList(unwrapList(cvs));

        // Không có cvId trên URL hoặc props: KHÔNG tự tạo, chỉ hướng dẫn
        if (!activeParamCvId) {
          setActiveCvId(null);
          setPageState('no-cv');
          return;
        }
        const targetCvId = Number(activeParamCvId);
        if (!Number.isFinite(targetCvId)) {
          setPageState('not-found');
          return;
        }
        await loadCvData(profileData.id, targetCvId);
      } catch (err) {
        console.error('MakeCvPage init error:', err);
        if (!cancelled) setPageState('not-found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [activeParamCvId]);

  // Cuộn mượt đến mục được chỉ định
  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('bg-[#FFFBEB]');
      setTimeout(() => target.classList.remove('bg-[#FFFBEB]'), 1200);
    }
  };

  // Di chuyển thứ tự Mục Lục trên thanh bên trái (Lên / Xuống) - chỉ đổi state
  const moveSectionInOrder = (secKey, direction) => {
    const list = [...sectionKeysOrder];
    const idx = list.indexOf(secKey);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    setSectionKeysOrder(list);
    markDirty();
    showToast(direction === 'up' ? 'Đã di chuyển mục lên trên' : 'Đã di chuyển mục xuống dưới');
  };

  // ==================== QUẢN LÝ THÊM & ẨN CẢ MỤC (CHỈ ĐỔI STATE) ====================
  const handleAddSection = (secKey, sectionName) => {
    const isAlreadyAdded = sectionKeysOrder.includes(secKey) ||
      (secKey === 'skill_groups' && sectionKeysOrder.includes('skills'));
    if (isAlreadyAdded) { showToast(`Mục "${sectionName}" đã có trong CV.`); return; }
    if (!activeCvId) { showToast('Vui lòng chọn CV trước khi thêm mục.', true); return; }

    setSectionKeysOrder((prev) => [...prev, secKey]);
    setShowAddSectionModal(false);
    markDirty();
    showToast(`Đã thêm mục "${sectionName}". Bấm "Lưu CV" để lưu thay đổi.`);
  };

  const handleDeleteSection = (secKey, sectionName) => {
    if (!window.confirm(
      `Ẩn mục "${sectionName}" khỏi CV này? Dữ liệu của mục vẫn được giữ và bạn có thể thêm lại bất kỳ lúc nào. Thay đổi chỉ có hiệu lực sau khi bấm "Lưu CV".`
    )) return;
    setSectionKeysOrder((prev) =>
      prev.filter((k) => k !== secKey && !(secKey === 'skill_groups' && k === 'skills'))
    );
    markDirty();
    showToast(`Đã ẩn mục "${sectionName}" khỏi CV.`);
  };

  // ==================== CÁC HÀM CRUD CHI TIẾT TỪNG PHẦN (CHỈ ĐỔI STATE) ====================

  // 1. Học vấn
  const handleAddEducation = () => {
    setEducations((prev) => [...prev, { id: newTempId(), schoolName: '', startDate: '', endDate: '', achivements: '', rank: '' }]);
    markDirty();
    scrollToSection('section-education');
  };

  const handleUpdateEducationField = (id, field, value) => {
    setEducations((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    markDirty();
  };

  const handleDeleteEducation = (id) => {
    removeItem('education', setEducations, id);
    showToast('Đã xóa mục học vấn');
  };

  const moveEduItem = (idx, direction) => {
    const list = [...educations];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setEducations(list);
    markDirty();
  };

  // 2. Nhóm kỹ năng
  const handleAddSkillGroup = () => {
    setSkillGroups((prev) => [...prev, { id: newTempId(), title: '', content: '', displayOrder: prev.length }]);
    markDirty();
    scrollToSection('section-skill-groups');
  };

  const handleUpdateSkillGroupField = (id, field, value) => {
    setSkillGroups((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
    markDirty();
  };

  const handleDeleteSkillGroup = (id) => {
    removeItem('skillGroup', setSkillGroups, id);
    showToast('Đã xóa nhóm kỹ năng');
  };

  const moveSkillGroupItem = (idx, direction) => {
    const list = [...skillGroups];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setSkillGroups(list);
    markDirty();
  };

  // 3. Kinh nghiệm làm việc
  const handleAddWorkExperience = () => {
    setExperiences((prev) => [...prev, { id: newTempId(), companyName: '', position: '', startDate: '', endDate: null, isCurrent: false, description: '' }]);
    markDirty();
    scrollToSection('section-work');
  };

  const handleUpdateWorkExperienceField = (id, field, value) => {
    setExperiences((prev) => prev.map((exp) => {
      if (exp.id === id) {
        const updated = { ...exp, [field]: value };
        if (field === 'isCurrent' && value === true) updated.endDate = null;
        return updated;
      }
      return exp;
    }));
    markDirty();
  };

  const handleDeleteWorkExperience = (id) => {
    removeItem('work', setExperiences, id);
    showToast('Đã xóa mục kinh nghiệm');
  };

  const moveExpItem = (idx, direction) => {
    const list = [...experiences];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setExperiences(list);
    markDirty();
  };

  // 4. Dự án tiêu biểu
  const handleAddProject = () => {
    setProjects((prev) => [...prev, { id: newTempId(), projectName: '', role: '', technologies: '', startDate: '', endDate: '', description: '' }]);
    markDirty();
    scrollToSection('section-projects');
  };

  const handleUpdateProjectField = (id, field, value) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    markDirty();
  };

  const handleDeleteProject = (id) => {
    removeItem('project', setProjects, id);
    showToast('Đã xóa dự án');
  };

  const moveProjItem = (idx, direction) => {
    const list = [...projects];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setProjects(list);
    markDirty();
  };

  // 5. Chứng chỉ
  const handleAddCertificate = () => {
    setCertificates((prev) => [...prev, { id: newTempId(), certificateName: '', description: '', certificateDate: '' }]);
    markDirty();
    scrollToSection('section-certificates');
  };

  const handleUpdateCertField = (id, field, value) => {
    setCertificates((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    markDirty();
  };

  const handleDeleteCertificate = (id) => {
    removeItem('certificate', setCertificates, id);
    showToast('Đã xóa chứng chỉ');
  };

  // 6. Giải thưởng
  const handleAddAward = () => {
    setAwards((prev) => [...prev, { id: newTempId(), awardName: '', description: '', awardDate: '' }]);
    markDirty();
    scrollToSection('section-awards');
  };

  const handleUpdateAwardField = (id, field, value) => {
    setAwards((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
    markDirty();
  };

  const handleDeleteAward = (id) => {
    removeItem('award', setAwards, id);
    showToast('Đã xóa giải thưởng');
  };

  // 7. Sở thích (không làm mất các bản ghi khác)
  const handleUpdateHobby = (value) => {
    setHobbies((prev) =>
      prev.length > 0
        ? [{ ...prev[0], hobbyName: value }, ...prev.slice(1)]
        : [{ id: newTempId(), hobbyName: value }]
    );
    markDirty();
  };

  // 8. Thông tin bổ sung
  const handleAddMoreItem = () => {
    setMores((prev) => [...prev, { id: newTempId(), title: '', content: '' }]);
    markDirty();
    scrollToSection('section-mores');
  };

  const handleUpdateMoreItem = (id, field, value) => {
    setMores((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
    markDirty();
  };

  const handleDeleteMoreItem = (id) => {
    removeItem('more', setMores, id);
    showToast('Đã xóa mục bổ sung');
  };

  // Ảnh đại diện: chỉ xem trước, upload khi bấm "Lưu CV"
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingAvatarRef.current = file;
    setProfile((prev) => ({ ...prev, avatarUrl: URL.createObjectURL(file) }));
    markDirty();
    showToast('Đã chọn ảnh. Bấm "Lưu CV" để tải lên và lưu.');
  };

  // Tạo CV mới từ modal (thao tác do người dùng chủ động bấm)
  const handleCreateNewCv = async () => {
    if (cvList.length >= 3) {
      showToast('Mỗi tài khoản chỉ được lưu tối đa 3 CV. Vui lòng xóa bớt CV cũ trước khi tạo mới.', true);
      return;
    }
    const t = newCvTitleInput.trim();
    if (!t) { showToast('Vui lòng nhập tên CV mới', true); return; }
    if (!candidateId) { showToast('Chưa xác định được tài khoản ứng viên.', true); return; }
    if (!confirmDiscardChanges()) return;
    try {
      setIsSaving(true);
      const created = await createCv(candidateId, { title: t });
      if (created && created.id) {
        setCvList((prev) => [...prev, created]);
        setShowCvModal(false);
        setNewCvTitleInput('');
        navigate(`/cvs/${created.id}/edit`);
        showToast('Tạo CV mới thành công!');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi tạo CV.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Tạo CV mới nhanh từ màn hình "no-cv" (tự đặt tên mặc định, tải vào editor ngay)
  const handleQuickCreateCv = async (titleOverride) => {
    if (cvList.length >= 3) {
      showToast('Mỗi tài khoản chỉ được lưu tối đa 3 CV. Vui lòng xóa bớt CV cũ trước khi tạo mới.', true);
      return;
    }
    if (!candidateId) { showToast('Chưa xác định được tài khoản ứng viên.', true); return; }
    const defaultTitle = titleOverride?.trim() ||
      `CV ${profile.fullname || 'Mới'} - ${new Date().toLocaleDateString('vi-VN')}`;
    try {
      setIsSaving(true);
      setPageState('loading');
      const created = await createCv(candidateId, { title: defaultTitle });
      if (created && created.id) {
        setCvList((prev) => [...prev, created]);
        // Tải dữ liệu CV vừa tạo (sẽ trống, nhưng profile đã điền sẵn từ bước init)
        await loadCvData(candidateId, created.id);
        showToast('Đã tạo CV trực tuyến mới thành công!');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi tạo CV mới.', true);
      setPageState('no-cv');
    } finally {
      setIsSaving(false);
    }
  };

  // Chuyển đến chỉnh sửa CV web đã có (dùng trong embedded mode hoặc no-cv screen)
  const handleEditExistingCv = (cvId) => {
    if (onBack) {
      // Embedded mode: tải CV ngay tại chỗ
      loadCvData(candidateId, cvId);
    } else {
      navigate(`/cvs/${cvId}/edit`);
    }
  };

  // ==================== RENDER TỪNG SECTION DỰA THEO KEY ====================
  const renderSectionByKey = (key) => {
    switch (key) {
      case 'career_objective':
        return (
          <section key="career_objective" id="section-objective" className="mb-6 group relative">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-1 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Mục tiêu nghề nghiệp</h3>
              <button
                type="button"
                onClick={() => handleDeleteSection('career_objective', 'Mục tiêu nghề nghiệp')}
                className="text-[11px] text-[#BA1A1A] hover:underline cursor-pointer print:hidden"
              >
                Xóa mục
              </button>
            </div>
            <textarea
              rows={3}
              value={careerObjective}
              onChange={(e) => {
                setCareerObjective(e.target.value);
                markDirty();
              }}
              placeholder="Mô tả mục tiêu nghề nghiệp và định hướng chuyên môn..."
              className="w-full text-xs text-[#222222] text-justify leading-relaxed hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-1 rounded-sm bg-transparent border-0 resize-none outline-none"
            />
          </section>
        );

      case 'education':
        return (
          <section key="education" id="section-education" className="mb-6 group relative">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-1 mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Học vấn</h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleAddEducation}
                  className="text-[11px] text-[#111111] font-semibold hover:underline bg-[#F5F5F5] px-2 py-0.5 border border-[#E0E0E0] rounded-sm cursor-pointer"
                  type="button"
                >
                  + Thêm học vấn
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection('education', 'Học vấn')}
                  className="text-[11px] text-[#BA1A1A] hover:underline cursor-pointer"
                >
                  Xóa mục
                </button>
              </div>
            </div>
            {educations.length === 0 ? (
              <div className="text-xs text-[#666666] italic py-1">Chưa có thông tin học vấn. Bấm "+ Thêm học vấn" để thêm mới.</div>
            ) : (
              educations.map((edu, idx) => (
                <div key={edu.id || idx} className="border-l-2 border-[#111111] pl-3 py-1 space-y-1 hover:bg-[#F9FAFB] rounded-sm relative mb-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={edu.schoolName || ''}
                      onChange={(e) => handleUpdateEducationField(edu.id, 'schoolName', e.target.value)}
                      placeholder="Tên trường học"
                      className="font-bold text-xs text-[#111111] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 flex-1 mr-2 outline-none"
                    />
                    <div className="flex items-center gap-1 text-xs text-[#666666] shrink-0">
                      <input
                        type="text"
                        value={edu.startDate ? String(edu.startDate).substring(0, 4) : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          handleUpdateEducationField(edu.id, 'startDate', val ? `${val}-01-01` : null);
                        }}
                        placeholder="2015"
                        maxLength={4}
                        className="w-12 text-center hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 outline-none"
                      />
                      <span>-</span>
                      <input
                        type="text"
                        value={edu.endDate ? String(edu.endDate).substring(0, 4) : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          handleUpdateEducationField(edu.id, 'endDate', val ? `${val}-01-01` : null);
                        }}
                        placeholder="2019"
                        maxLength={4}
                        className="w-12 text-center hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#222222]">
                    <span className="text-[#666666]">Chuyên ngành:</span>
                    <input
                      type="text"
                      value={edu.achivements || ''}
                      onChange={(e) => handleUpdateEducationField(edu.id, 'achivements', e.target.value)}
                      placeholder="Kỹ thuật Phần mềm"
                      className="hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 flex-1 outline-none"
                    />
                    <span className="text-[#999999]">|</span>
                    <span className="text-[#666666]">Xếp loại:</span>
                    <input
                      type="text"
                      value={edu.rank || ''}
                      onChange={(e) => handleUpdateEducationField(edu.id, 'rank', e.target.value)}
                      placeholder="Giỏi (GPA: 3.52/4.0)"
                      className="hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 w-36 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-[#666666] print:hidden">
                    <button
                      onClick={() => moveEduItem(idx, 'up')}
                      disabled={idx === 0}
                      className="hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                      type="button"
                    >
                      Lên
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => moveEduItem(idx, 'down')}
                      disabled={idx === educations.length - 1}
                      className="hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                      type="button"
                    >
                      Xuống
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="text-[#BA1A1A] hover:underline cursor-pointer"
                      type="button"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        );

      case 'skills':
      case 'skill_groups':
        return (
          <section key="skill_groups" id="section-skill-groups" className="mb-6 group relative">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-1 mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Nhóm kỹ năng</h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleAddSkillGroup}
                  className="text-[11px] text-[#111111] font-semibold hover:underline bg-[#F5F5F5] px-2 py-0.5 border border-[#E0E0E0] rounded-sm cursor-pointer"
                  type="button"
                >
                  + Thêm nhóm
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection(key, 'Nhóm kỹ năng')}
                  className="text-[11px] text-[#BA1A1A] hover:underline cursor-pointer"
                >
                  Xóa mục
                </button>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-[#222222]">
              {skillGroups.length === 0 ? (
                <div className="py-2 text-[11px] text-[#888888] italic">
                  Chưa có nhóm kỹ năng nào. Bấm "+ Thêm nhóm" để bắt đầu bổ sung kỹ năng của bạn.
                </div>
              ) : (
                skillGroups.map((group, gIdx) => (
                  <div key={group.id || gIdx} className="flex items-start justify-between hover:bg-[#F9FAFB] p-1 rounded-sm">
                    <div className="flex-1 flex flex-wrap items-center">
                      <input
                        type="text"
                        value={group.title || ''}
                        onChange={(e) => handleUpdateSkillGroupField(group.id, 'title', e.target.value)}
                        placeholder="Tên nhóm kỹ năng:"
                        className="font-bold text-[#111111] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 mr-1 outline-none"
                        style={{ width: `${Math.max((group.title?.length || 10) * 8 + 10, 110)}px` }}
                      />
                      <input
                        type="text"
                        value={group.content || ''}
                        onChange={(e) => handleUpdateSkillGroupField(group.id, 'content', e.target.value)}
                        placeholder="Chi tiết các kỹ năng phân cách bằng dấu phẩy..."
                        className="hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 flex-1 min-w-[200px] outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#666666] shrink-0 ml-2 print:hidden">
                      <button
                        onClick={() => moveSkillGroupItem(gIdx, 'up')}
                        disabled={gIdx === 0}
                        className="hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                        type="button"
                      >
                        Lên
                      </button>
                      <button
                        onClick={() => moveSkillGroupItem(gIdx, 'down')}
                        disabled={gIdx === skillGroups.length - 1}
                        className="hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                        type="button"
                      >
                        Xuống
                      </button>
                      <button
                        onClick={() => handleDeleteSkillGroup(group.id)}
                        className="text-[#BA1A1A] hover:underline cursor-pointer ml-1"
                        type="button"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        );

      case 'work_experiences':
        return (
          <section key="work_experiences" id="section-work" className="mb-6 group relative">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-1 mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Kinh nghiệm làm việc</h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleAddWorkExperience}
                  className="text-[11px] text-[#111111] font-semibold hover:underline bg-[#F5F5F5] px-2 py-0.5 border border-[#E0E0E0] rounded-sm cursor-pointer"
                  type="button"
                >
                  + Thêm kinh nghiệm
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection('work_experiences', 'Kinh nghiệm làm việc')}
                  className="text-[11px] text-[#BA1A1A] hover:underline cursor-pointer"
                >
                  Xóa mục
                </button>
              </div>
            </div>
            {experiences.map((exp, idx) => (
              <div key={exp.id || idx} className="mb-4 border-l-2 border-[#111111] pl-3 py-1 space-y-1 hover:bg-[#F9FAFB] rounded-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={exp.companyName || ''}
                      onChange={(e) => handleUpdateWorkExperienceField(exp.id, 'companyName', e.target.value)}
                      placeholder="Tên công ty"
                      className="font-bold text-xs text-[#111111] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 outline-none"
                    />
                    <span className="text-[11px] text-[#666666]">—</span>
                    <input
                      type="text"
                      value={exp.position || ''}
                      onChange={(e) => handleUpdateWorkExperienceField(exp.id, 'position', e.target.value)}
                      placeholder="Vị trí công việc"
                      className="text-xs font-medium text-[#222222] italic hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 flex-1 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#666666] shrink-0">
                    <input
                      type="text"
                      value={exp.startDate ? (String(exp.startDate).includes('-') ? String(exp.startDate).substring(0, 7) : exp.startDate) : ''}
                      onChange={(e) => handleUpdateWorkExperienceField(exp.id, 'startDate', e.target.value)}
                      placeholder="03/2022"
                      className="w-16 text-center hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 outline-none"
                    />
                    <span>-</span>
                    {exp.isCurrent ? (
                      <span className="text-xs text-[#666666]">Hiện tại</span>
                    ) : (
                      <input
                        type="text"
                        value={exp.endDate ? (String(exp.endDate).includes('-') ? String(exp.endDate).substring(0, 7) : exp.endDate) : ''}
                        onChange={(e) => handleUpdateWorkExperienceField(exp.id, 'endDate', e.target.value)}
                        placeholder="02/2024"
                        className="w-16 text-center hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 outline-none"
                      />
                    )}
                    <label className="flex items-center gap-1 text-[11px] cursor-pointer ml-1 text-[#666666] print:hidden">
                      <input
                        type="checkbox"
                        checked={!!exp.isCurrent}
                        onChange={(e) => handleUpdateWorkExperienceField(exp.id, 'isCurrent', e.target.checked)}
                        className="rounded"
                      />
                      <span>Đang làm</span>
                    </label>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={exp.description || ''}
                  onChange={(e) => handleUpdateWorkExperienceField(exp.id, 'description', e.target.value)}
                  placeholder="• Chi tiết nhiệm vụ và kết quả đạt được..."
                  className="w-full text-xs text-[#222222] leading-relaxed hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 resize-none outline-none"
                />
                <div className="flex items-center gap-2 pt-1 text-[10px] text-[#666666] print:hidden">
                  <button
                    onClick={() => moveExpItem(idx, 'up')}
                    disabled={idx === 0}
                    className="hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                    type="button"
                  >
                    Lên
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => moveExpItem(idx, 'down')}
                    disabled={idx === experiences.length - 1}
                    className="hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                    type="button"
                  >
                    Xuống
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => handleDeleteWorkExperience(exp.id)}
                    className="text-[#BA1A1A] hover:underline cursor-pointer"
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </section>
        );

      case 'projects':
        return (
          <section key="projects" id="section-projects" className="mb-6 group relative">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-1 mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Dự án tiêu biểu</h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleAddProject}
                  className="text-[11px] text-[#111111] font-semibold hover:underline bg-[#F5F5F5] px-2 py-0.5 border border-[#E0E0E0] rounded-sm cursor-pointer"
                  type="button"
                >
                  + Thêm dự án
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection('projects', 'Dự án tiêu biểu')}
                  className="text-[11px] text-[#BA1A1A] hover:underline cursor-pointer"
                >
                  Xóa mục
                </button>
              </div>
            </div>
            {projects.map((proj, idx) => (
              <div key={proj.id || idx} className="border-l-2 border-[#111111] pl-3 py-1 space-y-1 hover:bg-[#F9FAFB] rounded-sm mb-4">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={proj.projectName || ''}
                    onChange={(e) => handleUpdateProjectField(proj.id, 'projectName', e.target.value)}
                    placeholder="Tên dự án tiêu biểu"
                    className="font-bold text-xs text-[#111111] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 flex-1 mr-2 outline-none"
                  />
                  <div className="flex items-center gap-1 text-xs text-[#666666] shrink-0">
                    <input
                      type="text"
                      value={proj.startDate ? String(proj.startDate).substring(0, 4) : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        handleUpdateProjectField(proj.id, 'startDate', val ? `${val}-01-01` : null);
                      }}
                      placeholder="2023"
                      maxLength={4}
                      className="w-12 text-center hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 outline-none"
                    />
                    <span>-</span>
                    <input
                      type="text"
                      value={proj.endDate ? String(proj.endDate).substring(0, 4) : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        handleUpdateProjectField(proj.id, 'endDate', val ? `${val}-01-01` : null);
                      }}
                      placeholder="2024"
                      maxLength={4}
                      className="w-12 text-center hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#222222]">
                  <span className="text-[#666666]">Vai trò:</span>
                  <input
                    type="text"
                    value={proj.role || ''}
                    onChange={(e) => handleUpdateProjectField(proj.id, 'role', e.target.value)}
                    placeholder="Backend Lead"
                    className="hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 w-32 outline-none"
                  />
                  <span className="text-[#999999]">|</span>
                  <span className="text-[#666666]">Công nghệ:</span>
                  <input
                    type="text"
                    value={proj.technologies || ''}
                    onChange={(e) => handleUpdateProjectField(proj.id, 'technologies', e.target.value)}
                    placeholder="Java 17, Spring Cloud, Kafka, PostgreSQL..."
                    className="hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 flex-1 outline-none"
                  />
                </div>
                <textarea
                  rows={2}
                  value={proj.description || ''}
                  onChange={(e) => handleUpdateProjectField(proj.id, 'description', e.target.value)}
                  placeholder="Mô tả dự án, đóng góp và kết quả đạt được..."
                  className="w-full text-xs text-[#222222] leading-relaxed hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 resize-none outline-none"
                />
                <div className="flex items-center gap-2 pt-1 text-[10px] text-[#666666] print:hidden">
                  <button
                    onClick={() => moveProjItem(idx, 'up')}
                    disabled={idx === 0}
                    className="hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                    type="button"
                  >
                    Lên
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => moveProjItem(idx, 'down')}
                    disabled={idx === projects.length - 1}
                    className="hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                    type="button"
                  >
                    Xuống
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => handleDeleteProject(proj.id)}
                    className="text-[#BA1A1A] hover:underline cursor-pointer"
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </section>
        );

      case 'certificates':
        return (
          <section key="certificates" id="section-certificates" className="mb-6 group relative">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-1 mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Chứng chỉ</h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleAddCertificate}
                  className="text-[11px] text-[#111111] font-semibold hover:underline bg-[#F5F5F5] px-2 py-0.5 border border-[#E0E0E0] rounded-sm cursor-pointer"
                  type="button"
                >
                  + Thêm chứng chỉ
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection('certificates', 'Chứng chỉ')}
                  className="text-[11px] text-[#BA1A1A] hover:underline cursor-pointer"
                >
                  Xóa mục
                </button>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-[#222222]">
              {certificates.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between hover:bg-[#F9FAFB] p-1 rounded-sm">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[#111111] font-bold">•</span>
                    <input
                      type="text"
                      value={cert.certificateName || ''}
                      onChange={(e) => handleUpdateCertField(cert.id, 'certificateName', e.target.value)}
                      placeholder="Tên chứng chỉ"
                      className="font-bold text-[#111111] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 flex-1 outline-none"
                    />
                    <span className="text-[#666666]">(</span>
                    <input
                      type="text"
                      value={cert.description || ''}
                      onChange={(e) => handleUpdateCertField(cert.id, 'description', e.target.value)}
                      placeholder="Tổ chức cấp, 2023"
                      className="text-[#666666] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 w-48 outline-none"
                    />
                    <span className="text-[#666666]">)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#666666] shrink-0 ml-2 print:hidden">
                    <button
                      onClick={() => handleDeleteCertificate(cert.id)}
                      className="text-[#BA1A1A] hover:underline cursor-pointer"
                      type="button"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'awards':
        return (
          <section key="awards" id="section-awards" className="mb-6 group relative">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-1 mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Giải thưởng</h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleAddAward}
                  className="text-[11px] text-[#111111] font-semibold hover:underline bg-[#F5F5F5] px-2 py-0.5 border border-[#E0E0E0] rounded-sm cursor-pointer"
                  type="button"
                >
                  + Thêm giải thưởng
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection('awards', 'Giải thưởng')}
                  className="text-[11px] text-[#BA1A1A] hover:underline cursor-pointer"
                >
                  Xóa mục
                </button>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-[#222222]">
              {awards.map((award) => (
                <div key={award.id} className="flex items-center justify-between hover:bg-[#F9FAFB] p-1 rounded-sm text-xs text-[#222222]">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[#111111] font-bold">•</span>
                    <input
                      type="text"
                      value={award.awardName || ''}
                      onChange={(e) => handleUpdateAwardField(award.id, 'awardName', e.target.value)}
                      placeholder="Tên giải thưởng"
                      className="font-bold text-[#111111] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 flex-1 outline-none"
                    />
                    <span className="text-[#666666]">—</span>
                    <input
                      type="text"
                      value={award.description || ''}
                      onChange={(e) => handleUpdateAwardField(award.id, 'description', e.target.value)}
                      placeholder="Đơn vị trao thưởng, 2023"
                      className="text-[#666666] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 w-52 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#666666] shrink-0 ml-2 print:hidden">
                    <button
                      onClick={() => handleDeleteAward(award.id)}
                      className="text-[#BA1A1A] hover:underline cursor-pointer"
                      type="button"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'hobbies':
        return (
          <section key="hobbies" id="section-hobbies" className="mb-6 group relative">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-1 mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Sở thích</h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => handleDeleteSection('hobbies', 'Sở thích')}
                  className="text-[11px] text-[#BA1A1A] hover:underline cursor-pointer"
                >
                  Xóa mục
                </button>
              </div>
            </div>
            <textarea
              rows={2}
              value={hobbies[0]?.hobbyName ?? ''}
              onChange={(e) => handleUpdateHobby(e.target.value)}
              placeholder="Chạy bộ bán Marathon (21km)  •  Đọc sách công nghệ & kiến trúc phần mềm  •  Đóng góp mã nguồn mở GitHub"
              className="w-full text-xs text-[#222222] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-1 rounded-sm leading-relaxed bg-transparent border-0 resize-none outline-none"
            />
          </section>
        );

      case 'mores':
        return (
          <section key="mores" id="section-mores" className="group relative mb-6">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-1 mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Thông tin bổ sung</h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleAddMoreItem}
                  className="text-[11px] text-[#111111] font-semibold hover:underline bg-[#F5F5F5] px-2 py-0.5 border border-[#E0E0E0] rounded-sm cursor-pointer"
                  type="button"
                >
                  + Thêm mục bổ sung
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection('mores', 'Thông tin bổ sung')}
                  className="text-[11px] text-[#BA1A1A] hover:underline cursor-pointer"
                >
                  Xóa mục
                </button>
              </div>
            </div>
            {mores.map((m, idx) => (
              <div key={m.id || idx} className="border-l-2 border-[#111111] pl-3 py-1 space-y-1 hover:bg-[#F9FAFB] rounded-sm mb-3">
                <input
                  type="text"
                  value={m.title || ''}
                  onChange={(e) => handleUpdateMoreItem(m.id, 'title', e.target.value)}
                  placeholder="Tiêu đề mục (vd: Hoạt động cộng đồng)"
                  className="font-bold text-xs text-[#111111] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 w-full outline-none"
                />
                <textarea
                  rows={2}
                  value={m.content || ''}
                  onChange={(e) => handleUpdateMoreItem(m.id, 'content', e.target.value)}
                  placeholder="Nội dung chi tiết..."
                  className="w-full text-xs text-[#222222] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 resize-none outline-none"
                />
                <div className="flex items-center gap-2 pt-1 text-[10px] text-[#666666] print:hidden">
                  <button
                    onClick={() => handleDeleteMoreItem(m.id)}
                    className="text-[#BA1A1A] hover:underline cursor-pointer"
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </section>
        );

      default:
        return null;
    }
  };

  // Label và số lượng hiển thị trong Mục lục bên trái
  const getSectionMetadata = (secKey) => {
    switch (secKey) {
      case 'career_objective':
        return { title: 'Mục tiêu nghề nghiệp', count: null };
      case 'education':
        return { title: 'Học vấn', count: educations.length };
      case 'skills':
        return { title: 'Nhóm kỹ năng', count: skillGroups.length };
      case 'skill_groups':
        return { title: 'Nhóm kỹ năng', count: skillGroups.length };
      case 'work_experiences':
        return { title: 'Kinh nghiệm làm việc', count: experiences.length };
      case 'projects':
        return { title: 'Dự án tiêu biểu', count: projects.length };
      case 'certificates':
        return { title: 'Chứng chỉ', count: certificates.length };
      case 'awards':
        return { title: 'Giải thưởng', count: awards.length };
      case 'hobbies':
        return { title: 'Sở thích', count: hobbies.length > 0 && hobbies[0]?.hobbyName ? hobbies[0].hobbyName.split('•').length : 1 };
      case 'mores':
        return { title: 'Thông tin bổ sung', count: mores.length };
      default:
        return { title: secKey, count: null };
    }
  };

  // ==================== XỬ LÝ TRẠNG THÁI KHÁCH ====================
  if (!hasAuthCookie()) {
    return (
      <div className="w-full min-h-[calc(100vh-64px)] bg-[#F5F5F5] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',system-ui,sans-serif]">
        <div className="bg-white border border-[#D9D9D9] p-8 max-w-md w-full rounded-sm shadow-sm text-center space-y-5 animate-fade-in">
          <div className="w-14 h-14 bg-[#F5F5F5] border border-[#E0E0E0] rounded-full flex items-center justify-center mx-auto text-[#111111]">
            <span className="material-symbols-outlined text-[28px]">lock</span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666] bg-[#F5F5F5] border border-[#E0E0E0] px-2.5 py-1 rounded-sm">
              Trạng thái Khách
            </span>
            <h2 className="text-lg font-bold text-[#111111] mt-3">
              Yêu cầu đăng nhập để tạo CV
            </h2>
            <p className="text-xs text-[#666666] mt-2 leading-relaxed">
              Bạn đang ở trạng thái <strong>Khách</strong>. Vui lòng đăng nhập tài khoản ứng viên để có thể tạo mới, chỉnh sửa và lưu trữ hồ sơ CV trực tuyến trên KiemJob.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/login"
              state={{ from: '/create-cv' }}
              className="w-full py-2.5 bg-[#111111] hover:bg-[#222222] text-white text-xs font-semibold rounded-sm transition-colors text-center inline-block cursor-pointer"
            >
              Chuyển sang trang đăng nhập
            </Link>
            <Link
              to="/register"
              className="w-full py-2 bg-white border border-[#E0E0E0] hover:border-[#111111] text-[#111111] text-xs font-semibold rounded-sm transition-colors text-center inline-block cursor-pointer"
            >
              Đăng ký tài khoản mới
            </Link>
            <Link
              to="/"
              className="text-xs text-[#666666] hover:text-[#111111] hover:underline pt-2 inline-block cursor-pointer"
            >
              ← Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==================== CHƯA CHỌN CV / KHÔNG TÌM THẤY CV / ĐANG TẢI ====================
  if (pageState !== 'ready') {
    // Lọc chỉ lấy Web CV (không phải PDF) để hiển thị chọn chỉnh sửa
    const webCvList = cvList.filter((c) => c.isWebCreated === true || c.hasPdf === false);

    return (
      <div className="w-full min-h-[calc(100vh-64px)] bg-[#faf8ff] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',system-ui,sans-serif]">
        <div className="bg-white border border-[#eaedff] p-8 max-w-lg w-full rounded-2xl shadow-sm text-center space-y-5">
          {pageState === 'loading' ? (
            <div className="space-y-3">
              <div className="w-10 h-10 border-4 border-[#005c55] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[#6e7977]">Đang tải CV...</p>
            </div>
          ) : pageState === 'no-cv' ? (
            <>
              <div className="w-16 h-16 rounded-3xl bg-[#e6f7f5] text-[#005c55] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">design_services</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#131b2e]">Trình dựng CV trực tuyến KiemJob</h2>
                <p className="text-xs text-[#6e7977] leading-relaxed mt-1.5">
                  Tạo hồ sơ CV chuyên nghiệp ngay trên hệ thống. Thông tin cá nhân (họ tên, email, số điện thoại...) sẽ được điền sẵn từ hồ sơ của bạn.
                </p>
              </div>

              {/* Nút tạo CV mới */}
              {cvList.length < 3 ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newCvTitleInput}
                    onChange={(e) => setNewCvTitleInput(e.target.value)}
                    placeholder={`VD: CV ${profile.fullname || ''} - Frontend Developer`}
                    className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#d9e2ec] rounded-xl text-sm text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#005c55]/30 focus:border-[#005c55] transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCvTitleInput.trim()) {
                        handleQuickCreateCv(newCvTitleInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickCreateCv(newCvTitleInput)}
                    disabled={isSaving}
                    className="w-full py-3 px-4 rounded-xl bg-[#005c55] hover:bg-[#007952] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang tạo...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        <span>Tạo CV trực tuyến mới</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-[#6e7977]">
                    Nhập tên CV hoặc bỏ trống để đặt tên mặc định. Bạn có thể đổi tên sau.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
                  <div>
                    <p className="font-bold">Đã đạt giới hạn 3/3 CV</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Mỗi tài khoản chỉ được lưu tối đa 3 bản CV. Vui lòng xóa bớt 1 bản CV cũ nếu bạn muốn tạo bản CV mới.
                    </p>
                  </div>
                </div>
              )}

              {/* Danh sách CV web đã có để chọn chỉnh sửa */}
              {webCvList.length > 0 && (
                <div className="pt-2 border-t border-[#eaedff]">
                  <p className="text-[11px] font-semibold text-[#6e7977] uppercase tracking-wider mb-2 text-left">
                    Hoặc chỉnh sửa CV trực tuyến đã tạo
                  </p>
                  <div className="space-y-1.5 text-left">
                    {webCvList.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleEditExistingCv(c.id)}
                        className="w-full text-left text-xs p-2.5 rounded-xl border border-[#eaedff] hover:border-[#005c55] hover:bg-[#e6f7f5] cursor-pointer transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#005c55]">edit_document</span>
                        <span className="truncate">{c.title || 'CV chưa đặt tên'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-block text-xs font-semibold text-[#005c55] hover:underline cursor-pointer"
                >
                  ← Quay lại danh sách CV
                </button>
              ) : (
                <Link to="/cvs" className="inline-block text-xs font-semibold text-[#005c55] hover:underline">
                  ← Quay lại danh sách CV
                </Link>
              )}
            </>
          ) : (
            /* pageState === 'not-found' */
            <>
              <div className="w-16 h-16 rounded-3xl bg-[#ffdad6]/40 text-[#ba1a1a] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">error</span>
              </div>
              <h2 className="text-lg font-bold text-[#131b2e]">Không tìm thấy bản CV</h2>
              <p className="text-xs text-[#6e7977] leading-relaxed">
                Bản CV không tồn tại hoặc bạn không có quyền truy cập. Hãy quay lại danh sách CV.
              </p>
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-block text-xs font-semibold text-[#005c55] hover:underline cursor-pointer"
                >
                  ← Quay lại danh sách CV
                </button>
              ) : (
                <Link to="/cvs" className="inline-block text-xs font-semibold text-[#005c55] hover:underline">
                  ← Quay lại danh sách CV
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#faf8ff] font-['Plus_Jakarta_Sans',system-ui,sans-serif]">
      {/* ==================== PRINT STYLES ==================== */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body, html, #root {
            background-color: #ffffff !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          header, footer, aside, .print\\:hidden, #chat-widget-container, .floating-widgets, nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          #section-header {
            display: block !important;
          }
          #cv-a4-canvas {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
            min-height: auto !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          section, .group {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          input, textarea {
            outline: none !important;
            border: none !important;
            background: transparent !important;
            color: #111111 !important;
            box-shadow: none !important;
          }
          textarea {
            field-sizing: content !important;
            overflow: visible !important;
            resize: none !important;
          }
          img {
            max-width: 100% !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ==================== TOAST NOTIFICATION ==================== */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 transition-all duration-300 text-white text-xs ${toastMsg.isError ? 'bg-[#ba1a1a]' : 'bg-[#005c55]'
            }`}
        >
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ==================== WORKSPACE: 2-COLUMN LAYOUT ==================== */}
      <div className="w-full flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* -------------------- LEFT SIDEBAR -------------------- */}
        <aside className="w-full lg:w-[32%] lg:max-w-[400px] border-r border-[#eaedff] bg-[#FFFFFF] flex flex-col justify-between p-6 shrink-0 print:hidden">
          <div className="flex flex-col space-y-6">
            {/* Top Header & Actions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDiscardChanges()) {
                      if (onBack) {
                        onBack();
                      } else {
                        navigate('/cvs');
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#6e7977] hover:text-[#005c55] font-medium tracking-wide cursor-pointer text-left transition-colors"
                >
                  <span>← Quay lại danh sách CV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCvModal(true)}
                  className="text-[11px] text-[#005c55] hover:underline font-semibold cursor-pointer"
                >
                  Đổi bản CV khác
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-[#005c55] tracking-tight">KiemJob CV Builder</span>
                <span className="text-xs text-[#005c55] border border-[#80d5cb]/40 px-2 py-0.5 rounded-lg bg-[#e6f7f5] font-semibold">
                  Tạo CV trực tiếp
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#eaedff]">
                <label className="block text-[11px] uppercase tracking-wider text-[#6e7977] font-semibold mb-1">
                  Tên bản CV
                </label>
                <input
                  type="text"
                  value={cvTitle}
                  onChange={(e) => {
                    setCvTitle(e.target.value);
                    markDirty();
                  }}
                  className="w-full border border-[#eaedff] hover:border-[#005c55] focus:border-[#005c55] px-3 py-1.5 rounded-xl bg-[#f2f3ff] text-sm font-semibold text-[#131b2e] focus:bg-white focus:outline-none transition-colors"
                  placeholder="CV Backend Developer - Java Spring Boot"
                />
                <p className="text-[11px] text-[#6e7977] mt-1">
                  Trạng thái: {saveStatus}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={triggerManualSave}
                  disabled={isSaving}
                  className="w-full bg-[#005c55] hover:bg-[#007952] text-[#FFFFFF] text-xs font-semibold py-2.5 px-3 rounded-xl transition-all shadow-sm text-center cursor-pointer active:scale-95 disabled:opacity-60"
                  type="button"
                >
                  Lưu CV
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full bg-[#FFFFFF] border border-[#eaedff] hover:border-[#005c55] text-[#005c55] text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors text-center cursor-pointer flex items-center justify-center gap-1 hover:bg-[#e6f7f5]"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                  <span>Tải PDF</span>
                </button>
              </div>
            </div>

            {/* Section Navigation (Mục lục nội dung CV & Thứ tự hiển thị) */}
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#E5E5E5]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Mục lục nội dung CV</span>
                <span className="text-[11px] text-[#666666]">Thao tác</span>
              </div>
              <ul className="space-y-1 text-xs text-[#111111]">
                {/* 1. Header Cá nhân Cố định */}
                <li
                  onClick={() => scrollToSection('section-header')}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#e6f7f5] border-l-2 border-[#005c55] text-[#005c55] font-semibold cursor-pointer hover:bg-[#d5f3ee] transition-colors"
                >
                  <span>1. Thông tin cá nhân</span>
                  <span className="text-[10px] text-[#005c55]/80 font-bold">Cố định</span>
                </li>

                {/* Các section có thể sắp xếp và xóa */}
                {sectionKeysOrder.map((secKey, idx) => {
                  const meta = getSectionMetadata(secKey);
                  const isFirst = idx === 0;
                  const isLast = idx === sectionKeysOrder.length - 1;

                  return (
                    <li
                      key={secKey}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f2f3ff] transition-colors"
                    >
                      <span
                        onClick={() => scrollToSection(SECTION_TARGET_MAP[secKey])}
                        className="cursor-pointer hover:text-[#005c55] flex-1 truncate pr-1 font-medium text-xs text-[#131b2e]"
                      >
                        {idx + 2}. {meta.title} {meta.count !== null && <span className="text-[11px] font-normal text-[#6e7977]">({meta.count})</span>}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveSectionInOrder(secKey, 'up')}
                          disabled={isFirst}
                          className="px-1.5 py-0.5 text-[10px] border border-[#eaedff] rounded-lg hover:bg-[#e6f7f5] text-[#131b2e] hover:text-[#005c55] disabled:opacity-20 cursor-pointer"
                          type="button"
                          title="Di chuyển mục lên"
                        >
                          Lên
                        </button>
                        <button
                          onClick={() => moveSectionInOrder(secKey, 'down')}
                          disabled={isLast}
                          className="px-1.5 py-0.5 text-[10px] border border-[#eaedff] rounded-lg hover:bg-[#e6f7f5] text-[#131b2e] hover:text-[#005c55] disabled:opacity-20 cursor-pointer"
                          type="button"
                          title="Di chuyển mục xuống"
                        >
                          Xuống
                        </button>
                        <button
                          onClick={() => handleDeleteSection(secKey, meta.title)}
                          className="px-1.5 py-0.5 text-[10px] border border-[#eaedff] rounded-lg hover:bg-[#ffdad6]/50 text-[#ba1a1a] hover:border-[#ba1a1a] cursor-pointer"
                          type="button"
                          title="Ẩn mục này khỏi CV"
                        >
                          Xóa
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Nút thêm mục mới vào CV ở thanh bên trái */}
              <button
                type="button"
                onClick={() => setShowAddSectionModal(true)}
                className="w-full mt-3 py-2 px-3 border border-dashed border-[#005c55] hover:bg-[#e6f7f5] text-[#005c55] text-xs font-semibold rounded-xl transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="text-base font-bold leading-none">+</span>
                <span>Thêm mục vào CV</span>
              </button>
            </div>
          </div>

          {/* Left Sidebar Footer note */}
          <div className="border-t border-[#eaedff] pt-4 mt-6 text-[11px] text-[#6e7977] leading-relaxed">
            <span className="font-semibold text-[#131b2e] block mb-0.5">Mẹo thao tác:</span>
            Bấm chuột trực tiếp vào các dòng văn bản trên bản CV bên phải để chỉnh sửa nội dung hoặc bấm các nút "+ Thêm mục". Mọi thay đổi chỉ được lưu khi bạn bấm "Lưu CV".
          </div>
        </aside>

        {/* -------------------- RIGHT CANVAS -------------------- */}
        <div className="flex-1 bg-[#faf8ff] p-4 lg:p-10 flex flex-col items-center justify-start overflow-y-auto">
          {/* Paper Header Top Bar */}
          <div className="w-full max-w-[820px] flex items-center justify-between mb-3 text-xs text-[#666666] print:hidden">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#111111] uppercase tracking-wide">Tài liệu CV (Khổ A4)</span>
              <span>|</span>
              <span>Chế độ: Biên tập trực tiếp (Inline Editing)</span>
            </div>
            <div>Khổ chuẩn A4 • Tỷ lệ 100%</div>
          </div>

          {/* A4 Paper Container */}
          <div
            id="cv-a4-canvas"
            className="w-full max-w-[820px] bg-[#FFFFFF] border border-[#D9D9D9] p-10 lg:p-14 min-h-[1120px] shadow-sm rounded-sm text-[#111111] leading-relaxed"
          >
            {/* 1. HEADER SECTION (Cá nhân) */}
            <div id="section-header" className="group relative border-b border-[#111111] pb-5 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <input
                    type="text"
                    value={profile.fullname || ''}
                    onChange={(e) => {
                      setProfile({ ...profile, fullname: e.target.value });
                      markDirty();
                    }}
                    placeholder="HỌ VÀ TÊN ỨNG VIÊN"
                    className="w-full text-2xl lg:text-3xl font-extrabold uppercase tracking-wide text-[#111111] hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 outline-none"
                  />
                  <input
                    type="text"
                    value={profile.headline || ''}
                    onChange={(e) => {
                      setProfile({ ...profile, headline: e.target.value });
                      markDirty();
                    }}
                    placeholder="Chức danh công việc mục tiêu"
                    className="w-full text-base font-semibold text-[#222222] mt-1 hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] p-0.5 rounded-sm bg-transparent border-0 outline-none"
                  />
                  <div className="text-xs text-[#333333] mt-2 leading-loose flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[#666666]">Email:</span>
                      <input
                        type="email"
                        value={profile.email || ''}
                        onChange={(e) => {
                          setProfile({ ...profile, email: e.target.value });
                          markDirty();
                        }}
                        placeholder="tuananh.dev@gmail.com"
                        style={{ width: `${Math.max((profile.email?.length || 10) * 7.5 + 8, 120)}px` }}
                        className="hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] px-1 py-0.5 rounded-sm bg-transparent border-0 text-xs text-[#333333] outline-none"
                      />
                    </span>
                    <span className="text-[#999999]">|</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[#666666]">SĐT:</span>
                      <input
                        type="text"
                        value={profile.phone || ''}
                        onChange={(e) => {
                          setProfile({ ...profile, phone: e.target.value });
                          markDirty();
                        }}
                        placeholder="0912 849 889"
                        style={{ width: `${Math.max((profile.phone?.length || 10) * 7.5 + 8, 90)}px` }}
                        className="hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] px-1 py-0.5 rounded-sm bg-transparent border-0 text-xs text-[#333333] outline-none"
                      />
                    </span>
                    <span className="text-[#999999]">|</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[#666666]">Địa chỉ:</span>
                      <input
                        type="text"
                        value={profile.addressDetail || ''}
                        onChange={(e) => {
                          setProfile({ ...profile, addressDetail: e.target.value });
                          markDirty();
                        }}
                        placeholder="Cầu Giấy, Hà Nội"
                        style={{ width: `${Math.max((profile.addressDetail?.length || 10) * 7.5 + 8, 110)}px` }}
                        className="hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] px-1 py-0.5 rounded-sm bg-transparent border-0 text-xs text-[#333333] outline-none"
                      />
                    </span>
                    <span className="text-[#999999]">|</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[#666666]">GitHub:</span>
                      <input
                        type="text"
                        value={profile.portfolioUrl || ''}
                        onChange={(e) => {
                          setProfile({ ...profile, portfolioUrl: e.target.value });
                          markDirty();
                        }}
                        placeholder="github.com/tuananh-dev"
                        style={{ width: `${Math.max((profile.portfolioUrl?.length || 12) * 7.5 + 8, 140)}px` }}
                        className="hover:outline-dashed hover:outline-1 hover:outline-[#666666] focus:outline focus:outline-1 focus:outline-[#111111] px-1 py-0.5 rounded-sm bg-transparent border-0 text-xs text-[#333333] outline-none"
                      />
                    </span>
                  </div>
                </div>

                {/* Ảnh đại diện nếu có và hợp lệ */}
                {Boolean(profile.avatarUrl && typeof profile.avatarUrl === 'string' && profile.avatarUrl.trim()) && (
                  <div className="relative group/avatar shrink-0 ml-4 print:block">
                    <img
                      src={profile.avatarUrl}
                      alt="Avatar"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="w-20 h-24 object-cover border border-[#D9D9D9] rounded-sm shadow-xs"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity rounded-sm print:hidden">
                      <label className="cursor-pointer text-[10px] text-white underline font-semibold">
                        Đổi ảnh
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DYNAMIC SECTIONS RENDERING ACCORDING TO ORDER */}
            {sectionKeysOrder.map((secKey) => renderSectionByKey(secKey))}
          </div>
        </div>
      </div>

      {/* ==================== MODAL: QUẢN LÝ & DANH SÁCH CV ==================== */}
      {showCvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#eaedff] space-y-4">
            <div className="flex items-center justify-between border-b border-[#eaedff] pb-3">
              <h3 className="text-sm font-bold text-[#131b2e] uppercase tracking-wide">Danh Sách CV Của Bạn</h3>
              <button
                type="button"
                onClick={() => setShowCvModal(false)}
                className="text-sm text-[#6e7977] hover:text-[#ba1a1a] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {cvList.length === 0 ? (
                <div className="text-xs text-[#6e7977] italic py-2">
                  Bạn đang thao tác với bản CV hiện tại. Hãy bấm tạo mới bên dưới nếu muốn tạo thêm bản CV khác.
                </div>
              ) : (
                cvList.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${c.id === activeCvId ? 'bg-[#e6f7f5] text-[#005c55] font-bold border-l-2 border-[#005c55]' : 'hover:bg-[#f2f3ff]'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (c.id !== activeCvId) {
                          if (!confirmDiscardChanges()) return; // hủy -> ở lại CV hiện tại
                          setShowCvModal(false);
                          navigate(`/cvs/${c.id}/edit`); // effect theo routeCvId sẽ tải CV mới từ Backend
                          return;
                        }
                        setShowCvModal(false);
                      }}
                      className="text-left flex-1 truncate cursor-pointer"
                    >
                      {c.title || 'CV chưa đặt tên'} {c.id === activeCvId && ' (Đang mở)'}
                    </button>
                    {cvList.length > 1 && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm('Bạn có chắc chắn muốn xóa bản CV này?')) return;
                          try {
                            await deleteCv(candidateId, c.id);
                          } catch {
                            showToast('Xóa bản CV thất bại.', true);
                            return;
                          }
                          const remain = cvList.filter((item) => item.id !== c.id);
                          setCvList(remain);
                          if (activeCvId === c.id) {
                            setIsDirty(false);
                            setShowCvModal(false);
                            navigate(remain.length ? `/cvs/${remain[0].id}/edit` : '/cvs', { replace: true });
                          }
                          showToast('Đã xóa bản CV');
                        }}
                        className="text-[#ba1a1a] hover:underline text-[11px] ml-2 cursor-pointer font-semibold"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#eaedff] pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] uppercase tracking-wider text-[#6e7977] font-semibold">
                  Tạo bản CV mới
                </label>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cvList.length >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-teal-50 text-[#005c55]'}`}>
                  {cvList.length}/3 CV
                </span>
              </div>

              {cvList.length >= 3 ? (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  Bạn đã đạt giới hạn tối đa 3 CV. Hãy xóa bớt 1 bản CV nếu muốn tạo bản CV mới.
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCvTitleInput}
                    onChange={(e) => setNewCvTitleInput(e.target.value)}
                    placeholder="Ví dụ: CV Frontend React..."
                    className="flex-1 px-3 py-1.5 border border-[#eaedff] rounded-xl text-xs text-[#131b2e] bg-[#f2f3ff] focus:bg-white focus:outline-none focus:border-[#005c55]"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCv}
                    className="bg-[#005c55] hover:bg-[#007952] text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Tạo mới
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCvModal(false)}
                className="text-xs text-[#6e7977] hover:text-[#131b2e] px-4 py-1.5 border border-[#eaedff] rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: THÊM MỤC / NHÓM VÀO CV ==================== */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#eaedff] space-y-4">
            <div className="flex items-center justify-between border-b border-[#eaedff] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#131b2e] uppercase tracking-wide">Thêm Mục / Nhóm Nội Dung Vào CV</h3>
                <p className="text-[11px] text-[#6e7977] mt-0.5">Chọn các mục nội dung bạn muốn bổ sung vào bản CV</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="text-sm text-[#6e7977] hover:text-[#ba1a1a] cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {ALL_AVAILABLE_SECTIONS.map((sec) => {
                const isAdded = sectionKeysOrder.includes(sec.key) ||
                  (sec.key === 'skill_groups' && sectionKeysOrder.includes('skills'));

                return (
                  <div
                    key={sec.key}
                    className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${isAdded ? 'border-[#eaedff] bg-[#f2f3ff]' : 'border-[#eaedff] hover:border-[#005c55] bg-white'
                      }`}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#131b2e]">{sec.title}</span>
                        {isAdded && (
                          <span className="text-[10px] text-[#00513a] bg-[#97f5cc] px-2 py-0.5 rounded-full font-bold">
                            ✓ Đã có trên CV
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6e7977] mt-0.5">{sec.desc}</p>
                    </div>

                    <div>
                      {isAdded ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddSectionModal(false);
                            scrollToSection(SECTION_TARGET_MAP[sec.key]);
                          }}
                          className="px-3 py-1.5 text-[11px] border border-[#eaedff] text-[#6e7977] hover:text-[#005c55] hover:border-[#005c55] rounded-xl cursor-pointer"
                        >
                          Xem mục
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddSection(sec.key, sec.title)}
                          className="px-3 py-1.5 bg-[#005c55] hover:bg-[#007952] text-white text-[11px] font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          + Thêm vào CV
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#eaedff]">
              <span className="text-[11px] text-[#6e7977]">
                Bạn có thể tự do sắp xếp thứ tự các mục tại thanh bên trái.
              </span>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="text-xs text-[#6e7977] hover:text-[#131b2e] px-4 py-1.5 border border-[#eaedff] hover:border-[#131b2e] rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}