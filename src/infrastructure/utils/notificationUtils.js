
/**
 * Lấy trạng thái cấp quyền thông báo hiện tại của trình duyệt.
 * Trả về: 'unsupported' | 'default' | 'granted' | 'denied'
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Xin quyền hiển thị thông báo trình duyệt.
 * Hàm này chỉ được gọi từ thao tác click chủ động của người dùng.
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const result = await Notification.requestPermission();
    console.log('[Notification] Quyền thông báo sau khi yêu cầu:', result);
    return result;
  } catch (err) {
    console.warn('[Notification] Lỗi khi xin quyền thông báo:', err);
    return 'default';
  }
}

/**
 * Hiển thị thông báo tin nhắn mới trên màn hình Windows Desktop.
 * Định dạng:
 * - Tiêu đề: 'KiemJob - Tin nhắn mới'
 * - Nội dung: '[Tên người gửi]: [Nội dung tin nhắn cắt ngắn]'
 */
export function showChatNotification({
  title,
  senderName,
  content,
  body,
  conversationId,
  onClick,
}) {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    console.log(
      '[Notification] Bỏ qua Desktop Notification Toast (permission =',
      typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'unsupported',
      ')'
    );
    return null;
  }

  try {
    const notificationTitle = title || 'KiemJob - Tin nhắn mới';

    // Rút gọn nội dung nếu quá dài để hiển thị vừa vặn trên khay thông báo Windows
    const cleanSnippet = content
      ? content.length > 80
        ? content.slice(0, 80) + '...'
        : content
      : '';

    let notificationBody = body;
    if (!notificationBody) {
      if (senderName && cleanSnippet) {
        notificationBody = `${senderName}: ${cleanSnippet}`;
      } else {
        notificationBody = cleanSnippet || 'Bạn có tin nhắn mới';
      }
    }

    console.log('[Notification] Hiển thị Windows Desktop Toast:', {
      title: notificationTitle,
      body: notificationBody,
      conversationId,
    });

    // Không truyền icon .svg vì Windows Action Center không hỗ trợ ảnh SVG cho Native Toasts
    const notification = new Notification(notificationTitle, {
      body: notificationBody,
      tag: conversationId ? `kiemjob-chat-${conversationId}` : undefined,
    });

    notification.onclick = () => {
      try {
        window.focus();
      } catch {}

      if (typeof onClick === 'function') {
        onClick();
      }

      notification.close();
    };

    // Tự đóng sau 8 giây để tránh tràn khay thông báo nếu người dùng không bấm
    setTimeout(() => {
      try {
        notification.close();
      } catch {}
    }, 8000);

    return notification;
  } catch (err) {
    console.warn('Lỗi hiển thị thông báo desktop:', err);
    return null;
  }
}

/**
 * Điều phối thao tác bật thông báo dùng chung cho cả Candidate và Recruiter:
 * 1. Nếu 'denied': Hướng dẫn mở cài đặt trình duyệt để cho phép lại.
 * 2. Nếu 'granted': Phát thông báo thử nghiệm để người dùng xác nhận.
 * 3. Nếu 'default': Yêu cầu cấp quyền và phát thông báo thử nghiệm nếu được cấp.
 */
export async function handleEnableNotifications(setPermissionState) {
  const current = getNotificationPermission();

  if (current === 'unsupported') {
    alert('Trình duyệt của bạn hiện không hỗ trợ tính năng thông báo Desktop.');
    return 'unsupported';
  }

  if (current === 'denied') {
    alert(
      'Thông báo đã bị chặn trong cài đặt trình duyệt.\n\n' +
      'Để bật lại quyền thông báo:\n' +
      '1. Nhấp vào biểu tượng ổ khóa (hoặc cài đặt trang web) bên trái thanh địa chỉ URL.\n' +
      '2. Chuyển mục "Thông báo" (Notifications) sang "Cho phép" (Allow).\n' +
      '3. Tải lại trang (F5) để kích hoạt.'
    );
    if (typeof setPermissionState === 'function') {
      setPermissionState('denied');
    }
    return 'denied';
  }

  if (current === 'granted') {
    if (typeof setPermissionState === 'function') {
      setPermissionState('granted');
    }
    showChatNotification({
      title: 'KiemJob - Tin nhắn mới',
      senderName: 'Hệ thống KiemJob',
      content: 'Thông báo trên màn hình đang hoạt động bình thường!',
    });
    return 'granted';
  }

  // Trạng thái 'default': yêu cầu người dùng cấp quyền
  const result = await requestNotificationPermission();
  if (typeof setPermissionState === 'function') {
    setPermissionState(result);
  }

  if (result === 'granted') {
    showChatNotification({
      title: 'KiemJob - Tin nhắn mới',
      senderName: 'Hệ thống KiemJob',
      content: 'Đã bật thông báo trên màn hình thành công!',
    });
  } else if (result === 'denied') {
    alert(
      'Bạn đã chọn chặn thông báo.\n' +
      'Nếu muốn nhận thông báo khi có tin nhắn mới, vui lòng mở cài đặt trình duyệt để cho phép.'
    );
  }

  return result;
}
