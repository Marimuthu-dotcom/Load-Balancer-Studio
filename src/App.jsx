/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SimulationProvider } from './context/SimulationContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';

import Dashboard from './pages/Dashboard.jsx';
import SimulationStudio from './pages/SimulationStudio.jsx';
import ServerManagement from './pages/ServerManagement.jsx';
import RequestHistory from './pages/RequestHistory.jsx';
import AlgorithmComparison from './pages/AlgorithmComparison.jsx';
import SettingsPanel from './pages/SettingsPanel.jsx';
import TestSuite from './pages/TestSuite.jsx';
import UserFormPortal from './pages/UserFormPortal.jsx';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentTab} />;
      case 'userForm':
        return <UserFormPortal />;
      case 'studio':
        return <SimulationStudio />;
      case 'servers':
        return <ServerManagement />;
      case 'history':
        return <RequestHistory />;
      case 'algorithms':
        return <AlgorithmComparison />;
      case 'settings':
        return <SettingsPanel />;
      case 'tests':
        return <TestSuite />;
      default:
        return <Dashboard onNavigate={setCurrentTab} />;
    }
  };

  return (
    <SimulationProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#1e1e1e] text-[#cccccc]">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isMobileOpen={isMobileNavOpen}
          setIsMobileOpen={setIsMobileNavOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
            onOpenStudio={() => setCurrentTab('studio')}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {renderActivePage()}
            </div>
          </main>
        </div>
      </div>
    </SimulationProvider>
  );
}
