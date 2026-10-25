/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import { ALGORITHM_INFO } from '../engine/algorithms.js';
import { getStorageUsage } from '../storage/localStorage.js';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
  Settings,
  Sliders,
  Database,
  Trash2,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export default function SettingsPanel() {
  const {
    settings,
    setSettings,
    clearHistoryAction,
    resetSimulation,
    clearAllDataAction,
    loadDemoScenario
  } = useSimulation();

  // Storage metric
  const [storageUsage, setStorageUsage] = useState({ bytes: 0, kb: '0.00' });
  const [saveToast, setSaveToast] = useState(false);

  // Modals for the 3 distinct data deletion actions
  const [modalAction, setModalAction] = useState(null); // 'CLEAR_HISTORY' | 'RESET_COUNTERS' | 'CLEAR_ALL' | 'LOAD_DEMO'

  useEffect(() => {
    setStorageUsage(getStorageUsage());
  }, [settings]);

  const updateSettingField = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleConfirmAction = () => {
    if (modalAction === 'CLEAR_HISTORY') {
      clearHistoryAction();
    } else if (modalAction === 'RESET_COUNTERS') {
      resetSimulation();
    } else if (modalAction === 'CLEAR_ALL') {
      clearAllDataAction();
    } else if (modalAction === 'LOAD_DEMO') {
      loadDemoScenario();
    }
    setModalAction(null);
    setStorageUsage(getStorageUsage());
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="p-4 rounded-lg bg-[#252526] border border-[#2d2d30] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            Simulator Configuration & Storage
          </h2>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Tune global simulation parameters, admission queueing policy, and manage local storage states.
          </p>
        </div>

        {saveToast && (
          <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded">
            Settings auto-saved!
          </span>
        )}
      </div>

      {/* General Simulation Settings */}
      <div className="p-5 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2d2d30] pb-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          Simulation Engine Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Simulation Speed Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[#cccccc]">Simulation Speed Multiplier</label>
              <span className="font-mono text-amber-400 font-semibold">{settings.simulationSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="5"
              step="0.25"
              value={settings.simulationSpeed}
              onChange={(e) => updateSettingField('simulationSpeed', parseFloat(e.target.value))}
              className="w-full accent-[#f59e0b] cursor-pointer"
            />
            <span className="text-[10px] text-[#71717a] block">
              Higher speeds accelerate request transit and server processing timers.
            </span>
          </div>

          {/* Default Request Processing Duration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[#cccccc]">Default Processing Duration</label>
              <span className="font-mono text-white">{settings.defaultDurationMs}ms</span>
            </div>
            <input
              type="number"
              step="100"
              min="200"
              max="20000"
              value={settings.defaultDurationMs}
              onChange={(e) => updateSettingField('defaultDurationMs', Math.max(100, parseInt(e.target.value) || 1000))}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            />
            <span className="text-[10px] text-[#71717a] block">
              Simulated time each server spends processing an admitted HTTP request.
            </span>
          </div>

          {/* Default Algorithm */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#cccccc] block">Default Scheduling Algorithm</label>
            <select
              value={settings.defaultAlgorithm}
              onChange={(e) => updateSettingField('defaultAlgorithm', e.target.value)}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            >
              {Object.values(ALGORITHM_INFO).map((algo) => (
                <option key={algo.id} value={algo.id} className="bg-[#252526]">
                  {algo.name} ({algo.shortCode})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-[#71717a] block">
              Initial algorithm selected when opening the simulator.
            </span>
          </div>

          {/* Admission Control & Queueing Toggle */}
          <div className="space-y-1.5 p-3 bg-[#1e1e1e] border border-[#2d2d30] rounded-md">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white">Admission Queueing Policy</label>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                settings.queueingEnabled
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400'
                  : 'bg-red-950/60 border border-red-800 text-red-400'
              }`}>
                {settings.queueingEnabled ? 'Queue When Full' : 'Reject When Full'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="queue-toggle"
                checked={settings.queueingEnabled}
                onChange={(e) => updateSettingField('queueingEnabled', e.target.checked)}
                className="rounded bg-[#18181b] border-[#3e3e42] text-[#f59e0b]"
              />
              <label htmlFor="queue-toggle" className="text-xs text-[#cccccc] cursor-pointer">
                Buffer requests in a pending queue when all servers are at capacity/concurrency limit.
              </label>
            </div>
            <span className="text-[10px] text-[#71717a] block">
              If unchecked, requests hitting admission limits are immediately marked as rejected.
            </span>
          </div>

          {/* Elastic Auto-Scaling on Overload Toggle */}
          <div className="space-y-1.5 p-3 bg-[#1e1e1e] border border-amber-900/50 rounded-md">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white flex items-center gap-1.5">
                <span>⚡ Elastic Auto-Scaling</span>
              </label>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                settings.autoScaleOnOverload
                  ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
              }`}>
                {settings.autoScaleOnOverload ? 'Active (Dynamic)' : 'Disabled'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoscale-toggle"
                checked={settings.autoScaleOnOverload}
                onChange={(e) => updateSettingField('autoScaleOnOverload', e.target.checked)}
                className="rounded bg-[#18181b] border-[#3e3e42] text-[#f59e0b]"
              />
              <label htmlFor="autoscale-toggle" className="text-xs text-[#cccccc] cursor-pointer">
                Automatically create a new replica server when any server reaches 100% capacity.
              </label>
            </div>
            <span className="text-[10px] text-[#71717a] block">
              The new server's specifications (weight, capacity, concurrency) dynamically replicate the overloaded server.
            </span>
          </div>
        </div>
      </div>

      {/* LocalStorage Data & Deletion Management (Section 13) */}
      <div className="p-5 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-4">
        <div className="flex items-center justify-between border-b border-[#2d2d30] pb-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            LocalStorage State Management
          </h3>

          <div className="text-[11px] font-mono text-[#858585]">
            Used: <strong className="text-white">{storageUsage.kb} KB</strong>
          </div>
        </div>

        <p className="text-xs text-[#a1a1aa] leading-relaxed">
          The simulator persists your configured clients, servers, and request history locally inside your browser's namespaced{' '}
          <code className="text-amber-400 font-mono">localStorage</code>. This data does not send external requests or touch any remote backend.
        </p>

        {/* 3 Separate Deletion Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Action 1: Clear Request History */}
          <div className="p-3.5 bg-[#1e1e1e] border border-[#2d2d30] rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <span className="font-semibold text-white text-xs block">Action 1: Clear History Only</span>
              <p className="text-[11px] text-[#858585] mt-1 leading-relaxed">
                Deletes all request logs and audit records. Retains server fleet and client configurations.
              </p>
            </div>
            <button
              onClick={() => setModalAction('CLEAR_HISTORY')}
              className="w-full py-1.5 px-3 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/80 rounded transition-colors cursor-pointer"
            >
              Clear Request History
            </button>
          </div>

          {/* Action 2: Reset Simulation Counters */}
          <div className="p-3.5 bg-[#1e1e1e] border border-[#2d2d30] rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <span className="font-semibold text-white text-xs block">Action 2: Reset Counters</span>
              <p className="text-[11px] text-[#858585] mt-1 leading-relaxed">
                Clears transient active/pending requests and resets counters (total assigned, completed) back to zero.
              </p>
            </div>
            <button
              onClick={() => setModalAction('RESET_COUNTERS')}
              className="w-full py-1.5 px-3 text-xs font-medium text-zinc-300 bg-[#27272a] hover:bg-[#323238] border border-[#3f3f46] rounded transition-colors cursor-pointer"
            >
              Reset Simulation State
            </button>
          </div>

          {/* Action 3: Clear All Simulator Data */}
          <div className="p-3.5 bg-[#1e1e1e] border border-red-950/60 rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <span className="font-semibold text-red-400 text-xs block">Action 3: Clear All Data</span>
              <p className="text-[11px] text-[#858585] mt-1 leading-relaxed">
                Wipes all simulator localStorage keys and restores the application to pristine default factory state.
              </p>
            </div>
            <button
              onClick={() => setModalAction('CLEAR_ALL')}
              className="w-full py-1.5 px-3 text-xs font-medium text-red-400 hover:text-white bg-red-950/50 hover:bg-red-900 border border-red-800 rounded transition-colors cursor-pointer"
            >
              Clear All Simulator Data
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modals for Destructive Deletion Actions */}
      <ConfirmModal
        isOpen={modalAction === 'CLEAR_HISTORY'}
        onClose={() => setModalAction(null)}
        onConfirm={handleConfirmAction}
        title="Clear Request History?"
        message="Are you sure you want to delete all historical request records? Your configured clients and servers will remain untouched."
        confirmText="Clear History"
        isDanger={true}
      />

      <ConfirmModal
        isOpen={modalAction === 'RESET_COUNTERS'}
        onClose={() => setModalAction(null)}
        onConfirm={handleConfirmAction}
        title="Reset Simulation State?"
        message="This will immediately stop active timers, clear the pending queue, and reset server load counters to 0. Configured clients and servers are kept."
        confirmText="Reset State"
      />

      <ConfirmModal
        isOpen={modalAction === 'CLEAR_ALL'}
        onClose={() => setModalAction(null)}
        onConfirm={handleConfirmAction}
        title="Clear All Simulator Data?"
        message="WARNING: This will permanently delete all simulator keys (clients, servers, history, settings) from localStorage and re-initialize factory defaults. This action cannot be undone."
        confirmText="Wipe All Data"
        isDanger={true}
      />
    </div>
  );
}
