/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import { ALGORITHM_INFO } from '../engine/algorithms.js';
import ConfirmModal from './ConfirmModal.jsx';
import {
  Menu,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';

export default function Header({ onToggleMobileNav, onOpenStudio }) {
  const {
    simulationStatus,
    selectedAlgorithm,
    setSelectedAlgorithm,
    loadDemoScenario,
    sendOneRequest,
    clients,
    resetSimulation
  } = useSimulation();

  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = useState(false);
  const [demoLoadedNotification, setDemoLoadedNotification] = useState(false);

  const handleConfirmDemo = () => {
    loadDemoScenario();
    setDemoLoadedNotification(true);
    setTimeout(() => setDemoLoadedNotification(false), 3000);
  };

  const handleQuickSend = () => {
    const activeClient = clients.find(c => c.enabled) || clients[0];
    if (activeClient) {
      sendOneRequest({ clientId: activeClient.id });
    }
  };

  const statusColors = {
    idle: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    running: 'bg-emerald-950/80 text-emerald-400 border-emerald-800',
    paused: 'bg-amber-950/80 text-amber-400 border-amber-800',
    stopped: 'bg-red-950/80 text-red-400 border-red-800'
  };

  return (
    <>
      <header className="h-14 bg-[#18181b] border-b border-[#27272a] px-4 flex items-center justify-between gap-4 sticky top-0 z-30">
        {/* Left: Mobile hamburger & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileNav}
            className="p-1.5 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] rounded-md md:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white tracking-tight hidden sm:block">
              Network Load Balancing Simulator
            </h1>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border capitalize flex items-center gap-1 ${statusColors[simulationStatus] || statusColors.idle}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${simulationStatus === 'running' ? 'bg-emerald-400 animate-pulse' : simulationStatus === 'paused' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
                {simulationStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Algorithm selector quick dropdown */}
        <div className="hidden lg:flex items-center gap-2 bg-[#202023] border border-[#2d2d30] px-2.5 py-1 rounded-md">
          <span className="text-[11px] text-[#858585] font-medium">Algorithm:</span>
          <select
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(e.target.value)}
            className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
          >
            {Object.values(ALGORITHM_INFO).map((algo) => (
              <option key={algo.id} value={algo.id} className="bg-[#252526] text-white">
                {algo.name} ({algo.shortCode})
              </option>
            ))}
          </select>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2">
          {demoLoadedNotification && (
            <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded animate-fade-in hidden sm:inline">
              Demo scenario loaded!
            </span>
          )}

          <button
            onClick={() => setIsDemoConfirmOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-700/60 rounded-md transition-colors"
            title="Load standard 5 clients, 3 servers demo setup"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Load Demo Scenario</span>
            <span className="sm:hidden">Demo</span>
          </button>

          <button
            onClick={handleQuickSend}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 bg-[#27272a] hover:bg-[#333338] border border-[#3f3f46] rounded-md transition-colors"
            title="Dispatch 1 simulated request"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Send Request</span>
          </button>

          <button
            onClick={onOpenStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md shadow-xs transition-colors"
            title="Open Live Simulation Studio"
          >
            <Activity className="w-3.5 h-3.5 text-black" />
            <span>Studio</span>
          </button>
        </div>
      </header>

      {/* Confirmation Modal for Demo Scenario */}
      <ConfirmModal
        isOpen={isDemoConfirmOpen}
        onClose={() => setIsDemoConfirmOpen(false)}
        onConfirm={handleConfirmDemo}
        title="Load Demo Scenario?"
        message="This will reset the simulator to the standard educational demo scenario (5 clients, 3 servers with weights 5, 3, 2, and default 15 requests workload). Current transient active requests will be cleared."
        confirmText="Load Scenario"
      />
    </>
  );
}
