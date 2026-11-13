import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function CareerGuidePage() {
  const [grossSalary, setGrossSalary] = useState(30000000);
  const [dependents, setDependents] = useState(0);

  // Simplified Gross to Net calculation for demo
  const calculateNet = () => {
    const insurance = grossSalary * 0.105; // BHXH, BHYT, BHTN ~ 10.5%
    const taxableIncome = Math.max(0, grossSalary - insurance - 11000000 - dependents * 4400000);
    let tax = 0;
    if (taxableIncome > 0) {
      if (taxableIncome <= 5000000) tax = taxableIncome * 0.05;
      else if (taxableIncome <= 10000000) tax = taxableIncome * 0.1 - 250000;
      else if (taxableIncome <= 18000000) tax = taxableIncome * 0.15 - 750000;
      else tax = taxableIncome * 0.2 - 1650000;
    }
    return Math.round(grossSalary - insurance - tax);
  };

  const articles = [
    {
      id: 'art-1',
      title: 'Bí quyết đàm phán lương BigTech: Làm sao để tăng 25% Offer mà không bị mất lòng NTD?',
      category: 'Đàm phán đãi ngộ',
      readTime: '5 phút đọc',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80',
      summary: 'Phân tích cấu trúc Total Compensation tại MoMo, VNG, FPT và cách sử dụng các Offer cạnh tranh làm đòn bẩy thương lượng.'
    },
    {
      id: 'art-2',
      title: 'Tổng hợp 50 câu hỏi System Design & Web Vitals phỏng vấn vị trí Senior Frontend 2026',
      category: 'Kinh nghiệm phỏng vấn',
      readTime: '8 phút đọc',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
      summary: 'Từ tối ưu hóa Core Web Vitals (LCP, FID, CLS) đến kiến trúc Micro-frontend với Module Federation và SSR/SSG.'
    },
    {
      id: 'art-3',
      title: 'Báo cáo xu hướng thị trường tuyển dụng IT Việt Nam 2026: Làn sóng AI & Cloud Engineer',
      category: 'Thị trường IT',
      readTime: '6 phút đọc',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
      summary: 'Mức lương trung bình của các kỹ sư Golang, AI/ML và DevOps tiếp tục thiết lập mức trần mới trong năm 2026.'
    }
  ];

  return (
    <div className="w-full bg-[#faf8ff] min-h-screen pb-16">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#005c55] to-[#007952] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#9cf2e8]">
            KiemJob Career Advisory
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Cẩm Nang Sự Nghiệp &amp; Công Cụ Tiện Ích
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-2xl">
            Trang bị kiến thức thực chiến, định hướng phát triển sự nghiệp và sử dụng các công cụ tính lương Gross sang Net chuẩn xác nhất.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
        {/* Gross to Net Interactive Calculator Tool */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#eaedff] shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#eaedff] flex items-center justify-center text-[#005c55]">
              <span className="material-symbols-outlined text-[24px]">calculate</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#131b2e]">Công cụ tính lương Gross sang Net (Chuẩn luật thuế 2026)</h2>
              <p className="text-xs text-[#6e7977]">Áp dụng mức giảm trừ gia cảnh mới nhất cho cá nhân và người phụ thuộc</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="text-xs font-bold text-[#131b2e] block mb-1">Mức lương Gross (VNĐ)</label>
              <input
                type="number"
                value={grossSalary}
                onChange={(e) => setGrossSalary(Number(e.target.value))}
                className="w-full p-3 bg-[#f2f3ff] rounded-2xl text-sm font-bold text-[#131b2e] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#131b2e] block mb-1">Số người phụ thuộc</label>
              <input
                type="number"
                value={dependents}
                onChange={(e) => setDependents(Number(e.target.value))}
                className="w-full p-3 bg-[#f2f3ff] rounded-2xl text-sm font-bold text-[#131b2e] outline-none"
              />
            </div>
            <div className="p-4 rounded-2xl bg-[#97f5cc]/30 border border-[#97f5cc] flex flex-col justify-between">
              <span className="text-xs font-bold text-[#00513a]">Lương Net thực nhận dự kiến</span>
              <span className="text-2xl font-extrabold text-[#005c55] mt-1">
                {calculateNet().toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          </div>
        </section>

        {/* Featured Career Articles */}
        <section>
          <h2 className="text-2xl font-bold text-[#131b2e] mb-6">Bài viết chuyên sâu mới nhất</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {articles.map((art) => (
              <article
                key={art.id}
                className="bg-white rounded-3xl overflow-hidden border border-[#eaedff] shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 overflow-hidden">
                    <img
                      src={art.image}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-[#6e7977] mb-2">
                      <span className="font-bold text-[#005c55]">{art.category}</span>
                      <span>{art.readTime}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#131b2e] group-hover:text-[#005c55] transition-colors line-clamp-2">
                      {art.title}
                    </h3>
                    <p className="text-xs text-[#3e4947] mt-2 line-clamp-3 leading-relaxed">
                      {art.summary}
                    </p>
                  </div>
                </div>
                <div className="p-5 pt-0">
                  <span className="text-xs font-bold text-[#005c55] group-hover:underline inline-flex items-center gap-1">
                    <span>Đọc tiếp</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
