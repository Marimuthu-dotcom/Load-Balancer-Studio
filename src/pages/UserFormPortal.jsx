/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Integrated User Request Portal
 * Allows testing single-request form submission directly inside the Load Balancer portal
 * or externally on port 5174.
 */

import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Server,
  Cpu,
  Layers,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileText,
  User,
  Activity,
  Zap,
  Info
} from 'lucide-react';

const PRESET_USERS = [
  { id: 'usr-1', name: 'Alex Rivera (Data Analyst)', department: 'Analytics' },
  { id: 'usr-2', name: 'Elena Chen (Lead Engineer)', department: 'Platform' },
  { id: 'usr-3', name: 'Marcus Brody (Finance Officer)', department: 'Finance' },
  { id: 'usr-4', name: 'Sophia Miller (Operations)', department: 'Operations' },
  { id: 'usr-custom', name: 'Custom User...', department: 'Other' }
];

const REQUEST_TYPES = [
  { id: 'analytics', label: 'Data Analytics Query', defaultWeight: 2, icon: '📊', estDuration: '2.5s' },
  { id: 'report', label: 'Executive Financial Report', defaultWeight: 3, icon: '📑', estDuration: '3.0s' },
  { id: 'upload', label: 'File Ingestion & Indexing', defaultWeight: 2, icon: '📤', estDuration: '2.0s' },
  { id: 'checkout', label: 'Order Processing Transaction', defaultWeight: 1, icon: '💳', estDuration: '1.5s' },
  { id: 'batch_compute', label: 'Heavy Batch Compute Job', defaultWeight: 5, icon: '⚡', estDuration: '4.0s' },
  { id: 'sync', label: 'Database Replication Sync', defaultWeight: 2, icon: '🔄', estDuration: '2.2s' }
];

export default function UserFormPortal() {
  const { submitFormRequest, latestDecision, servers, selectedAlgorithm } = useSimulation();

  // Form State
  const [selectedUserPreset, setSelectedUserPreset] = useState('usr-1');
  const [userName, setUserName] = useState('Alex Rivera');
  const [department, setDepartment] = useState('Analytics');
  const [requestType, setRequestType] = useState('analytics');
  const [requestTitle, setRequestTitle] = useState('Quarterly Inventory Audit');
  const [requestPayload, setRequestPayload] = useState('Process transactions and reconcile warehouse inventory levels.');
  const [workloadUnits, setWorkloadUnits] = useState(2);
  const [priority, setPriority] = useState('normal');

  // Submission & Tracking State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState(null);
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [localHistory, setLocalHistory] = useState([]);

  // Handle Preset User Change
  const handleUserPresetChange = (presetId) => {
    setSelectedUserPreset(presetId);
    const found = PRESET_USERS.find(u => u.id === presetId);
    if (found && presetId !== 'usr-custom') {
      setUserName(found.name.split(' (')[0]);
      setDepartment(found.department);
    }
  };

  // Handle Request Type Change
  const handleRequestTypeChange = (typeId) => {
    setRequestType(typeId);
    const found = REQUEST_TYPES.find(t => t.id === typeId);
    if (found) {
      setWorkloadUnits(found.defaultWeight);
      if (!requestTitle || REQUEST_TYPES.some(t => t.label === requestTitle)) {
        setRequestTitle(found.label);
      }
    }
  };

  // Handle Form Submission: Strict 1 Form Submit = 1 Request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitFeedback(null);
    setIsSubmitting(true);

    const idempotencyKey = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const payload = {
      clientName: userName.trim() || 'Anonymous Requester',
      department: department.trim() || 'General',
      requestType,
      title: requestTitle.trim() || 'Transactional Request',
      description: requestPayload.trim() || 'Standard operational task.',
      workloadUnits: Number(workloadUnits) || 1,
      priority,
      idempotencyKey
    };

    try {
      const result = await submitFormRequest(payload);
      const reqRecord = result?.request || result;
      setLastSubmittedRequest(reqRecord);
      setLocalHistory(prev => [reqRecord, ...prev.slice(0, 9)]);

      setSubmitFeedback({
        type: reqRecord?.status === 'rejected' ? 'error' : 'success',
        message: reqRecord?.status === 'rejected'
          ? `Request rejected: ${reqRecord?.decisionExplanation || 'Fleet capacity exceeded'}`
          : `Request successfully dispatched to ${reqRecord?.serverName || 'Server Fleet'}!`
      });
    } catch (err) {
      setSubmitFeedback({
        type: 'error',
        message: err.message || 'Failed to communicate with Load Balancer API.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Explaining the User Application Role */}
      <div className="bg-[#252526] rounded-xl border border-[#333333] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-base font-semibold text-white">
                Standalone Client User Application
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                Port 5174 / User Form
              </span>
            </div>
            <p className="text-xs text-[#8c8c8c]">
              This form acts as an authentic end-user application. Submitting the form dispatches exactly 1 real request to the Load Balancer.
              Active Algorithm: <span className="text-amber-400 font-mono font-semibold">{selectedAlgorithm}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={import.meta.env?.VITE_USER_APP_URL || (typeof window !== 'undefined' && window.location?.hostname ? `${window.location.protocol}//${window.location.hostname}:5174` : 'http://localhost:5174')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c] text-xs text-amber-400 hover:text-amber-300 hover:border-amber-500/50 transition-colors"
            >
              <span>Open Standalone User App (Port 5174)</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Main Grid: Form on Left, Decision & History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#252526] rounded-xl border border-[#333333] shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#333333] bg-[#2a2d2e] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText size={16} className="text-amber-400" />
                  Request Submission Form
                </h2>
                <p className="text-xs text-[#8c8c8c]">
                  1 form submit = exactly 1 transaction routed according to server capacity & concurrency.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                1 Submit = 1 Request
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Row 1: Identity & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center gap-1.5">
                    <User size={13} className="text-amber-400" />
                    Requester Identity / Role
                  </label>
                  <select
                    value={selectedUserPreset}
                    onChange={(e) => handleUserPresetChange(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white"
                  >
                    {PRESET_USERS.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                    User Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Row 2: Department & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                    Department / Unit
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Analytics, Engineering"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                    Traffic Class / Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white"
                  >
                    <option value="normal">Standard Priority</option>
                    <option value="high">High Priority (SLA guaranteed)</option>
                    <option value="batch">Low Priority (Background)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Request Type Selection */}
              <div>
                <label className="block text-xs font-medium text-[#cccccc] mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-400" />
                    Request Operation Type
                  </span>
                  <span className="text-[11px] text-[#888]">Preset Workload Configuration</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {REQUEST_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleRequestTypeChange(t.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        requestType === t.id
                          ? 'border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-500/30'
                          : 'border-[#333333] bg-[#1e1e1e] text-[#a0a0a0] hover:border-[#444444]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{t.icon}</span>
                        <span className="text-xs font-medium truncate">{t.label}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-[#777] font-mono">
                        <span>{t.defaultWeight} units</span>
                        <span>{t.estDuration}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Title & Workload Units */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                    Request Title
                  </label>
                  <input
                    type="text"
                    required
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    placeholder="e.g. Process Monthly Batch"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center justify-between">
                    <span>Workload Units</span>
                    <span className="text-[10px] font-mono text-amber-400">{workloadUnits} / 10</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={workloadUnits}
                      onChange={(e) => setWorkloadUnits(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#333] rounded"
                    />
                    <span className="w-8 text-center text-xs font-mono font-bold text-amber-400 bg-[#1e1e1e] border border-[#333] py-1 rounded">
                      {workloadUnits}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 5: Detailed Payload */}
              <div>
                <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                  Payload Specification
                </label>
                <textarea
                  rows={2}
                  value={requestPayload}
                  onChange={(e) => setRequestPayload(e.target.value)}
                  placeholder="Task parameters or query statement..."
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              {/* Feedback Alert */}
              {submitFeedback && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    submitFeedback.type === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {submitFeedback.type === 'error' ? (
                    <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                  ) : (
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                  )}
                  <span>{submitFeedback.message}</span>
                </div>
              )}

              {/* Submit & Idempotency Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#333333]">
                <div className="text-[11px] text-[#777] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Strict single submission: Button locked during in-flight dispatch.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md ${
                    isSubmitting
                      ? 'bg-amber-500/40 text-amber-200 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold active:scale-[0.98]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Routing to Server...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Inspector & Submissions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Request Status */}
          <div className="bg-[#252526] rounded-xl border border-[#333333] shadow-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#333333] bg-[#2a2d2e] flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-amber-400" />
                Latest Routing Result
              </h2>
              {lastSubmittedRequest && (
                <span className="text-[10px] font-mono text-[#888]">
                  {lastSubmittedRequest.id}
                </span>
              )}
            </div>

            <div className="p-5">
              {!lastSubmittedRequest ? (
                <div className="py-8 text-center text-[#666666] space-y-2">
                  <Clock size={28} className="mx-auto text-[#444444]" />
                  <p className="text-xs">No request submitted yet in this session.</p>
                  <p className="text-[11px] text-[#555]">Submit a request on the left to see load balancer allocation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#333333]">
                    <div className="flex items-center gap-2.5">
                      {lastSubmittedRequest.status === 'completed' ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : lastSubmittedRequest.status === 'rejected' ? (
                        <XCircle size={18} className="text-rose-400" />
                      ) : (
                        <RefreshCw size={18} className="text-blue-400 animate-spin" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white capitalize">
                          {lastSubmittedRequest.status}
                        </div>
                        <div className="text-[10px] text-[#888]">
                          {lastSubmittedRequest.serverName ? `Assigned to ${lastSubmittedRequest.serverName}` : 'No server allocated'}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        lastSubmittedRequest.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : lastSubmittedRequest.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {lastSubmittedRequest.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30]">
                      <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Server size={11} className="text-amber-400" />
                        Target Server
                      </div>
                      <div className="font-medium text-white truncate">
                        {lastSubmittedRequest.serverName || 'None'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30]">
                      <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Cpu size={11} className="text-amber-400" />
                        Workload Units
                      </div>
                      <div className="font-mono font-medium text-amber-400">
                        {lastSubmittedRequest.workloadUnits || 1} units
                      </div>
                    </div>
                  </div>

                  {lastSubmittedRequest.decisionExplanation && (
                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30] text-[11px] text-[#999] leading-relaxed">
                      <span className="text-amber-400 font-medium">Balancer Decision: </span>
                      {lastSubmittedRequest.decisionExplanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Current Server Fleet Headroom Quick View */}
          <div className="bg-[#252526] rounded-xl border border-[#333333] shadow-lg p-5">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Server size={14} className="text-amber-400" />
              Live Server Capacity Headroom
            </h3>
            <div className="space-y-3">
              {servers.map(s => {
                const curW = s.currentWorkload !== undefined ? s.currentWorkload : s.activeRequests;
                const pct = s.maxCapacity > 0 ? Math.min(100, Math.round((curW / s.maxCapacity) * 100)) : 0;
                return (
                  <div key={s.id} className="p-2.5 rounded-lg bg-[#1e1e1e] border border-[#2e2e30]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-white truncate max-w-[160px]">{s.name}</span>
                      <span className="font-mono text-[11px] text-amber-400">
                        {curW} / {s.maxCapacity} units ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          pct >= 90 ? 'bg-rose-500' : pct >= 65 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-[#777] font-mono">
                      <span>Concurrency: {s.activeRequests}/{s.concurrencyLimit} conn</span>
                      <span>Weight: {s.weight}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
