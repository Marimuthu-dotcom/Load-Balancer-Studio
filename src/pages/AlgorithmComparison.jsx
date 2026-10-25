/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import {
  ALGORITHM_INFO,
  selectRoundRobin,
  selectWeightedRoundRobin,
  selectLeastConnections,
  selectWeightedLeastConnections,
  selectCapacityBased,
  selectLeastConnectionsWithLimits
} from '../engine/algorithms.js';
import {
  BarChart3,
  Scale,
  Play,
  RotateCcw,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Clock
} from 'lucide-react';

export default function AlgorithmComparison() {
  const { servers, clients } = useSimulation();

  // Benchmark parameters
  const [testRequestCount, setTestRequestCount] = useState(30);
  const [selectedAlgoKey, setSelectedAlgoKey] = useState('ROUND_ROBIN');
  const [isRunningComparison, setIsRunningComparison] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);

  const algorithmsList = Object.values(ALGORITHM_INFO);

  /**
   * Run Repeatable Deterministic Benchmark across algorithms
   * Uses identical initial state and identical request workloads
   */
  const handleRunComparativeBenchmark = () => {
    setIsRunningComparison(true);

    setTimeout(() => {
      const benchmarkResults = {};
      const targetAlgorithms = [
        'ROUND_ROBIN',
        'WEIGHTED_ROUND_ROBIN',
        'LEAST_CONNECTIONS',
        'WEIGHTED_LEAST_CONNECTIONS',
        'CAPACITY_BASED',
        'LEAST_CONNECTIONS_WITH_LIMITS'
      ];

      // Fixed synthetic request workload profile (same durations and arrival order)
      const testWorkload = [];
      const durations = [1500, 2500, 3500, 1000, 4000, 2000];
      for (let i = 0; i < testRequestCount; i++) {
        testWorkload.push({
          id: `bench-req-${i + 1}`,
          durationMs: durations[i % durations.length]
        });
      }

      targetAlgorithms.forEach((algoKey) => {
        // Deep clone initial servers configuration with 0 active requests
        const testServers = servers.map(s => ({
          ...s,
          activeRequests: 0,
          totalAssigned: 0,
          completedRequests: 0,
          failedRequests: 0
        }));

        const algoState = { roundRobinIndex: 0, wrrCurrentWeights: {} };
        const serverAssignedCounts = {};
        testServers.forEach(s => { serverAssignedCounts[s.id] = 0; });

        let rejectedCount = 0;
        let peakConcurrent = 0;

        // Simulate step-by-step dispatch
        testWorkload.forEach((req, stepIndex) => {
          let decision;
          switch (algoKey) {
            case 'ROUND_ROBIN':
              decision = selectRoundRobin(testServers, algoState);
              break;
            case 'WEIGHTED_ROUND_ROBIN':
              decision = selectWeightedRoundRobin(testServers, algoState);
              break;
            case 'LEAST_CONNECTIONS':
              decision = selectLeastConnections(testServers);
              break;
            case 'WEIGHTED_LEAST_CONNECTIONS':
              decision = selectWeightedLeastConnections(testServers);
              break;
            case 'CAPACITY_BASED':
              decision = selectCapacityBased(testServers);
              break;
            case 'LEAST_CONNECTIONS_WITH_LIMITS':
              decision = selectLeastConnectionsWithLimits(testServers);
              break;
            default:
              decision = selectRoundRobin(testServers, algoState);
          }

          if (decision.selectedServer) {
            const srv = testServers.find(s => s.id === decision.selectedServer.id);
            if (srv) {
              srv.activeRequests += 1;
              srv.totalAssigned += 1;
              serverAssignedCounts[srv.id]++;

              // Simulate partial completions periodically to simulate concurrency
              if (stepIndex % 3 === 0 && srv.activeRequests > 0) {
                srv.activeRequests -= 1;
                srv.completedRequests += 1;
              }
            }
          } else {
            rejectedCount++;
          }

          const currentTotalActive = testServers.reduce((sum, s) => sum + s.activeRequests, 0);
          if (currentTotalActive > peakConcurrent) {
            peakConcurrent = currentTotalActive;
          }
        });

        // Compute distribution percentages
        const totalAdmitted = testRequestCount - rejectedCount;
        const distributions = {};
        testServers.forEach(s => {
          const count = serverAssignedCounts[s.id] || 0;
          const share = totalAdmitted > 0 ? ((count / totalAdmitted) * 100).toFixed(1) : '0.0';
          distributions[s.id] = {
            name: s.name,
            weight: s.weight,
            count,
            percentage: share
          };
        });

        benchmarkResults[algoKey] = {
          name: ALGORITHM_INFO[algoKey].name,
          shortCode: ALGORITHM_INFO[algoKey].shortCode,
          totalAssigned: totalAdmitted,
          rejected: rejectedCount,
          peakConcurrent,
          avgDuration: '2416ms',
          distributions
        };
      });

      setComparisonResults(benchmarkResults);
      setIsRunningComparison(false);
    }, 300);
  };

  const selectedAlgoObj = ALGORITHM_INFO[selectedAlgoKey] || ALGORITHM_INFO.ROUND_ROBIN;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-lg bg-[#252526] border border-[#2d2d30]">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-400" />
          Load Balancing Algorithms & Comparative Studio
        </h2>
        <p className="text-xs text-[#a1a1aa] mt-0.5">
          Deep-dive into scheduling formulas, evaluate mathematical properties, and run controlled repeatable benchmarks.
        </p>
      </div>

      {/* Educational Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {algorithmsList.map((algo) => {
          const isSelected = selectedAlgoKey === algo.id;
          return (
            <div
              key={algo.id}
              onClick={() => setSelectedAlgoKey(algo.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-150 space-y-2.5 ${
                isSelected
                  ? 'bg-[#252526] border-[#f59e0b] shadow-md shadow-[#f59e0b]/5'
                  : 'bg-[#202023] border-[#2d2d30] hover:border-[#3e3e42]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{algo.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                  {algo.shortCode}
                </span>
              </div>

              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                {algo.description}
              </p>

              <div className="p-2 bg-[#18181b] border border-[#2d2d30] rounded font-mono text-[11px] text-zinc-300">
                <span className="text-[#71717a] block text-[10px] uppercase font-semibold">Formula:</span>
                <code>{algo.formula}</code>
              </div>

              <div className="text-[11px] text-[#858585] space-y-1 pt-1 border-t border-[#2d2d30]/60">
                <div>
                  <strong className="text-[#a1a1aa]">Ideal Workload:</strong> {algo.useCase}
                </div>
                <div>
                  <strong className="text-[#a1a1aa]">Algorithmic Complexity:</strong> {algo.complexity}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Repeatable Test Runner Section */}
      <div className="p-5 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2d2d30] pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              Repeatable Multi-Algorithm Benchmark Test
            </h3>
            <p className="text-xs text-[#a1a1aa]">
              Tests all 6 algorithms against the exact same initial server states, weights, and request arrivals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#858585]">
              <span>Workload:</span>
              <select
                value={testRequestCount}
                onChange={(e) => setTestRequestCount(Number(e.target.value))}
                className="bg-[#18181b] border border-[#3e3e42] rounded px-2 py-1 text-white text-xs font-mono"
              >
                <option value={15}>15 Requests</option>
                <option value={30}>30 Requests</option>
                <option value={60}>60 Requests</option>
                <option value={100}>100 Requests</option>
              </select>
            </div>

            <button
              onClick={handleRunComparativeBenchmark}
              disabled={isRunningComparison}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunningComparison ? 'Evaluating...' : 'Run Benchmark'}</span>
            </button>
          </div>
        </div>

        {/* Results Comparison Matrix */}
        {comparisonResults ? (
          <div className="space-y-4 animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#2d2d30] rounded overflow-hidden">
                <thead>
                  <tr className="bg-[#18181b] text-[#858585] font-mono text-[11px] border-b border-[#2d2d30]">
                    <th className="py-2.5 px-3">Algorithm</th>
                    {servers.map(s => (
                      <th key={s.id} className="py-2.5 px-3">
                        {s.name} (w: {s.weight})
                      </th>
                    ))}
                    <th className="py-2.5 px-3">Admitted</th>
                    <th className="py-2.5 px-3">Rejected</th>
                    <th className="py-2.5 px-3">Peak Concurrency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d2d30]">
                  {Object.entries(comparisonResults).map(([key, res]) => (
                    <tr key={key} className="hover:bg-[#202023] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        <div>{res.name}</div>
                        <span className="text-[10px] text-amber-400 font-mono">{res.shortCode}</span>
                      </td>

                      {servers.map(s => {
                        const dist = res.distributions[s.id];
                        return (
                          <td key={s.id} className="py-3 px-3 font-mono text-xs tabular-nums">
                            <div className="text-white font-medium">
                              {dist?.count || 0} reqs
                            </div>
                            <div className="text-[10px] text-[#858585]">
                              {dist?.percentage || '0.0'}%
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 font-mono text-emerald-400 font-semibold tabular-nums">
                        {res.totalAssigned}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums">
                        <span className={res.rejected > 0 ? 'text-red-400 font-semibold' : 'text-zinc-500'}>
                          {res.rejected}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-400 tabular-nums">
                        {res.peakConcurrent} concurrent
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Educational Disclaimer Note (Section 9 requirement) */}
            <div className="p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded text-xs text-[#858585] space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Educational Simulator Scope & Invariants:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#a1a1aa]">
                This frontend simulation runs in browser JavaScript to visually demonstrate algorithmic decision rules.
                Measurements represent simulated execution models under identical test constraints and are not physical network latency benchmarks.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#858585] border border-dashed border-[#3e3e42] rounded space-y-2">
            <p>Click "Run Benchmark" above to test all 6 algorithms against the current server topology.</p>
            <p className="text-[11px] text-[#71717a]">
              Results compare how each algorithm distributes the same batch of requests across Server A, B, and C.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
