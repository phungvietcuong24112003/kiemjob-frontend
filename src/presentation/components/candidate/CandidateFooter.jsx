import React from 'react';
import { Link } from 'react-router-dom';

export default function CandidateFooter() {
  return (
    <footer className="w-full bg-[#f2f3ff] text-[#3e4947] border-t border-[#eaedff]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Info */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#005c55] to-[#007952] flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[20px]">work</span>
              </div>
              <span className="font-bold text-2xl text-[#005c55] tracking-tight">KiemJob</span>
            </Link>
            <p className="text-sm text-[#3e4947] max-w-sm leading-relaxed">
              Hệ sinh thái kết nối nhân tài công nghệ hàng đầu Việt Nam. Nâng tầm sự nghiệp và kiến tạo cơ hội bứt phá cùng các doanh nghiệp uy tín.
            </p>
            <div className="flex items-center gap-2.5 text-sm text-[#131b2e] font-medium">
              <span className="material-symbols-outlined text-[#005c55] text-[20px]">call</span>
              <span>Hotline hỗ trợ ứng viên: <strong className="text-[#005c55] font-bold">1900 6868</strong> (8:00 - 20:00)</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-[#131b2e] font-medium">
              <span className="material-symbols-outlined text-[#005c55] text-[20px]">mail</span>
              <span>hotro@kiemjob.vn</span>
            </div>
          </div>

          {/* Dành cho ứng viên */}
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-bold text-[#131b2e] mb-1 uppercase tracking-wider text-xs">Dành cho ứng viên</span>
            <Link to="/jobs" className="text-sm hover:text-[#005c55] transition-colors">Tìm kiếm việc làm</Link>
            <Link to="/jobs?q=frontend" className="text-sm hover:text-[#005c55] transition-colors">Việc làm IT &amp; Tech</Link>
            <Link to="/cvs" className="text-sm hover:text-[#005c55] transition-colors">Quản lý hồ sơ CV (PDF)</Link>
            <Link to="/career-guide" className="text-sm hover:text-[#005c55] transition-colors">Tính lương Gross sang Net</Link>
            <Link to="/career-guide" className="text-sm hover:text-[#005c55] transition-colors">Khảo sát mức lương 2026</Link>
          </div>

          {/* Khám phá & Phát triển */}
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-bold text-[#131b2e] mb-1 uppercase tracking-wider text-xs">Khám phá &amp; Phát triển</span>
            <Link to="/companies" className="text-sm hover:text-[#005c55] transition-colors">Top 100 Doanh nghiệp</Link>
            <Link to="/career-guide" className="text-sm hover:text-[#005c55] transition-colors">Cẩm nang sự nghiệp</Link>
            <Link to="/career-guide" className="text-sm hover:text-[#005c55] transition-colors">Kinh nghiệm phỏng vấn</Link>
            <Link to="/career-guide" className="text-sm hover:text-[#005c55] transition-colors">Báo cáo thị trường IT</Link>
            <Link to="/profile" className="text-sm hover:text-[#005c55] transition-colors">Chứng chỉ kỹ năng ATS</Link>
          </div>

          {/* Về KiemJob */}
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-bold text-[#131b2e] mb-1 uppercase tracking-wider text-xs">Về KiemJob</span>
            <a href="#about" className="text-sm hover:text-[#005c55] transition-colors">Giới thiệu công ty</a>
            <a href="#terms" className="text-sm hover:text-[#005c55] transition-colors">Quy chế hoạt động</a>
            <a href="#privacy" className="text-sm hover:text-[#005c55] transition-colors">Chính sách bảo mật</a>
            <a href="#dispute" className="text-sm hover:text-[#005c55] transition-colors">Giải quyết khiếu nại</a>
            <Link to="/recruiter" className="text-sm font-semibold text-[#005c55] hover:underline">Dành cho nhà tuyển dụng</Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[#dae2fd] text-xs text-[#6e7977]">
          <span>© 2026 KiemJob Joint Stock Company. Bản quyền đã được bảo lưu.</span>
          <div className="flex items-center gap-6">
            <a href="#terms" className="hover:text-[#005c55] transition-colors">Điều khoản sử dụng</a>
            <a href="#privacy" className="hover:text-[#005c55] transition-colors">Bảo mật thông tin</a>
            <a href="#contact" className="hover:text-[#005c55] transition-colors">Liên hệ hợp tác</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
