import authApi from '../api/authApi';
import profileApi from '../api/profileApi';

/**
 * Đọc giá trị của một Cookie theo tên
 * @param {string} name - Tên cookie cần lấy
 * @returns {string|null} Giá trị cookie hoặc null nếu không tồn tại
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const nameEQ = encodeURIComponent(name) + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

/**
 * Thiết lập cookie trên trình duyệt
 * @param {string} name - Tên cookie
 * @param {string} value - Giá trị cookie
 * @param {number} days - Số ngày tồn tại (mặc định 7 ngày)
 */
export function setCookie(name, value, days = 7) {
  if (typeof document === 'undefined') return;
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value || '')}${expires}; path=/; SameSite=Lax`;
}

/**
 * Xóa một cookie cụ thể trên trình duyệt
 * @param {string} name - Tên cookie cần xóa
 */
export function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
}

/**
 * Xóa toàn bộ cookie mà JavaScript có thể truy cập
 */
export function clearAllCookies() {
  if (typeof document === 'undefined') return;
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    if (name) {
      deleteCookie(name);
    }
  }
}

/**
 * Kiểm tra xem web hiện tại CÓ COOKIE XÁC THỰC KHÔNG.
 * @returns {boolean} true nếu có cookie đăng nhập, false nếu không có (trạng thái khách)
 */
export function hasAuthCookie() {
  if (typeof document === 'undefined') return false;

  // 1. Nếu document.cookie rỗng -> 100% không có cookie nào
  const rawCookie = document.cookie;
  if (!rawCookie || rawCookie.trim() === '') {
    return false;
  }

  // 2. Kiểm tra cờ logged_in được backend/frontend thiết lập
  const loggedIn = getCookie('logged_in');
  if (loggedIn === 'true') {
    return true;
  }

  // 3. Kiểm tra các cookie nhận diện phiên đăng nhập khác nếu có
  if (getCookie('access_token') || getCookie('kiemjob_auth') || getCookie('token')) {
    return true;
  }

  // 4. Nếu trình duyệt có cookie nhưng không có cookie phiên đăng nhập
  return false;
}

/**
 * Xóa toàn bộ phiên đăng nhập cục bộ và đưa về trạng thái khách
 */
export function clearAuthSession() {
  deleteCookie('logged_in');
  deleteCookie('access_token');
  deleteCookie('kiemjob_auth');
  deleteCookie('token');

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('kiemjob_user');
    localStorage.removeItem('kiemjob_token');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('authChange'));
  }
}

/**
 * Kiểm tra đồng bộ cookie ngay lập tức:
 * Nếu không có cookie -> tự động dọn sạch localStorage và chuyển web về trạng thái Khách
 * @returns {boolean} true nếu có cookie, false nếu ở trạng thái khách
 */
export function syncAuthStateWithCookie() {
  if (typeof window === 'undefined') return false;

  const hasCookie = hasAuthCookie();
  if (!hasCookie) {
    const hadUser = localStorage.getItem('kiemjob_user') !== null;
    const hadToken = localStorage.getItem('kiemjob_token') !== null;

    if (hadUser || hadToken) {
      localStorage.removeItem('kiemjob_user');
      localStorage.removeItem('kiemjob_token');
      window.dispatchEvent(new Event('authChange'));
    }
    return false;
  }

  return true;
}

/**
 * Kiểm tra và xác minh phiên làm việc với Backend (gọi API /auth/me).
 * Nếu cookie hết hạn hoặc không hợp lệ -> đưa về trạng thái khách.
 * @returns {Promise<object|null>} Trả về thông tin người dùng nếu hợp lệ, hoặc null nếu là khách
 */

export async function checkAuthSession() {
  if (!hasAuthCookie()) {
    clearAuthSession();
    return null;
  }

  try {
    const account = await authApi.getMe();

    if (!account?.id) {
      clearAuthSession();
      return null;
    }

    const previousUser = JSON.parse(
      localStorage.getItem('kiemjob_user') || 'null'
    );

    let user = {
      id: account.id,
      email: account.email || '',
      phone: account.phone || previousUser?.phone || '',
      role: account.role || 'candidate',
      fullName:
        account.fullName ||
        account.fullname ||
        (previousUser?.email === account.email && previousUser?.fullName && previousUser.fullName !== previousUser.email?.split('@')[0]
          ? previousUser.fullName
          : '') ||
        (account.email
          ? account.email.split('@')[0]
          : 'Người dùng'),
      title: account.headline || previousUser?.title || '',
      avatar: account.avatarUrl || account.avatar || previousUser?.avatar || '',
      gender: account.gender || previousUser?.gender || null,
    };

    // Khôi phục thông tin công ty của recruiter sau F5
    if (user.role === 'recruiter') {
      try {
        const recruiterResponse = await profileApi.getRecruiterProfile();
        const recruiter = recruiterResponse?.data ?? recruiterResponse;

        user = {
          ...user,
          recruiterId: recruiter.id ?? null,
          companyId: recruiter.companyId ?? null,
          company_id: recruiter.companyId ?? null,
          company_name: recruiter.companyName || '',
          company: recruiter.companyId
            ? {
              id: recruiter.companyId,
              name: recruiter.companyName || '',
              status: recruiter.status || null,
            }
            : null,
          status: recruiter.status || null,
          profileCompleted: Boolean(recruiter.companyId),
          fullName: recruiter.fullName || user.fullName,
          avatar: recruiter.logoUrl || user.avatar,
        };
      } catch (error) {
        console.error(
          'Không thể tải hồ sơ nhà tuyển dụng:',
          error
        );

        // Không tự kết luận tài khoản chưa có công ty
        // chỉ vì API hồ sơ tạm thời gặp lỗi.
        if (previousUser?.role === 'recruiter') {
          user = {
            ...user,
            recruiterId: previousUser.recruiterId ?? null,
            companyId: previousUser.companyId ?? previousUser.company_id ?? null,
            company_id: previousUser.company_id ?? previousUser.companyId ?? null,
            company_name: previousUser.company_name || '',
            company: previousUser.company || null,
            status: previousUser.status || null,
            profileCompleted: previousUser.profileCompleted ?? false,
          };
        }
      }
    } else if (user.role === 'candidate') {
      try {
        const candidateResponse = await profileApi.getCandidateProfile();
        const candidate = candidateResponse?.data ?? candidateResponse;

        if (candidate) {
          const candidateName = candidate.fullname || candidate.fullName;
          user = {
            ...user,
            candidateId: candidate.id ?? null,
            fullName: candidateName || user.fullName,
            fullname: candidateName || user.fullName,
            avatar: candidate.avatarUrl || user.avatar,
            title: candidate.headline || user.title,
            phone: candidate.phone || user.phone,
            gender: candidate.gender || user.gender,
            provinceId: candidate.provinceId ?? null,
            provinceName: candidate.provinceName || '',
            addressDetail: candidate.addressDetail || '',
            dateOfBirth: candidate.dateOfBirth || null,
          };
        }
      } catch (error) {
        console.warn('Không thể tải hồ sơ ứng viên:', error);
        if (previousUser?.role === 'candidate' && previousUser.fullName) {
          user.fullName = previousUser.fullName;
          user.fullname = previousUser.fullname || previousUser.fullName;
          user.avatar = previousUser.avatar || user.avatar;
          user.title = previousUser.title || user.title;
        }
      }
    }

    setCookie('logged_in', 'true', 7);
    localStorage.setItem('kiemjob_user', JSON.stringify(user));
    window.dispatchEvent(new Event('authChange'));

    return user;
  } catch (err) {
    console.warn(
      'Không thể khôi phục phiên đăng nhập:',
      err.message
    );
    clearAuthSession();
    return null;
  }
}

