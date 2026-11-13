import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Trang RecruiterChatPage đã được thay thế hoàn toàn bằng hệ thống
 * chat widget kiểu Messenger tích hợp trực tiếp trên Header và nổi ở góc dưới.
 */
export default function RecruiterChatPage() {
  return <Navigate to="/recruiter" replace />;
}
