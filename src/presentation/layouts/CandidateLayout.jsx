import React from 'react';
import { Outlet } from 'react-router-dom';
import CandidateHeader from '../components/candidate/CandidateHeader';
import CandidateFooter from '../components/candidate/CandidateFooter';
import FloatingWidgets from '../components/candidate/FloatingWidgets';
import { ChatProvider } from '../../application/context/ChatContext';
import { NotificationProvider } from '../../application/context/NotificationContext';
import NotificationToast from '../components/notification/NotificationToast';

export default function CandidateLayout() {
  return (
    <NotificationProvider>
      <ChatProvider>
        <div className="min-h-screen flex flex-col bg-[#faf8ff] text-[#131b2e]">
          <CandidateHeader />
          <main className="flex-1 pt-16 lg:pt-20">
            <Outlet />
          </main>
          <CandidateFooter />
          {/* Floating action widgets (góp ý, nhắn tin Facebook style) */}
          <FloatingWidgets />
          <NotificationToast userRole="candidate" />
        </div>
      </ChatProvider>
    </NotificationProvider>
  );
}

