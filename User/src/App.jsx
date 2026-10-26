/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Standalone Form-Based User Application
 * Normal business website form that sends real 1-to-1 requests to the Load Balancer.
 */

import React, { useState, useEffect, useRef } from 'react';
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

const API_BASE = window.location.port === '5174' ? 'http://localhost:3000/api' : '/api';

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

export default function App() {
  // Form State
  const [selectedUserPreset, setSelectedUserPreset] = useState('usr-1');
  const [userName, setUserName] = useState('Alex Rivera');
  const [department, setDepartment] = useState('Analytics');
  const [requestType, setRequestType] = useState('analytics');
  const [requestTitle, setRequestTitle] = useState('Monthly Sales Aggregation');
  const [requestPayload, setRequestPayload] = useState('Aggregate transactions from Q3 for departmental audit.');
  const [workloadUnits, setWorkloadUnits] = useState(2);
  const [priority, setPriority] = useState('normal');

  // Submission & Tracking State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState(null);
  const [trackedRequest, setTrackedRequest] = useState(null);
  const [submissionHistory, setSubmissionHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('user_form_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Backend Health
  const [backendStatus, setBackendStatus] = useState({ connected: false, checking: true, currentAlgorithm: '' });
  const [submitError, setSubmitError] = useState(null);

  // Poller Ref
  const pollTimerRef = useRef(null);

  // Check Backend Status on mount
  const checkBackend = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        setBackendStatus({
          connected: true,
          checking: false,
          currentAlgorithm: data.selectedAlgorithm || 'ROUND_ROBIN',
          serverCount: data.serversCount || 0
        });
      } else {
        setBackendStatus({ connected: false, checking: false, currentAlgorithm: '' });
      }
    } catch (err) {
      setBackendStatus({ connected: false, checking: false, currentAlgorithm: '' });
    }
  };

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  // Save history to local storage
  useEffect(() => {
    try {
      localStorage.setItem('user_form_history', JSON.stringify(submissionHistory));
    } catch {}
  }, [submissionHistory]);

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

  // Poll for status of tracked request
  useEffect(() => {
    if (!trackedRequest || trackedRequest.status === 'completed' || trackedRequest.status === 'rejected') {
      return;
    }

    const pollStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/requests/${trackedRequest.id}`, { credentials: 'omit' });
        if (res.ok) {
          const data = await res.json();
          if (data.request) {
            setTrackedRequest(data.request);
            // Update item in history
            setSubmissionHistory(prev =>
              prev.map(h => (h.id === data.request.id ? { ...h, ...data.request } : h))
            );
          }
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    };

    pollTimerRef.current = setInterval(pollStatus, 800);
    return () => clearInterval(pollTimerRef.current);
  }, [trackedRequest]);

  // Handle Form Submission: STRICT 1 Form Submit = Exactly 1 Request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double click

    setSubmitError(null);
    setIsSubmitting(true);

    const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      clientName: userName.trim() || 'Anonymous User',
      department: department.trim() || 'General',
      requestType,
      title: requestTitle.trim() || 'Custom Task Request',
      description: requestPayload.trim() || 'Standard operational workload payload.',
      workloadUnits: Number(workloadUnits) || 1,
      priority,
      idempotencyKey
    };

    try {
      const response = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Request routing failed');
      }

      const generatedRequest = result.request;
      setLastSubmittedRequest(generatedRequest);
      setTrackedRequest(generatedRequest);

      // Add to local history (limit to 20)
      setSubmissionHistory(prev => [generatedRequest, ...prev.slice(0, 19)]);
    } catch (err) {
      console.error('Failed to submit user request:', err);
      setSubmitError(err.message || 'Unable to communicate with Load Balancer API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearHistory = () => {
    setSubmissionHistory([]);
    try {
      localStorage.removeItem('user_form_history');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#d4d4d4] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-[#2d2d30] bg-[#252526] px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-base">
            U
          </div>
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              Enterprise Client Request Portal
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Port 5174
              </span>
            </h1>
            <p className="text-xs text-[#888888]">
              Standard end-user application &bull; Dispatches individual transactional requests to Load Balancer
            </p>
          </div>
        </div>

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1e1e1e] border border-[#333333] text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-[#a0a0a0]">
              Load Balancer API:
            </span>
            <span className={backendStatus.connected ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {backendStatus.connected ? 'Connected (Port 3000)' : 'Unreachable'}
            </span>
          </div>

          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/50 px-3 py-1.5 rounded-md transition-colors"
          >
            <span>Load Balancer Portal</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </header>

      {/* Main Grid: Form on Left, Real-time Tracker & History on Right */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: The Standard Business Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#252526] rounded-xl border border-[#333333] shadow-lg overflow-hidden">
            {/* Form Header */}
            <div className="px-6 py-4 border-b border-[#333333] bg-[#2a2d2e] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText size={16} className="text-amber-400" />
                  Service Request Form
                </h2>
                <p className="text-xs text-[#8c8c8c] mt-0.5">
                  Submit a discrete task to the backend fleet. 1 submission generates exactly 1 load balancer request.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e1e1e] text-[#a0a0a0] border border-[#3c3c3c]">
                Mode: Form Submission
              </span>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Row 1: Identity & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center gap-1.5">
                    <User size={13} className="text-amber-400" />
                    Requester Identity / Profile
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
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white placeholder-[#555]"
                  />
                </div>
              </div>

              {/* Row 2: Department & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                    Department / Business Unit
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Analytics, Finance"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white placeholder-[#555]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                    Traffic Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white"
                  >
                    <option value="normal">Standard Priority</option>
                    <option value="high">High Priority (SLA 99.9%)</option>
                    <option value="batch">Low / Background Batch</option>
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
                  <span className="text-[11px] text-[#888]">Selects typical payload & weight</span>
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
                          : 'border-[#333333] bg-[#1e1e1e] text-[#a0a0a0] hover:border-[#444444] hover:text-[#cccccc]'
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
                    Request Title / Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    placeholder="e.g. Sales Aggregate Report"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white placeholder-[#555]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center justify-between">
                    <span>Workload Units</span>
                    <span className="text-[10px] font-mono text-amber-400">{workloadUnits} / 10 max</span>
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
                  <p className="text-[10px] text-[#777] mt-1">
                    Workload reserved on assigned server
                  </p>
                </div>
              </div>

              {/* Row 5: Detailed Payload */}
              <div>
                <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                  Payload Specification / Parameters
                </label>
                <textarea
                  rows={2}
                  value={requestPayload}
                  onChange={(e) => setRequestPayload(e.target.value)}
                  placeholder="Enter JSON parameters, query filters, or payload descriptions..."
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white placeholder-[#555] font-mono"
                />
              </div>

              {/* Error Notice */}
              {submitError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Button & Anti-Duplicate Warning */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#333333]">
                <div className="text-[11px] text-[#777] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Guaranteed idempotency: Button locks during in-flight dispatch.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !backendStatus.connected}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md ${
                    isSubmitting
                      ? 'bg-amber-500/40 text-amber-200 cursor-not-allowed'
                      : !backendStatus.connected
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold active:scale-[0.98]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Dispatching Request...</span>
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

          {/* Educational Note */}
          <div className="bg-[#252526]/50 rounded-xl border border-[#2e2e30] p-4 text-xs text-[#8c8c8c] flex items-start gap-3">
            <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-white font-medium">How This Connects to the Load Balancer:</p>
              <p>
                When you click <strong>Submit Request</strong>, a real HTTP POST is dispatched to{' '}
                <code className="text-amber-300 bg-[#1e1e1e] px-1 py-0.5 rounded font-mono">/api/requests</code>.
                The authoritative load balancer evaluates server capacities, weights, and active concurrency to route your request to an optimal server.
                Check the <strong>Load Balancer Management Portal</strong> to watch it process in real time!
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Request Status Tracker & Recent Submissions (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active / Last Submitted Request Tracker */}
          <div className="bg-[#252526] rounded-xl border border-[#333333] shadow-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#333333] bg-[#2a2d2e] flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-amber-400" />
                Live Request Status Tracker
              </h2>
              {trackedRequest && (
                <span className="text-[10px] font-mono text-[#888]">
                  {trackedRequest.id}
                </span>
              )}
            </div>

            <div className="p-5">
              {!trackedRequest ? (
                <div className="py-8 text-center text-[#666666] space-y-2">
                  <Clock size={28} className="mx-auto text-[#444444]" />
                  <p className="text-xs">No active request being tracked.</p>
                  <p className="text-[11px] text-[#555]">Submit the form on the left to inspect live routing & processing.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#333333]">
                    <div className="flex items-center gap-2.5">
                      {trackedRequest.status === 'completed' && (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      )}
                      {trackedRequest.status === 'processing' && (
                        <RefreshCw size={18} className="text-blue-400 animate-spin" />
                      )}
                      {trackedRequest.status === 'queued' && (
                        <Clock size={18} className="text-amber-400 animate-pulse" />
                      )}
                      {trackedRequest.status === 'rejected' && (
                        <XCircle size={18} className="text-rose-400" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white capitalize">
                          {trackedRequest.status === 'processing' ? 'Processing on Server' : trackedRequest.status}
                        </div>
                        <div className="text-[10px] text-[#888]">
                          {trackedRequest.status === 'processing' && 'Server is executing computational workload'}
                          {trackedRequest.status === 'completed' && 'Transaction completed successfully'}
                          {trackedRequest.status === 'queued' && 'Queued waiting for server capacity'}
                          {trackedRequest.status === 'rejected' && 'Admission capacity exceeded'}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        trackedRequest.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : trackedRequest.status === 'processing'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : trackedRequest.status === 'queued'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {trackedRequest.status}
                    </span>
                  </div>

                  {/* Routing Decision Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30]">
                      <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Server size={11} className="text-amber-400" />
                        Assigned Server
                      </div>
                      <div className="font-medium text-white truncate">
                        {trackedRequest.serverName || (trackedRequest.status === 'queued' ? 'In Admission Queue' : 'None')}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30]">
                      <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Cpu size={11} className="text-amber-400" />
                        Reserved Workload
                      </div>
                      <div className="font-mono font-medium text-amber-400">
                        {trackedRequest.workloadUnits || 1} units
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30]">
                      <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Layers size={11} className="text-amber-400" />
                        Routing Algorithm
                      </div>
                      <div className="text-white text-[11px] truncate">
                        {trackedRequest.algorithm || 'Round Robin'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30]">
                      <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock size={11} className="text-amber-400" />
                        Processing Time
                      </div>
                      <div className="font-mono text-white text-[11px]">
                        {trackedRequest.durationMs ? `${trackedRequest.durationMs}ms` : 'Calculating...'}
                      </div>
                    </div>
                  </div>

                  {/* Routing Explanation Note */}
                  {trackedRequest.decisionExplanation && (
                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30] text-[11px] text-[#999] leading-relaxed">
                      <span className="text-amber-400 font-medium">Load Balancer Log: </span>
                      {trackedRequest.decisionExplanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submission History from this Browser Form */}
          <div className="bg-[#252526] rounded-xl border border-[#333333] shadow-lg overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#333333] bg-[#2a2d2e] flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-amber-400" />
                Recent Submissions History ({submissionHistory.length})
              </h2>
              {submissionHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[11px] text-[#777] hover:text-rose-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="p-4 max-h-[340px] overflow-y-auto space-y-2">
              {submissionHistory.length === 0 ? (
                <div className="py-6 text-center text-[#666666] text-xs">
                  No submissions yet. Submitting requests from this form will record their server routing here.
                </div>
              ) : (
                submissionHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setTrackedRequest(item)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      trackedRequest?.id === item.id
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-[#2e2e30] bg-[#1e1e1e] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white truncate max-w-[180px]">
                        {item.title || item.clientName}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          item.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : item.status === 'processing'
                            ? 'bg-blue-500/10 text-blue-400'
                            : item.status === 'queued'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#888]">
                      <span className="flex items-center gap-1">
                        <Server size={11} className="text-amber-400/80" />
                        {item.serverName || 'Pending'}
                      </span>
                      <span className="font-mono text-[10px]">
                        {item.workloadUnits || 1} units &bull; {new Date(item.createdAt || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2d2d30] bg-[#252526] px-6 py-3 text-xs text-[#777] flex items-center justify-between">
        <div>Network Load Balancer &bull; Real-Time Client Application</div>
        <div className="font-mono text-[11px] text-[#666]">Port 5174 &bull; HTTP REST API</div>
      </footer>
    </div>
  );
}
