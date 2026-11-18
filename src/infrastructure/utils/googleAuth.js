/**
 * googleAuth.js - Tiện ích tích hợp Google Identity Services (GIS)
 * Quản lý việc nạp thư viện Google, mở cửa sổ đăng nhập popup và nhận mã xác thực.
 */

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '577538603657-nh9gmr1jb6cnlmjtdscje6bpdf01esbr.apps.googleusercontent.com';

/**
 * Đảm bảo script Google Identity Services đã được nạp vào trang
 */
export function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window.google?.accounts?.oauth2 || window.google?.accounts?.id)) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById('google-gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google));
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Kích hoạt popup đăng nhập Google khi người dùng nhấn nút "Đăng nhập nhanh với Google"
 * 
 * @param {object} options
 * @param {'candidate'|'recruiter'} [options.role='candidate'] - Vai trò mong muốn khi tạo tài khoản mới
 * @param {function(object): void} options.onSuccess - Callback khi nhận được mã xác thực ({ code, accessToken, idToken, role })
 * @param {function(Error): void} [options.onError] - Callback khi có lỗi hoặc người dùng hủy
 */
export async function triggerGoogleLogin({ role = 'candidate', onSuccess, onError }) {
  try {
    const google = await loadGoogleScript();

    if (!google?.accounts?.oauth2) {
      throw new Error('Thư viện Google Identity Services chưa sẵn sàng. Vui lòng thử lại sau giây lát.');
    }

    // Khởi tạo client lấy authorization code (chuẩn OAuth2 popup)
    const client = google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: (response) => {
        if (response.error) {
          if (response.error === 'access_denied') {
            onError?.(new Error('Bạn đã hủy đăng nhập với Google.'));
          } else {
            onError?.(new Error(`Đăng nhập Google thất bại (${response.error}). Vui lòng thử lại.`));
          }
          return;
        }

        if (response.code) {
          onSuccess?.({
            code: response.code,
            redirectUri: 'postmessage',
            role
          });
        }
      },
      error_callback: (nonOAuthError) => {
        console.warn('Lỗi initCodeClient, chuyển sang thử nghiệm initTokenClient:', nonOAuthError);
        // Fallback sang token client nếu môi trường popup code gặp vấn đề
        try {
          const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'openid email profile',
            callback: (tokenResp) => {
              if (tokenResp.error) {
                onError?.(new Error('Đăng nhập Google thất bại.'));
                return;
              }
              if (tokenResp.access_token) {
                onSuccess?.({
                  accessToken: tokenResp.access_token,
                  role
                });
              }
            }
          });
          tokenClient.requestAccessToken();
        } catch (fallbackErr) {
          console.error('Không thể mở popup Google:', fallbackErr);
          onError?.(new Error('Không thể mở cửa sổ đăng nhập Google. Vui lòng kiểm tra chặn popup trên trình duyệt.'));
        }
      }
    });

    client.requestCode();
  } catch (err) {
    console.error('Lỗi khởi tạo Google Auth:', err);
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}
