/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import { ALGORITHM_INFO } from '../engine/algorithms.js';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Send,
  Zap,
  Activity,
  Cpu,
  Server,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Info,
  AlertTriangle,
  Sparkles,
  Plus,
  Flame,
  CheckSquare,
  Square as SquareIcon
} from 'lucide-react';

export default function SimulationStudio() {
  const {
    clients,
    servers,
    selectedAlgorithm,
    setSelectedAlgorithm,
    simulationStatus,
    activeRequests,
    queuedRequests,
    latestDecision,
    autoScaleAlert,
    stats,
    settings,
    setSettings,
    runMultiClientSimulation,
    sendOneRequest,
    initializeFleet,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    resetSimulation
  } = useSimulation();

  // Multi-client selection state (as requested: "The user can select how many client should send a request then after select the clients then click the run simulation btn")
  const [selectedClientIds, setSelectedClientIds] = useState(() => clients.map(c => c.id));
  const [requestsPerClient, setRequestsPerClient] = useState(2);
  const [customDuration, setCustomDuration] = useState(settings.defaultDurationMs || 2500);
  const [activeTab, setActiveTab] = useState('decision'); // 'decision' | 'queue' | 'stats'

  // Quick fleet setup inputs if empty
  const [setupServerCount, setSetupServerCount] = useState(3);
  const [setupClientCount, setSetupClientCount] = useState(4);

  // Sync selected clients when clients change
  useEffect(() => {
    if (clients.length > 0 && selectedClientIds.length === 0) {
      setSelectedClientIds(clients.map(c => c.id));
    }
  }, [clients]);

  const currentAlgo = ALGORITHM_INFO[selectedAlgorithm] || ALGORITHM_INFO.ROUND_ROBIN;

  const toggleClientSelection = (clientId) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    setSelectedClientIds(clients.map(c => c.id));
  };

  const deselectAllClients = () => {
    setSelectedClientIds([]);
  };

  const handleRunSimulation = () => {
    if (selectedClientIds.length === 0) return;
    runMultiClientSimulation({
      selectedClientIds,
      requestsPerClient: Number(requestsPerClient),
      durationMs: Number(customDuration),
      payloadDescription: 'Interactive workload'
    });
  };

  const handleSpeedChange = (speed) => {
    setSettings(prev => ({ ...prev, simulationSpeed: speed }));
  };

  const totalPlannedRequests = selectedClientIds.length * requestsPerClient;

  // Empty fleet state: Guide the user to deploy their fleet on demand
  if (servers.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-8 bg-[#252526] border border-[#2d2d30] rounded-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/5">
            <Cpu className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Initialize Simulator Fleet
            </h2>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              No default static servers are currently active. Configure your initial server fleet below to monitor incoming traffic.
            </p>
          </div>

          <div className="p-6 bg-[#18181b] border border-[#2d2d30] rounded-lg max-w-lg mx-auto text-left space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                Initial Server Fleet Count
              </label>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => setSetupServerCount(n)}
                    className={`flex-1 py-1.5 text-xs font-mono rounded border transition-colors ${
                      setupServerCount === n
                        ? 'bg-[#f59e0b] text-black font-bold border-[#f59e0b]'
                        : 'bg-[#252526] text-[#cccccc] border-[#3e3e42] hover:bg-[#2d2d30]'
                    }`}
                  >
                    {n} Servers
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => initializeFleet({ serverCount: setupServerCount, clientCount: 3 })}
              className="w-full py-2.5 px-4 text-xs font-bold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Deploy {setupServerCount} Servers</span>
            </button>
          </div>

          <p className="text-[11px] text-[#71717a]">
            You can configure servers from Server Management and submit client traffic from the User Portal (port 5174).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Auto-Scaling Notification Alert Banner */}
      {autoScaleAlert && (
        <div className="p-4 bg-amber-950/80 border-2 border-amber-500 rounded-lg text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500 text-black rounded font-bold">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block font-semibold">
                Elastic Auto-Scaler Triggered!
              </strong>
              <span>
                {autoScaleAlert.message}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-amber-900/60 px-2 py-1 rounded border border-amber-700/60">
            AUTO-EXPANDED FLEET
          </span>
        </div>
      )}

      {/* 1. Interactive Step-by-Step Simulation Control Deck */}
      <div className="p-5 bg-[#252526] border border-[#2d2d30] rounded-xl shadow-sm space-y-4">
        {/* Step 1: Select Active Clients */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center">
                1
              </span>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Select Origin Clients Sending Requests ({selectedClientIds.length} of {clients.length} selected)
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={selectAllClients}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                Select All
              </button>
              <span className="text-[#52525b]">·</span>
              <button
                onClick={deselectAllClients}
                className="text-[11px] text-[#858585] hover:text-[#cccccc] cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Client Selection Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {clients.map(client => {
              const isSelected = selectedClientIds.includes(client.id);
              return (
                <div
                  key={client.id}
                  onClick={() => toggleClientSelection(client.id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all duration-150 flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#1e1e1e] border-[#f59e0b] shadow-xs'
                      : 'bg-[#18181b]/60 border-[#2d2d30] text-[#71717a] hover:border-[#3e3e42]'
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className={`font-semibold truncate ${isSelected ? 'text-white' : 'text-[#71717a]'}`}>
                      {client.name}
                    </div>
                    <div className="text-[10px] text-[#858585] font-mono">{client.type}</div>
                  </div>
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#f59e0b] shrink-0" />
                  ) : (
                    <SquareIcon className="w-4 h-4 text-[#52525b] shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Workload & Algorithm Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#2d2d30]">
          <div>
            <label className="block text-[11px] text-[#858585] mb-1 font-medium">
              Requests per Selected Client
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={requestsPerClient}
              onChange={(e) => setRequestsPerClient(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#858585] mb-1 font-medium">
              Load Balancing Algorithm
            </label>
            <select
              value={selectedAlgorithm}
              onChange={(e) => setSelectedAlgorithm(e.target.value)}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            >
              {Object.values(ALGORITHM_INFO).map((algo) => (
                <option key={algo.id} value={algo.id} className="bg-[#252526]">
                  {algo.name} ({algo.shortCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[#858585] mb-1 font-medium">
              Processing Duration (ms)
            </label>
            <input
              type="number"
              step="200"
              min="200"
              max="20000"
              value={customDuration}
              onChange={(e) => setCustomDuration(Math.max(200, parseInt(e.target.value) || 1000))}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#858585] mb-1 font-medium">
              Simulation Playback Speed
            </label>
            <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded border border-[#2d2d30]">
              {[0.5, 1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`flex-1 py-1 text-[11px] font-mono rounded transition-colors ${
                    (settings.simulationSpeed || 1) === speed
                      ? 'bg-[#f59e0b] text-black font-semibold'
                      : 'text-[#858585] hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 3: Primary Action Bar with "Run Simulation" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#2d2d30]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#a1a1aa] font-mono">
              Workload Plan: <strong className="text-white">{selectedClientIds.length}</strong> clients × <strong className="text-white">{requestsPerClient}</strong> reqs = <strong className="text-amber-400">{totalPlannedRequests} total requests</strong>
            </span>
            {settings.autoScaleOnOverload && (
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-mono hidden md:inline">
                ⚡ Auto-Scaling Enabled
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {simulationStatus === 'running' ? (
              <button
                onClick={pauseSimulation}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 rounded-md transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : simulationStatus === 'paused' ? (
              <button
                onClick={resumeSimulation}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 rounded-md transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            ) : null}

            <button
              onClick={resetSimulation}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-300 bg-[#27272a] hover:bg-[#333338] border border-[#3f3f46] rounded-md transition-colors cursor-pointer"
              title="Reset in-flight simulation and counters"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset</span>
            </button>

            {/* Prominent Primary Run Simulation Button as Requested */}
            <button
              onClick={handleRunSimulation}
              disabled={selectedClientIds.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-black bg-[#f59e0b] hover:bg-[#fbbf24] active:scale-98 rounded-md transition-all shadow-md shadow-[#f59e0b]/20 disabled:opacity-40 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Run Simulation ({totalPlannedRequests} Requests)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Visual Request Pipeline: Clients -> Load Balancer Hub -> Server Fleet */}
      <div className="p-6 bg-[#18181b] border border-[#27272a] rounded-xl relative overflow-hidden shadow-inner">
        <div className="flex items-center justify-between pb-4 border-b border-[#27272a] text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white tracking-wide">
              Live Topology Pipeline: Clients → Load Balancer → Active Servers
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-zinc-400">
              In-Flight Active: <strong className="text-blue-400 font-bold">{activeRequests.length}</strong>
            </span>
            <span className="text-zinc-400">
              Queued: <strong className={queuedRequests.length > 0 ? 'text-amber-400' : 'text-zinc-500'}>{queuedRequests.length}</strong>
            </span>
          </div>
        </div>

        {/* 3-Column Visual Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-start">
          {/* Column 1: Origin Clients (Col 1-3) */}
          <div className="lg:col-span-3 space-y-2.5">
            <div className="text-[10px] uppercase font-mono font-bold text-[#71717a] tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-blue-400" />
                Origin Clients ({clients.length})
              </span>
            </div>

            {clients.map((client) => {
              const isSelected = selectedClientIds.includes(client.id);
              const activeCountForClient = activeRequests.filter(r => r.clientId === client.id).length;

              return (
                <div
                  key={client.id}
                  onClick={() => toggleClientSelection(client.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all duration-200 relative ${
                    activeCountForClient > 0
                      ? 'bg-[#252526] border-[#f59e0b] shadow-md shadow-[#f59e0b]/10'
                      : isSelected
                      ? 'bg-[#202023] border-[#3e3e42]'
                      : 'bg-[#18181b]/50 border-zinc-800 text-[#71717a] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate max-w-[140px]">{client.name}</span>
                    <span className="text-[10px] text-[#71717a] font-mono">{client.type}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#858585] mt-1 font-mono">
                    <span>Lifetime: {client.totalRequests || 0} reqs</span>
                    {activeCountForClient > 0 && (
                      <span className="text-amber-400 font-bold animate-pulse">
                        ● {activeCountForClient} Sending
                      </span>
                    )}
                  </div>

                  {/* Pulsing visual connection point */}
                  <span className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#18181b] ${
                    activeCountForClient > 0 ? 'bg-amber-400 animate-ping' : isSelected ? 'bg-blue-500' : 'bg-zinc-700'
                  }`} />
                </div>
              );
            })}
          </div>

          {/* Column 2: Load Balancer Hub & In-Flight Router (Col 4-6) */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center p-2">
            <div className="w-full bg-[#202023] border-2 border-amber-500/60 rounded-xl p-4 shadow-xl text-center space-y-3 relative">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Cpu className={`w-6 h-6 ${activeRequests.length > 0 ? 'animate-spin-slow' : ''}`} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white tracking-wide">
                  Load Balancer Gateway
                </h4>
                <span className="text-[10px] font-mono text-amber-400 font-medium">
                  {currentAlgo.name}
                </span>
              </div>

              {/* Dynamic status readout */}
              <div className="p-2 bg-[#18181b] border border-[#2d2d30] rounded-md text-[11px] space-y-1 text-left">
                <div className="flex justify-between text-[#858585]">
                  <span>Status:</span>
                  <span className="text-white capitalize font-mono">{simulationStatus}</span>
                </div>
                <div className="flex justify-between text-[#858585]">
                  <span>Queued Packets:</span>
                  <span className={`font-mono font-semibold ${queuedRequests.length > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                    {queuedRequests.length}
                  </span>
                </div>
                <div className="flex justify-between text-[#858585]">
                  <span>Routing Stream:</span>
                  <span className="text-blue-400 font-mono font-semibold">{activeRequests.length} in-transit</span>
                </div>
              </div>

              {/* In-Flight visual stream */}
              {activeRequests.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-center gap-1 animate-pulse">
                    <span>● Allocating traffic to servers...</span>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center max-h-24 overflow-y-auto">
                    {activeRequests.slice(0, 6).map(req => (
                      <span
                        key={req.id}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#18181b] border border-[#3e3e42] text-amber-300"
                      >
                        {req.id} → {req.serverName?.split(' ')[1] || 'Srv'}
                      </span>
                    ))}
                    {activeRequests.length > 6 && (
                      <span className="text-[9px] text-[#71717a]">+{activeRequests.length - 6}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Servers with "How many request each server manage" and live progress bars (Col 7-12) */}
          <div className="lg:col-span-6 space-y-3">
            <div className="text-[10px] uppercase font-mono font-bold text-[#71717a] tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server className="w-3 h-3 text-emerald-400" />
                Target Server Fleet ({servers.length} nodes)
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                (Real-time managed loads & concurrency)
              </span>
            </div>

            {servers.map((server) => {
              const active = server.activeRequests || 0;
              const maxCap = Math.max(1, server.maxCapacity || 1);
              const conc = Math.max(1, server.concurrencyLimit || 1);
              const isOverloaded = active >= conc;
              const utilPercent = Math.min(100, Math.round((active / maxCap) * 100));

              // Active requests specifically assigned to this server
              const serverActiveJobs = activeRequests.filter(r => r.serverId === server.id);

              return (
                <div
                  key={server.id}
                  className={`p-3.5 rounded-lg border text-xs transition-all duration-300 relative space-y-2.5 ${
                    isOverloaded
                      ? 'bg-red-950/20 border-red-700/80 shadow-lg shadow-red-900/10'
                      : server.isAutoScaled
                      ? 'bg-[#252526] border-amber-500/80 shadow-md'
                      : active > 0
                      ? 'bg-[#222225] border-emerald-500/70 shadow-sm'
                      : 'bg-[#1e1e1e] border-[#2d2d30]'
                  }`}
                >
                  {/* Left connection node */}
                  <span className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#18181b] ${
                    isOverloaded ? 'bg-red-500 animate-ping' : active > 0 ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'
                  }`} />

                  {/* Server Card Header with prominent "Total Managed" counter */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{server.name}</span>
                        {server.isAutoScaled && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded font-semibold flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5" />
                            Auto-Scaled Replica
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#71717a] font-mono mt-0.5">
                        Weight: {server.weight} · Max Cap: {server.maxCapacity} · Concurrency: {server.concurrencyLimit}
                      </div>
                    </div>

                    {/* Prominent Counter: Exactly as requested ("And the server should shown How many request each server manage") */}
                    <div className="text-right">
                      <div className="p-1 px-2.5 bg-[#141416] border border-[#2d2d30] rounded font-mono text-center">
                        <span className="text-[10px] text-[#858585] block font-sans">Total Managed</span>
                        <span className="text-base font-bold text-amber-400 tabular-nums">
                          {server.totalAssigned || 0} reqs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Concurrency and Overload Gauge */}
                  <div className="space-y-1 bg-[#141416] p-2.5 rounded border border-[#27272a]">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#a1a1aa]">
                        Active Connections: <strong className={isOverloaded ? 'text-red-400 font-bold' : 'text-white'}>{active}</strong> / {conc} limit
                      </span>
                      <span className={isOverloaded ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {isOverloaded ? '⚠ OVERLOADED' : `${server.completedRequests || 0} Completed`}
                      </span>
                    </div>

                    <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden border border-[#2d2d30]">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isOverloaded ? 'bg-red-500' : active > 0 ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                        style={{ width: `${Math.min(100, (active / conc) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Visual Request Processing: Live animated progress bars for active jobs */}
                  {serverActiveJobs.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-[#2d2d30]">
                      <span className="text-[10px] font-mono text-[#858585] block">
                        Active Job Processing Threads ({serverActiveJobs.length}):
                      </span>

                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {serverActiveJobs.map(job => (
                          <div key={job.id} className="p-1.5 bg-[#18181b] border border-[#2d2d30] rounded text-[10px] font-mono space-y-1">
                            <div className="flex justify-between items-center text-zinc-300">
                              <span className="text-amber-300 font-semibold">{job.id}</span>
                              <span className="text-[#a1a1aa]">{job.progress || 0}%</span>
                            </div>
                            <div className="h-1 bg-[#141416] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-linear-to-r from-amber-500 to-emerald-400 transition-all duration-100"
                                style={{ width: `${job.progress || 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Live Request Decision Panel & Inspector */}
      <div className="p-5 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-4">
        <div className="flex items-center justify-between border-b border-[#2d2d30] pb-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              Live Allocation Trace & Algorithmic Reason
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-[#18181b] p-0.5 rounded border border-[#2d2d30]">
            <button
              onClick={() => setActiveTab('decision')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                activeTab === 'decision' ? 'bg-[#27272a] text-white font-semibold' : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              Latest Decision
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                activeTab === 'queue' ? 'bg-[#27272a] text-white font-semibold' : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              Queue ({queuedRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                activeTab === 'stats' ? 'bg-[#27272a] text-white font-semibold' : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              Fleet Summary
            </button>
          </div>
        </div>

        {activeTab === 'decision' && (
          <div>
            {latestDecision ? (
              <div className="space-y-3">
                <div className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                  latestDecision.didAutoScale
                    ? 'bg-amber-950/40 border-amber-600 text-amber-200'
                    : latestDecision.selectedServer
                    ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                    : 'bg-red-950/30 border-red-800/80 text-red-200'
                }`}>
                  <div className="font-semibold text-white mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      {latestDecision.didAutoScale && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                      Routing Outcome:
                    </span>
                    <span className="font-mono text-[11px] text-[#858585]">
                      {new Date(latestDecision.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {latestDecision.explanation}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded">
                    <span className="text-[#858585] block text-[11px]">Request ID</span>
                    <span className="font-mono text-amber-400 font-semibold">{latestDecision.requestId}</span>
                  </div>
                  <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded">
                    <span className="text-[#858585] block text-[11px]">Origin Client</span>
                    <span className="text-white font-medium">{latestDecision.clientName}</span>
                  </div>
                  <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded">
                    <span className="text-[#858585] block text-[11px]">Evaluated Rule</span>
                    <span className="text-white font-medium">{latestDecision.algorithm?.name}</span>
                  </div>
                  <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded">
                    <span className="text-[#858585] block text-[11px]">Target Destination</span>
                    <span className="text-emerald-400 font-bold">
                      {latestDecision.selectedServer?.name || 'Queued / Rejected'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#858585] border border-dashed border-[#3e3e42] rounded">
                Click "Run Simulation" above to observe the load balancer routing requests and auto-scaling when overloaded.
              </div>
            )}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="space-y-2">
            <span className="text-xs text-[#858585]">Pending Request Buffer ({queuedRequests.length}):</span>
            {queuedRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#71717a] border border-dashed border-[#3e3e42] rounded">
                Queue is empty. Traffic was admitted without bottleneck delays.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {queuedRequests.map((req, i) => (
                  <div key={req.id} className="p-2.5 bg-[#1e1e1e] border border-amber-900/60 rounded flex justify-between text-xs font-mono">
                    <span className="text-amber-400 font-bold">#{i + 1} {req.id}</span>
                    <span className="text-amber-200">Waiting for server capacity...</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded">
              <span className="text-[#858585] block text-[11px]">Total Generated</span>
              <span className="text-base font-bold font-mono text-white">{stats.totalRequestsGenerated}</span>
            </div>
            <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded">
              <span className="text-[#858585] block text-[11px]">Auto-Scaled Servers</span>
              <span className="text-base font-bold font-mono text-amber-400">{stats.autoScaledServers}</span>
            </div>
            <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded">
              <span className="text-[#858585] block text-[11px]">Completed Requests</span>
              <span className="text-base font-bold font-mono text-emerald-400">{stats.completedRequests}</span>
            </div>
            <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded">
              <span className="text-[#858585] block text-[11px]">Active In-Flight</span>
              <span className="text-base font-bold font-mono text-blue-400">{stats.activeRequests}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
