import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { syncAuthStateWithCookie, checkAuthSession, hasAuthCookie } from './infrastructure/utils/cookieUtils';

// Layouts
import CandidateLayout from './presentation/layouts/CandidateLayout';
import RecruiterLayout from './presentation/layouts/RecruiterLayout';
import AdminLayout from './presentation/layouts/AdminLayout';

// Candidate Pages
import HomePage from './presentation/pages/candidate/HomePage';
import JobListPage from './presentation/pages/candidate/JobListPage';
import JobDetailPage from './presentation/pages/candidate/JobDetailPage';
import JobApplicationPage from './presentation/pages/candidate/JobApplicationPage';
import JobSavePage from './presentation/pages/candidate/JobSavePage';
import CompanyPage from './presentation/pages/candidate/CompanyPage';
import CvListPage from './presentation/pages/candidate/CvListPage';
import InformationPage from './presentation/pages/candidate/InformationPage';
import CompanyInfomationPage from './presentation/pages/candidate/CompanyInfomationPage';
import CareerGuidePage from './presentation/pages/candidate/CareerGuidePage';
import LoginPage from './presentation/pages/candidate/LoginPage';
import RegisterPage from './presentation/pages/candidate/RegisterPage';
import ForgotPasswordPage from './presentation/pages/candidate/ForgotPasswordPage';

// Recruiter Pages
import RecruiterOverviewPage from './presentation/pages/recruiter/RecruiterOverviewPage';
import JobManagementPage from './presentation/pages/recruiter/JobManagementPage';
import JobDetailManagementPage from './presentation/pages/recruiter/JobDetailManagementPage';
import CandidateManagementPage from './presentation/pages/recruiter/CandidateManagementPage';
import MakePostJobPage from './presentation/pages/recruiter/MakePostJobPage';
import RecruiterLoginPage from './presentation/pages/recruiter/RecruiterLoginPage';
import RecruiterRegisterPage from './presentation/pages/recruiter/RecruiterRegisterPage';
import FirstCompanyInfoPage from './presentation/pages/recruiter/FirstCompanyInfoPage';
import RecruiterCompanyPage from './presentation/pages/recruiter/RecruiterCompanyPage';
import RecruiterOrdersPage from './presentation/pages/recruiter/RecruiterOrdersPage';
import CvSearchPage from './presentation/pages/recruiter/CvSearchPage';

// Admin Pages
import AdminOverviewPage from './presentation/pages/admin/AdminOverviewPage';
import AdminLoginPage from './presentation/pages/admin/AdminLoginPage';
import AccountManagementPage from './presentation/pages/admin/AccountManagementPage';
import CompanyManagementPage from './presentation/pages/admin/CompanyManagementPage';
import PostJobManagementPage from './presentation/pages/admin/PostJobManagementPage';
import ProvinceManagementPage from './presentation/pages/admin/ProvinceManagementPage';
import JobCategoryManagementPage from './presentation/pages/admin/JobCategoryManagementPage';
import FeaturePackageManagementPage from './presentation/pages/admin/FeaturePackageManagementPage';
import AdminOrderManagementPage from './presentation/pages/admin/AdminOrderManagementPage';
import FeedbackManagementPage from './presentation/pages/admin/FeedbackManagementPage';
import PaymentResultPage from './presentation/pages/payment/PaymentResultPage';

// Common Components
import ScrollToTop from './presentation/components/common/ScrollToTop';

export default function App() {
  useEffect(() => {
    // 0. Xóa hoàn toàn kiemjob_token cũ trong localStorage (nếu còn sót lại từ trước)
    try {
      localStorage.removeItem('kiemjob_token');
    } catch {}

    // 1. Kiểm tra cookie: Nếu không có cookie thì tự động xóa session cũ và chuyển về trạng thái khách
    syncAuthStateWithCookie();

    // 2. Nếu có cookie, gọi API xác minh tính hợp lệ với máy chủ
    if (hasAuthCookie()) {
      checkAuthSession().catch(() => {});
    }
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Candidate Portal Routes with unified Header & Footer */}
        <Route element={<CandidateLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/jobs" element={<JobListPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/applications" element={<JobApplicationPage />} />
          <Route path="/saved-jobs" element={<JobSavePage />} />
          <Route path="/companies" element={<CompanyPage />} />
          <Route path="/companies/:id" element={<CompanyInfomationPage />} />
          <Route path="/company-information" element={<CompanyInfomationPage />} />
          <Route path="/company-information/:id" element={<CompanyInfomationPage />} />
          <Route path="/cvs" element={<CvListPage />} />
          <Route path="/cvs/new" element={<Navigate to="/cvs" replace />} />
          <Route path="/cvs/:cvId/edit" element={<Navigate to="/cvs" replace />} />
          <Route path="/my-cv" element={<CvListPage />} />
          <Route path="/create-cv" element={<Navigate to="/cvs" replace />} />
          <Route path="/profile" element={<InformationPage />} />
          <Route path="/career-guide" element={<CareerGuidePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/recruiter/login" element={<RecruiterLoginPage />} />
          <Route path="/recruiter/register" element={<RecruiterRegisterPage />} />
        </Route>

        {/* Shared Forgot Password Route (Standalone Card - No Portal Header/Footer) */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/recruiter/forgot-password" element={<ForgotPasswordPage />} />

        {/* Payment Result & Success Pages (Standalone - No Portal Layout) */}
        <Route path="/payment/result" element={<PaymentResultPage />} />
        <Route path="/payment/success" element={<PaymentResultPage />} />

        {/* Recruiter Onboarding Routes */}
        <Route path="/recruiter/first-company-info" element={<FirstCompanyInfoPage />} />
        <Route path="/recruiter/onboarding" element={<FirstCompanyInfoPage />} />

        {/* Recruiter Portal Routes */}
        <Route path="/recruiter" element={<RecruiterLayout />}>
          <Route index element={<RecruiterOverviewPage />} />
          <Route path="jobs" element={<JobManagementPage />} />
          <Route path="jobs/:id" element={<JobDetailManagementPage />} />
          <Route path="candidates" element={<CandidateManagementPage />} />
          <Route path="cv-search" element={<CvSearchPage />} />
          <Route path="orders" element={<RecruiterOrdersPage />} />
          {/* Chuyển hướng các route chat cũ về tổng quan recruiter (Chat giờ đây là widget Messenger trên Header) */}
          <Route path="messages" element={<Navigate to="/recruiter" replace />} />
          <Route path="chat" element={<Navigate to="/recruiter" replace />} />
          <Route path="post-job" element={<MakePostJobPage />} />
          <Route path="company" element={<RecruiterCompanyPage />} />
          <Route path="company-info" element={<RecruiterCompanyPage />} />
        </Route>

        {/* Admin Login Route */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin Portal Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="accounts" element={<AccountManagementPage />} />
          <Route path="companies" element={<CompanyManagementPage />} />
          <Route path="posts" element={<PostJobManagementPage />} />
          <Route path="jobs" element={<PostJobManagementPage />} />
          <Route path="provinces" element={<ProvinceManagementPage />} />
          <Route path="categories" element={<JobCategoryManagementPage />} />
          <Route path="packages" element={<FeaturePackageManagementPage />} />
          <Route path="feature-packages" element={<FeaturePackageManagementPage />} />
          <Route path="invoices" element={<AdminOrderManagementPage />} />
          <Route path="orders" element={<AdminOrderManagementPage />} />
          <Route path="feedbacks" element={<FeedbackManagementPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
