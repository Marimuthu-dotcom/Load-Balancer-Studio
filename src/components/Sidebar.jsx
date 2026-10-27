/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Server,
  FileText,
  BarChart3,
  Settings,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, isMobileOpen, setIsMobileOpen }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'userForm', label: 'User Request Form', icon: FileText, highlight: true },
    { id: 'studio', label: 'Live Simulation', icon: Radio },
    { id: 'servers', label: 'Server Management', icon: Server },
    { id: 'history', label: 'Request History', icon: FileText },
    { id: 'algorithms', label: 'Algorithms & Compare', icon: BarChart3 },
    { id: 'tests', label: 'Self-Test Suite', icon: CheckCircle2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelect = (id) => {
    setCurrentTab(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#18181b] border-r border-[#27272a] flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Zone */}
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-[#27272a] bg-[#141416]">
          <div className="w-7 h-7 rounded bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b] shadow-xs">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white tracking-wide truncate">
              LoadBalancer Studio
            </span>
            <span className="text-[10px] text-[#858585] truncate font-mono">
              Network Simulator v1.0
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          <div className="px-2 pb-1 text-[10px] font-semibold text-[#6e6e6e] uppercase tracking-wider">
            Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left relative ${
                  isActive
                    ? 'bg-[#27272a] text-white shadow-xs font-semibold'
                    : 'text-[#a1a1aa] hover:bg-[#202023] hover:text-[#d4d4d8]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#f59e0b] rounded-r" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-[#f59e0b]'
                      : item.highlight
                      ? 'text-[#fbbf24]'
                      : 'text-[#71717a]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {item.highlight && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.2 rounded bg-[#f59e0b]/20 border border-[#f59e0b]/40 text-[#f59e0b] font-mono">
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info box */}
        <div className="p-3 border-t border-[#27272a] bg-[#141416]/50">
          <div className="p-2.5 bg-[#18181b] border border-[#27272a] rounded text-[11px] space-y-1">
            <div className="flex items-center justify-between text-[#858585]">
              <span>API Gateway</span>
              <span className="text-[#10b981] font-mono">Port 3000</span>
            </div>
            <div className="flex items-center justify-between text-[#858585]">
              <span>User App</span>
              <a
                href={import.meta.env?.VITE_USER_APP_URL || (typeof window !== 'undefined' && window.location?.hostname ? `${window.location.protocol}//${window.location.hostname}:5174` : 'http://localhost:5174')}
                target="_blank"
                rel="noreferrer"
                className="text-[#f59e0b] hover:underline font-mono"
              >
                Port 5174 ↗
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
