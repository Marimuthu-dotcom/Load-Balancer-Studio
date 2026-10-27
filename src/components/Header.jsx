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
    socketConnected
  } = useSimulation();

  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = useState(false);
  const [demoLoadedNotification, setDemoLoadedNotification] = useState(false);

  const handleConfirmDemo = () => {
    loadDemoScenario();
    setDemoLoadedNotification(true);
    setTimeout(() => setDemoLoadedNotification(false), 3000);
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
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                  socketConnected
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                    : 'bg-amber-950/60 border-amber-800 text-amber-400'
                }`}
                title={socketConnected ? 'Connected to Socket.IO backend for real-time live events' : 'Connecting to Socket.IO...'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="hidden md:inline">{socketConnected ? 'Socket.IO Live' : 'Reconnecting...'}</span>
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
              Topology reset!
            </span>
          )}

          <button
            onClick={() => setIsDemoConfirmOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-700/60 rounded-md transition-colors"
            title="Reset server topology to 3 standard servers (Weights 5, 3, 2)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reset Fleet</span>
            <span className="sm:hidden">Reset</span>
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

      {/* Confirmation Modal for Fleet Reset */}
      <ConfirmModal
        isOpen={isDemoConfirmOpen}
        onClose={() => setIsDemoConfirmOpen(false)}
        onConfirm={handleConfirmDemo}
        title="Reset Server Fleet?"
        message="This will reset the simulator server topology to the standard educational demo setup: Server A (weight 5, capacity 10), Server B (weight 3, capacity 6), and Server C (weight 2, capacity 4). Inactive or queued requests will be cleared."
        confirmText="Reset Fleet"
      />
    </>
  );
}
