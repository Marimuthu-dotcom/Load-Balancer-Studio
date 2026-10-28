/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dynamic Live Simulation & Topology Monitor
 * Monitors real incoming requests from the User Portal (port 5174) and displays
 * actual routing paths, algorithmic decisions, and server fleet utilization.
 */

import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import { ALGORITHM_INFO } from '../engine/algorithms.js';
import {
  RotateCcw,
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
  Flame,
  Radio,
  ExternalLink
} from 'lucide-react';

export default function SimulationStudio() {
  const {
    servers,
    history,
    selectedAlgorithm,
    setSelectedAlgorithm,
    simulationStatus,
    activeRequests,
    queuedRequests,
    latestDecision,
    autoScaleAlert,
    stats,
    settings,
    initializeFleet,
    resetSimulation
  } = useSimulation();

  const [activeTab, setActiveTab] = useState('decision'); // 'decision' | 'queue' | 'stats'
  const [setupServerCount, setSetupServerCount] = useState(3);

  const currentAlgo = ALGORITHM_INFO[selectedAlgorithm] || ALGORITHM_INFO.ROUND_ROBIN;

  // Dynamically compute distinct real clients that have actually submitted requests
  const distinctClients = React.useMemo(() => {
    const map = new Map();
    [...activeRequests, ...history].forEach(req => {
      const cId = req.clientId || req.userId || req.clientName || 'Interactive Client';
      const cName = req.clientName || req.userName || cId;
      if (!map.has(cId)) {
        map.set(cId, {
          id: cId,
          name: cName,
          totalRequests: 0,
          activeRequests: 0,
          completedRequests: 0,
          latestRequestTitle: req.title || req.payloadDescription || 'Service Query'
        });
      }
      const item = map.get(cId);
      item.totalRequests++;
      if (req.status === 'processing') item.activeRequests++;
      if (req.status === 'completed') item.completedRequests++;
    });
    return Array.from(map.values());
  }, [activeRequests, history]);

  // Empty fleet state: Guide the user to deploy initial servers
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
              No backend servers are currently deployed. Configure your initial server fleet below to monitor incoming requests from the User Portal.
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
              onClick={() => initializeFleet({ serverCount: setupServerCount, clientCount: 0 })}
              className="w-full py-2.5 px-4 text-xs font-bold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Deploy {setupServerCount} Servers</span>
            </button>
          </div>

          <p className="text-[11px] text-[#71717a]">
            Requests originate from the separate User Application Portal on port 5174.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Elastic Auto-Scaling Notification Alert Banner */}
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

      {/* 1. Dynamic Routing & Algorithm Control Deck */}
      <div className="p-5 bg-[#252526] border border-[#2d2d30] rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#2d2d30]">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              Live Traffic & Topology Monitor
            </h2>
            <p className="text-xs text-[#858585] mt-0.5">
              Observing real requests submitted through User Portal (port 5174). No dummy clients or synthetic requests.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Authoritative Algorithm Selector (Controls Real Backend Routing) */}
            <div className="flex items-center gap-2 bg-[#18181b] border border-[#3e3e42] px-3 py-1.5 rounded-md">
              <span className="text-xs text-[#858585] font-medium">Active Algorithm:</span>
              <select
                value={selectedAlgorithm}
                onChange={(e) => setSelectedAlgorithm(e.target.value)}
                className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
                title="Authoritative Load Balancing Algorithm"
              >
                {Object.values(ALGORITHM_INFO).map((algo) => (
                  <option key={algo.id} value={algo.id} className="bg-[#252526] text-white">
                    {algo.name} ({algo.shortCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Clear / Reset In-Flight State */}
            <button
              onClick={resetSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-[#27272a] hover:bg-[#333338] border border-[#3f3f46] rounded-md transition-colors cursor-pointer"
              title="Reset in-flight request queues"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset State</span>
            </button>
          </div>
        </div>

        {/* Live Traffic Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-[#18181b] border border-[#2d2d30] rounded-lg">
            <span className="text-[11px] font-medium text-[#858585] block">Origin Clients</span>
            <div className="text-lg font-bold font-mono text-white tabular-nums">
              {distinctClients.length} <span className="text-xs text-[#71717a] font-normal">distinct</span>
            </div>
          </div>

          <div className="p-3 bg-[#18181b] border border-[#2d2d30] rounded-lg">
            <span className="text-[11px] font-medium text-[#858585] block">Total Real Requests</span>
            <div className="text-lg font-bold font-mono text-amber-400 tabular-nums">
              {stats.totalRequestsGenerated} <span className="text-xs text-[#71717a] font-normal">submitted</span>
            </div>
          </div>

          <div className="p-3 bg-[#18181b] border border-[#2d2d30] rounded-lg">
            <span className="text-[11px] font-medium text-[#858585] block">Active In-Flight</span>
            <div className="text-lg font-bold font-mono text-blue-400 tabular-nums">
              {activeRequests.length} <span className="text-xs text-[#71717a] font-normal">processing</span>
            </div>
          </div>

          <div className="p-3 bg-[#18181b] border border-[#2d2d30] rounded-lg">
            <span className="text-[11px] font-medium text-[#858585] block">Queued Buffer</span>
            <div className={`text-lg font-bold font-mono tabular-nums ${queuedRequests.length > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {queuedRequests.length} <span className="text-xs text-[#71717a] font-normal">waiting</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Visual Request Pipeline: Real Clients -> Load Balancer Hub -> Server Fleet */}
      <div className="p-6 bg-[#18181b] border border-[#27272a] rounded-xl relative overflow-hidden shadow-inner">
        <div className="flex items-center justify-between pb-4 border-b border-[#27272a] text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white tracking-wide">
              Live Topology Pipeline: Real Requests → Load Balancer → Active Servers
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-zinc-400">
              Active: <strong className="text-blue-400 font-bold">{activeRequests.length}</strong>
            </span>
            <span className="text-zinc-400">
              Queued: <strong className={queuedRequests.length > 0 ? 'text-amber-400' : 'text-zinc-500'}>{queuedRequests.length}</strong>
            </span>
          </div>
        </div>

        {/* 3-Column Visual Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-start">
          
          {/* Column 1: Origin Clients & Real User Requests (Col 1-4) */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="text-[10px] uppercase font-mono font-bold text-[#71717a] tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-blue-400" />
                Origin Clients ({distinctClients.length} Distinct)
              </span>
              <span className="text-[10px] text-zinc-500">
                User Portal Traffic
              </span>
            </div>

            {distinctClients.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-[#3e3e42] rounded-lg text-xs text-[#858585] space-y-2">
                <p className="font-medium text-[#cccccc]">Awaiting Client Requests</p>
                <p className="text-[11px] text-[#71717a]">
                  Submit requests through the User Application form (port 5174). Each submission will appear here in real time.
                </p>
              </div>
            ) : (
              distinctClients.map((client) => {
                const activeJobs = activeRequests.filter(
                  r => r.clientId === client.id || r.userId === client.id || r.clientName === client.name
                );

                return (
                  <div
                    key={client.id}
                    className={`p-3.5 rounded-lg border text-xs transition-all duration-200 relative ${
                      activeJobs.length > 0
                        ? 'bg-[#252526] border-[#f59e0b] shadow-md shadow-[#f59e0b]/10'
                        : 'bg-[#202023] border-[#3e3e42]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate max-w-[170px]">
                        {client.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#18181b] text-amber-400 border border-[#3e3e42]">
                        {client.totalRequests} reqs
                      </span>
                    </div>

                    <div className="text-[11px] text-[#888] truncate mt-1">
                      {client.latestRequestTitle}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#858585] mt-1.5 font-mono pt-1.5 border-t border-[#2a2a2e]">
                      <span>Completed: {client.completedRequests}</span>
                      {activeJobs.length > 0 && (
                        <span className="text-amber-400 font-bold animate-pulse">
                          ● {activeJobs.length} In-Flight
                        </span>
                      )}
                    </div>

                    {/* Connection Node */}
                    <span className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#18181b] ${
                      activeJobs.length > 0 ? 'bg-amber-400 animate-ping' : 'bg-blue-500'
                    }`} />
                  </div>
                );
              })
            )}
          </div>

          {/* Column 2: Load Balancer Hub & In-Flight Router (Col 5-7) */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center p-2">
            <div className="w-full bg-[#202023] border-2 border-amber-500/60 rounded-xl p-4 shadow-xl text-center space-y-3 relative">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Cpu className={`w-6 h-6 ${activeRequests.length > 0 ? 'animate-spin-slow' : ''}`} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white tracking-wide">
                  Load Balancer Gateway
                </h4>
                <span className="text-[11px] font-mono text-amber-400 font-medium">
                  {currentAlgo.name}
                </span>
              </div>

              {/* Dynamic status readout */}
              <div className="p-2.5 bg-[#18181b] border border-[#2d2d30] rounded-md text-[11px] space-y-1 text-left">
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
                  <span>In-Transit:</span>
                  <span className="text-blue-400 font-mono font-semibold">{activeRequests.length} streams</span>
                </div>
              </div>

              {/* In-Flight visual stream */}
              {activeRequests.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-center gap-1 animate-pulse">
                    <span>● Routing real requests to servers...</span>
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

          {/* Column 3: Servers with Managed Counters and Live Workload (Col 8-12) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-[10px] uppercase font-mono font-bold text-[#71717a] tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server className="w-3 h-3 text-emerald-400" />
                Target Server Fleet ({servers.length} nodes)
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                (Managed Loads & Concurrency)
              </span>
            </div>

            {servers.map((server) => {
              const active = server.activeRequests || 0;
              const conc = Math.max(1, server.concurrencyLimit || 1);
              const isOverloaded = active >= conc;
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
                  {/* Left Connection Node */}
                  <span className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#18181b] ${
                    isOverloaded ? 'bg-red-500 animate-ping' : active > 0 ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'
                  }`} />

                  {/* Server Card Header with Prominent Total Managed Counter */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{server.name}</span>
                        {server.isAutoScaled && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded font-semibold flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5" />
                            Auto-Replica
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#71717a] font-mono mt-0.5">
                        Weight: {server.weight} · Max Cap: {server.maxCapacity} · Concurrency: {server.concurrencyLimit}
                      </div>
                    </div>

                    {/* Total Managed Counter */}
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

                  {/* Active Job Processing Threads */}
                  {serverActiveJobs.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-[#2d2d30]">
                      <span className="text-[10px] font-mono text-[#858585] block">
                        Active Job Processing Threads ({serverActiveJobs.length}):
                      </span>

                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {serverActiveJobs.map(job => (
                          <div key={job.id} className="p-1.5 bg-[#18181b] border border-[#2d2d30] rounded text-[10px] font-mono flex items-center justify-between">
                            <span className="text-amber-300 font-semibold">{job.id}</span>
                            <span className="text-zinc-300 truncate max-w-[120px]">{job.title || job.clientName}</span>
                            <span className="text-emerald-400 font-medium">In-flight</span>
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
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                activeTab === 'decision' ? 'bg-[#27272a] text-white font-semibold' : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              Latest Decision
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                activeTab === 'queue' ? 'bg-[#27272a] text-white font-semibold' : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              Queue ({queuedRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
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
                    <span className="text-white font-medium">{latestDecision.clientName || latestDecision.userName}</span>
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
                Awaiting incoming requests. Submit a form in the User Portal (http://localhost:5174) to observe real-time algorithmic allocation.
              </div>
            )}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="space-y-2">
            <span className="text-xs text-[#858585]">Pending Request Buffer ({queuedRequests.length}):</span>
            {queuedRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#71717a] border border-dashed border-[#3e3e42] rounded">
                Queue is empty. All submitted traffic has been immediately admitted to server capacity.
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
              <span className="text-[#858585] block text-[11px]">Total Real Requests</span>
              <span className="text-base font-bold font-mono text-white">{stats.totalRequestsGenerated}</span>
            </div>
            <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded">
              <span className="text-[#858585] block text-[11px]">Auto-Scaled Replicas</span>
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
