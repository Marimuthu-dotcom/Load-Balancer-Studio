/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import { ALGORITHM_INFO } from '../engine/algorithms.js';
import ServerLoadChart from '../components/ServerLoadChart.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
  Users,
  Server,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Plus,
  Play,
  RotateCcw,
  Zap,
  TrendingUp,
  Cpu,
  Flame
} from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const {
    stats,
    servers,
    clients,
    history,
    selectedAlgorithm,
    simulationStatus,
    loadDemoScenario,
    initializeFleet,
    sendOneRequest,
    resetSimulation
  } = useSimulation();

  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const currentAlgo = ALGORITHM_INFO[selectedAlgorithm] || ALGORITHM_INFO.ROUND_ROBIN;

  const recentRequests = history.slice(0, 6);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400">Completed</span>;
      case 'processing':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-400">Processing</span>;
      case 'queued':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-400">Queued</span>;
      case 'rejected':
      case 'failed':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/60 border border-red-800 text-red-400">Rejected</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Scenario Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-[#252526] border border-[#2d2d30] shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            System Topology Overview
            {stats.autoScaledServers > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                {stats.autoScaledServers} Auto-Scaled Replicas
              </span>
            )}
          </h2>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Active Algorithm:{' '}
            <span className="text-amber-400 font-semibold">{currentAlgo.name}</span>
            <span className="mx-2 text-[#52525b]">·</span>
            Status:{' '}
            <span className="font-mono text-white capitalize">{simulationStatus}</span>
            <span className="mx-2 text-[#52525b]">·</span>
            Elastic Scaling: <span className="text-emerald-400 font-medium">Automatic on Overload</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsDemoModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/80 rounded-md transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Demo Scenario</span>
          </button>

          <button
            onClick={() => onNavigate('studio')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-black" />
            <span>Launch Simulation Studio</span>
          </button>
        </div>
      </div>

      {/* Initial Setup Banner if fleet is empty */}
      {servers.length === 0 && (
        <div className="p-6 bg-[#252526] border border-amber-500/50 rounded-xl space-y-3 text-center sm:text-left sm:flex sm:items-center sm:justify-between shadow-lg shadow-amber-500/5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Simulator Fleet is Clean & Ready
            </h3>
            <p className="text-xs text-[#a1a1aa]">
              Click to deploy initial servers and clients, or navigate to Studio to configure your workload.
            </p>
          </div>
          <button
            onClick={() => initializeFleet({ serverCount: 3, clientCount: 4 })}
            className="px-4 py-2 text-xs font-bold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-colors cursor-pointer shrink-0"
          >
            Deploy 3 Servers & 4 Clients
          </button>
        </div>
      )}

      {/* Dynamic Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-1">
          <span className="text-[11px] font-medium text-[#858585]">Total Clients</span>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {stats.totalClients}
          </div>
          <span className="text-[10px] text-[#71717a]">Configured sources</span>
        </div>

        <div className="p-3 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-1">
          <span className="text-[11px] font-medium text-[#858585]">Total Servers</span>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {stats.totalServers}
          </div>
          <span className="text-[10px] text-[#71717a]">Nodes in fleet</span>
        </div>

        <div className="p-3 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-1">
          <span className="text-[11px] font-medium text-[#858585]">Auto-Scaled</span>
          <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
            {stats.autoScaledServers}
          </div>
          <span className="text-[10px] text-amber-500/80">Dynamic replicas</span>
        </div>

        <div className="p-3 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-1">
          <span className="text-[11px] font-medium text-[#858585]">Generated</span>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {stats.totalRequestsGenerated}
          </div>
          <span className="text-[10px] text-[#71717a]">Lifetime requests</span>
        </div>

        <div className="p-3 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-1">
          <span className="text-[11px] font-medium text-[#858585]">Pending Queue</span>
          <div className={`text-xl font-bold font-mono tabular-nums ${stats.pendingRequests > 0 ? 'text-amber-400' : 'text-[#858585]'}`}>
            {stats.pendingRequests}
          </div>
          <span className="text-[10px] text-[#71717a]">Waiting admission</span>
        </div>

        <div className="p-3 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-1">
          <span className="text-[11px] font-medium text-[#858585]">Active Load</span>
          <div className={`text-xl font-bold font-mono tabular-nums ${stats.activeRequests > 0 ? 'text-blue-400' : 'text-[#858585]'}`}>
            {stats.activeRequests}
          </div>
          <span className="text-[10px] text-[#71717a]">In-flight processing</span>
        </div>

        <div className="p-3 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-1">
          <span className="text-[11px] font-medium text-[#858585]">Completed</span>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            {stats.completedRequests}
          </div>
          <span className="text-[10px] text-emerald-500/80">Successful (200 OK)</span>
        </div>

        <div className="p-3 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-1">
          <span className="text-[11px] font-medium text-[#858585]">Rejected/Failed</span>
          <div className={`text-xl font-bold font-mono tabular-nums ${stats.failedRequests > 0 ? 'text-red-400' : 'text-[#858585]'}`}>
            {stats.failedRequests}
          </div>
          <span className="text-[10px] text-[#71717a]">Capacity dropped</span>
        </div>
      </div>

      {/* Main 2-Column Split: Server Load Distribution & Server Health Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Load Distribution Chart */}
        <div className="p-5 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">
                Request Assignment Distribution
              </h3>
            </div>
            <button
              onClick={() => onNavigate('algorithms')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              Compare Algorithms
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <ServerLoadChart servers={servers} />

          <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded text-xs space-y-1 text-[#858585]">
            <div className="font-medium text-[#cccccc] flex items-center justify-between">
              <span>Scheduling Rule: {currentAlgo.name}</span>
              <span className="font-mono text-amber-400 text-[11px]">{currentAlgo.shortCode}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#a1a1aa]">
              {currentAlgo.description}
            </p>
            <div className="font-mono text-[10px] text-zinc-400 bg-[#141416] p-1.5 rounded border border-[#27272a] mt-1">
              Formula: {currentAlgo.formula}
            </div>
          </div>
        </div>

        {/* Right: Server Health & Utilization Overview */}
        <div className="p-5 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">
                Server Fleet Utilization & Concurrency
              </h3>
            </div>
            <button
              onClick={() => onNavigate('servers')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              Manage Servers
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
            {servers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#858585] border border-dashed border-[#3e3e42] rounded-lg">
                No servers currently in fleet. Deploy servers to begin.
              </div>
            ) : (
              servers.map((server) => {
                const active = server.activeRequests || 0;
                const maxCap = Math.max(1, server.maxCapacity || 1);
                const conc = Math.max(1, server.concurrencyLimit || 1);
                const utilPercent = Math.min(100, Math.round((active / maxCap) * 100));

                let statusText = 'Normal';
                let statusColor = 'text-emerald-400';
                if (!server.enabled) {
                  statusText = 'Disabled';
                  statusColor = 'text-red-400';
                } else if (server.paused) {
                  statusText = 'Paused';
                  statusColor = 'text-amber-400';
                } else if (active >= conc) {
                  statusText = 'At Concurrency Limit';
                  statusColor = 'text-orange-400';
                }

                return (
                  <div key={server.id} className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{server.name}</span>
                        {server.isAutoScaled && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                            Replica
                          </span>
                        )}
                        <span className="text-[10px] text-[#858585] font-mono">ID: {server.id}</span>
                        <span className="text-[10px] text-amber-400 font-mono">w: {server.weight}</span>
                      </div>
                      <span className={`text-[11px] font-semibold font-mono ${statusColor}`}>
                        ● {statusText}
                      </span>
                    </div>

                    {/* Utilization Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[#a1a1aa]">
                        <span>
                          Active Connections: ({active} / {conc} concurrency)
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-white">
                          Total Managed: {server.totalAssigned || 0}
                        </span>
                      </div>
                      <div className="h-2 bg-[#141416] rounded-full overflow-hidden border border-[#27272a]">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            active >= conc
                              ? 'bg-red-500'
                              : active > 0
                              ? 'bg-emerald-500'
                              : 'bg-zinc-700'
                          }`}
                          style={{ width: `${Math.min(100, (active / conc) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Request Activity Table */}
      <div className="p-5 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              Recent Routing Decisions & Activity
            </h3>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            View Full Request History ({history.length})
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#3e3e42] rounded-lg text-xs text-[#858585] space-y-2">
            <p>No requests processed yet in this session.</p>
            <p className="text-[11px] text-[#71717a]">
              Navigate to Live Simulation Studio, select your clients, and click "Run Simulation".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2d2d30] text-[#858585] font-mono text-[11px]">
                  <th className="py-2 px-3">Request ID</th>
                  <th className="py-2 px-3">Client</th>
                  <th className="py-2 px-3">Assigned Server</th>
                  <th className="py-2 px-3">Algorithm</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Selection Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d30]/60">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#202023] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-amber-400 text-[11px]">{req.id}</td>
                    <td className="py-2.5 px-3 text-[#cccccc]">{req.clientName}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{req.serverName || '—'}</td>
                    <td className="py-2.5 px-3 text-[#a1a1aa] font-mono text-[11px]">{req.algorithm}</td>
                    <td className="py-2.5 px-3 font-mono text-[#a1a1aa]">{req.durationMs}ms</td>
                    <td className="py-2.5 px-3">{getStatusBadge(req.status)}</td>
                    <td className="py-2.5 px-3 text-[#a1a1aa] max-w-xs truncate text-[11px]" title={req.decisionExplanation}>
                      {req.decisionExplanation || req.failureReason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Demo Load */}
      <ConfirmModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onConfirm={loadDemoScenario}
        title="Load Standard Demo Scenario?"
        message="This will configure 5 standard clients and 3 servers (Server A: weight 5, max 10, concurrency 3; Server B: weight 3, max 6, concurrency 2; Server C: weight 2, max 4, concurrency 2). You can then run simulations and inspect routing decisions."
        confirmText="Load Scenario"
      />
    </div>
  );
}
