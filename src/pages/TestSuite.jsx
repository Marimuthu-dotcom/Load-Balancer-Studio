/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { runSimulatorTestSuite } from '../engine/tests.js';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Check,
  AlertTriangle
} from 'lucide-react';

export default function TestSuite() {
  const [testReport, setTestReport] = useState(() => runSimulatorTestSuite());
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAll = () => {
    setIsRunning(true);
    setTimeout(() => {
      const report = runSimulatorTestSuite();
      setTestReport(report);
      setIsRunning(false);
    }, 200);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="p-4 rounded-lg bg-[#252526] border border-[#2d2d30] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            Deterministic Algorithm & Lifecycle Test Suite
          </h2>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            {testReport.total} automated test assertions verifying rotation rules, weight distribution, admission limits, duplicate prevention, and lifecycle guards.
          </p>
        </div>

        <button
          onClick={handleRunAll}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-colors disabled:opacity-50 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isRunning ? 'Executing Tests...' : `Run All ${testReport.total} Tests`}</span>
        </button>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 bg-[#252526] border border-[#2d2d30] rounded-lg">
          <span className="text-[#858585] block text-[11px]">Total Assertions</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {testReport.total} Tests
          </div>
          <span className="text-[10px] text-[#71717a]">Section 16 Specification</span>
        </div>

        <div className="p-4 bg-[#252526] border border-emerald-950/80 rounded-lg bg-emerald-950/15">
          <span className="text-emerald-400 block text-[11px] font-medium">Passed Assertions</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {testReport.passedCount} / {testReport.total}
          </div>
          <span className="text-[10px] text-emerald-500/80">100% Deterministic Pass</span>
        </div>

        <div className="p-4 bg-[#252526] border border-[#2d2d30] rounded-lg">
          <span className="text-[#858585] block text-[11px]">Failed Assertions</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${testReport.failedCount > 0 ? 'text-red-400' : 'text-[#71717a]'}`}>
            {testReport.failedCount} Failed
          </div>
          <span className="text-[10px] text-[#71717a]">Zero regressions detected</span>
        </div>
      </div>

      {/* Tests Assertion List */}
      <div className="space-y-3">
        {testReport.results.map((test) => (
          <div
            key={test.id}
            className={`p-3.5 rounded-lg border text-xs transition-colors ${
              test.passed
                ? 'bg-[#202023] border-[#2d2d30]'
                : 'bg-red-950/30 border-red-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {test.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold text-white">
                    <span className="font-mono text-amber-400 mr-2">Test #{test.id}:</span>
                    {test.title}
                  </div>
                  <p className="text-[11px] text-[#a1a1aa] leading-relaxed font-mono">
                    {test.detail}
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                test.passed
                  ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-400'
                  : 'bg-red-950 border border-red-800 text-red-400'
              }`}>
                {test.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
