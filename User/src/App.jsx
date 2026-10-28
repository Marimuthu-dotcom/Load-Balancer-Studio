/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * User Portal: Simple Job Application Form
 * Clean, beginner-friendly career application form that dispatches real 1-to-1 requests
 * to the Network Load Balancer backend.
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Server,
  RefreshCw,
  ShieldCheck,
  Briefcase,
  User,
  Activity,
  Info,
  Mail,
  Phone,
  Code,
  GraduationCap,
  Sparkles
} from 'lucide-react';

export const getCandidateApiBases = () => {
  const candidates = [];
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    candidates.push(import.meta.env.VITE_API_URL.replace(/\/$/, ''));
  }
  // 1. Relative /api routes through Vite dev proxy on port 5174 or same origin
  candidates.push('/api');
  // 2. Direct connection to host machine on port 3000
  if (typeof window !== 'undefined' && window.location?.hostname) {
    candidates.push(`${window.location.protocol}//${window.location.hostname}:3000/api`);
  }
  candidates.push('http://localhost:3000/api');
  return [...new Set(candidates.filter(Boolean))];
};

export const getLoadBalancerPortalUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LB_PORTAL_URL) {
    return import.meta.env.VITE_LB_PORTAL_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
};

// Dynamic Client ID Generator & Persistent Storage (Section 2 & 5)
export function getOrAssignClientId() {
  try {
    let saved = localStorage.getItem('user_client_id');
    // If not set or if set to old static strings ('client-a', 'client-b', 'client-c', etc.)
    if (!saved || saved.toLowerCase() === 'client-a' || saved.toLowerCase() === 'client-b' || saved.toLowerCase() === 'client-c') {
      const randomNum = Math.floor(1000 + Math.random() * 9000); // e.g. 1042
      saved = `Client-${randomNum}`;
      localStorage.setItem('user_client_id', saved);
    }
    return saved;
  } catch {
    return `Client-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

// 7 Standard Job Roles & Experience Options
export const JOB_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Software Tester',
  'UI/UX Designer'
];

export const EXPERIENCE_LEVELS = [
  'Fresher',
  '1–2 Years',
  '3–5 Years',
  'More than 5 Years'
];

export default function App() {
  // Detected API Base
  const [activeApiBase, setActiveApiBase] = useState(() => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/\/$/, '');
    }
    return '/api';
  });

  // Dynamic Browser Profile Client ID
  const [clientId] = useState(() => getOrAssignClientId());

  // Job Application Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [whyHire, setWhyHire] = useState('');

  // Validation & Feedback State
  const [formErrors, setFormErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientIdRef = useRef(clientId);
  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  // Submission & Tracking State - scoped strictly to this client identity
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState(null);
  const [trackedRequest, setTrackedRequest] = useState(null);
  const [submissionHistory, setSubmissionHistory] = useState(() => {
    try {
      const curId = getOrAssignClientId();
      const saved = localStorage.getItem(`user_form_history_${curId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Backend Health Monitoring
  const [backendStatus, setBackendStatus] = useState({
    connected: false,
    checking: true,
    currentAlgorithm: '',
    serverCount: 0,
    activeRequests: 0,
    queuedRequests: 0,
    activeApiBase: '/api',
    lastChecked: null,
    errorMessage: null
  });
  const [socketLive, setSocketLive] = useState(false);

  // Poller Ref
  const pollTimerRef = useRef(null);

  // Socket.IO Real-Time Listener - filtered strictly to this client's submissions
  useEffect(() => {
    let socket;
    try {
      const socketHost = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000';
      socket = io(socketHost, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 25,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        setSocketLive(true);
      });

      socket.on('disconnect', () => {
        setSocketLive(false);
      });

      socket.on('request:completed', (data) => {
        if (!data || !data.requestId) return;
        const curClient = clientIdRef.current;
        // Ignore requests belonging to other clients
        if (data.clientId && data.clientId !== curClient && (!data.request || data.request.clientId !== curClient)) {
          return;
        }
        setTrackedRequest(prev => {
          if (prev && prev.id === data.requestId) {
            return { ...prev, ...data.request, status: 'completed' };
          }
          return prev;
        });
        setSubmissionHistory(prev =>
          prev.map(h => (h.id === data.requestId ? { ...h, ...data.request, status: 'completed' } : h))
        );
      });

      socket.on('request:assigned', (data) => {
        if (!data || !data.request) return;
        const curClient = clientIdRef.current;
        // Ignore requests belonging to other clients
        if (data.request.clientId && data.request.clientId !== curClient) {
          return;
        }
        setTrackedRequest(prev => {
          if (prev && prev.id === data.request.id) {
            return { ...prev, ...data.request };
          }
          return prev;
        });
      });
    } catch (err) {
      console.warn('User portal Socket.IO setup error:', err);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Check Backend Status with candidate fallback using Axios
  const checkBackend = async () => {
    setBackendStatus(prev => ({ ...prev, checking: true, errorMessage: null }));
    const candidates = getCandidateApiBases();
    const ordered = [activeApiBase, ...candidates.filter(c => c !== activeApiBase)];

    let connected = false;
    for (const base of ordered) {
      try {
        const res = await axios.get(`${base}/health`, {
          timeout: 2500,
          headers: { 'Accept': 'application/json' }
        });
        if (res.status === 200 && res.data) {
          const data = res.data;
          setActiveApiBase(base);
          setBackendStatus({
            connected: true,
            checking: false,
            currentAlgorithm: data.selectedAlgorithm || 'ROUND_ROBIN',
            serverCount: data.serversCount || 0,
            activeRequests: data.activeRequestsCount || 0,
            queuedRequests: data.queuedRequestsCount || 0,
            activeApiBase: base,
            lastChecked: Date.now(),
            errorMessage: null
          });
          connected = true;
          break;
        }
      } catch (err) {
        // try next candidate
      }
    }

    if (!connected) {
      setBackendStatus({
        connected: false,
        checking: false,
        currentAlgorithm: '',
        serverCount: 0,
        activeRequests: 0,
        queuedRequests: 0,
        activeApiBase,
        lastChecked: Date.now(),
        errorMessage: 'Unable to reach Load Balancer API.'
      });
    }
  };

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  // Save history to local storage strictly scoped to this clientId
  useEffect(() => {
    try {
      localStorage.setItem(`user_form_history_${clientId}`, JSON.stringify(submissionHistory));
    } catch {}
  }, [submissionHistory, clientId]);

  // Poll for status of tracked request
  useEffect(() => {
    if (!trackedRequest || trackedRequest.status === 'completed' || trackedRequest.status === 'rejected') {
      return;
    }

    const pollStatus = async () => {
      try {
        const res = await axios.get(`${activeApiBase}/requests/${trackedRequest.id}`, { timeout: 2000 });
        if (res.status === 200 && res.data?.request) {
          const req = res.data.request;
          setTrackedRequest(req);
          // Update item in history
          setSubmissionHistory(prev =>
            prev.map(h => (h.id === req.id ? { ...h, ...req } : h))
          );
        }
      } catch (err) {
        // quiet error on poll
      }
    };

    pollTimerRef.current = setInterval(pollStatus, 800);
    return () => clearInterval(pollTimerRef.current);
  }, [trackedRequest, activeApiBase]);

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedSkills = skills.trim();

    if (!trimmedName) {
      errors.fullName = 'Full Name is required.';
    }

    if (!trimmedEmail) {
      errors.email = 'Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address (e.g. name@example.com).';
    }

    if (!trimmedPhone) {
      errors.phone = 'Phone Number is required.';
    } else if (trimmedPhone.replace(/[^0-9]/g, '').length < 7) {
      errors.phone = 'Please enter a valid phone number (at least 7 digits).';
    }

    if (!jobRole) {
      errors.jobRole = 'Please select a job role.';
    }

    if (!experience) {
      errors.experience = 'Please select your years of experience.';
    }

    if (!trimmedSkills) {
      errors.skills = 'Please enter your key skills.';
    }

    return errors;
  };

  // Handle Form Submission: Dispatches 1 real job application to the Load Balancer
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !backendStatus.connected || backendStatus.checking) return;

    setSubmitError(null);
    setSubmitSuccess(null);

    // Validate fields
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setIsSubmitting(true);

    const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedSkills = skills.trim();
    const trimmedWhyHire = whyHire.trim();

    const payload = {
      clientId,
      clientName: trimmedName,
      userName: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      jobRole,
      experience,
      skills: trimmedSkills,
      whyHire: trimmedWhyHire,
      requestType: 'Job Application',
      title: `Job Application: ${jobRole} (${trimmedName})`,
      description: `Candidate: ${trimmedName} | Role: ${jobRole} | Exp: ${experience} | Skills: ${trimmedSkills} | Email: ${trimmedEmail}`,
      workloadUnits: 1, // standard 1 unit for application processing
      idempotencyKey
    };

    try {
      const response = await axios.post(`${activeApiBase}/requests`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
          'X-Client-Id': clientId
        },
        timeout: 8000
      });

      const result = response.data;

      if (!result || !result.success) {
        throw new Error(result?.error || result?.message || 'Application submission failed.');
      }

      const generatedRequest = result.request;
      setLastSubmittedRequest(generatedRequest);
      setTrackedRequest(generatedRequest);

      // Display actual submission success
      setSubmitSuccess(
        `Application received! Routed to ${generatedRequest.serverName || 'Server Fleet'} using ${generatedRequest.algorithm || backendStatus.currentAlgorithm || 'Round Robin'}.`
      );

      // Add to local history (scoped to this clientId, limit to 20)
      setSubmissionHistory(prev => [generatedRequest, ...prev.slice(0, 19)]);
    } catch (err) {
      console.error('Failed to submit job application:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unable to communicate with Load Balancer API.';
      setSubmitError(errMsg);
      setSubmitSuccess(null);

      // If backend returned a rejected request record (e.g. 503 No servers available), track it accurately
      if (err.response?.data?.request) {
        const rejectedReq = err.response.data.request;
        setTrackedRequest(rejectedReq);
        setSubmissionHistory(prev => [rejectedReq, ...prev.slice(0, 19)]);
      } else if (err.response?.status === 503) {
        const syntheticRejected = {
          id: `req-rej-${Date.now().toString(36).slice(-4)}`,
          clientId,
          clientName: trimmedName,
          userName: trimmedName,
          jobRole,
          title: `Job Application: ${jobRole} (${trimmedName})`,
          status: 'rejected',
          createdAt: Date.now(),
          completedAt: Date.now(),
          workloadUnits: 1,
          decisionExplanation: errMsg,
          serverName: 'None'
        };
        setTrackedRequest(syntheticRejected);
        setSubmissionHistory(prev => [syntheticRejected, ...prev.slice(0, 19)]);
      }

      // Recheck backend health after error
      checkBackend();
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearHistory = () => {
    setSubmissionHistory([]);
    try {
      localStorage.removeItem(`user_form_history_${clientId}`);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#d4d4d4] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-[#2d2d30] bg-[#252526] px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-base">
            <Briefcase size={17} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              Job Application Portal
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono">
                Port 5174
              </span>
            </h1>
            <p className="text-xs text-[#888888]">
              Simple Job Application Demonstration &bull; Dispatches real application requests to the Network Load Balancer
            </p>
          </div>
        </div>

        {/* Backend Connectivity & Dynamic Client ID Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1e1e1e] border border-[#333333] text-xs">
            {backendStatus.checking ? (
              <>
                <RefreshCw size={13} className="text-amber-400 animate-spin" />
                <span className="text-[#a0a0a0]">Load Balancer:</span>
                <span className="text-amber-400 font-medium">Checking Connection...</span>
              </>
            ) : backendStatus.connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[#a0a0a0]">Load Balancer:</span>
                <span className="text-emerald-400 font-medium">
                  Online ({backendStatus.serverCount} Servers)
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[#a0a0a0]">Load Balancer:</span>
                <span className="text-rose-400 font-medium">API Unreachable</span>
                <button
                  type="button"
                  onClick={checkBackend}
                  title="Retry connection"
                  className="ml-1 text-[11px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
                >
                  Retry
                </button>
              </>
            )}
          </div>

          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono ${
              socketLive
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
            title={socketLive ? 'Connected to Socket.IO real-time stream' : 'Socket.IO offline (using polling)'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${socketLive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            <span>{socketLive ? 'Real-Time Sync' : 'Polling Mode'}</span>
          </div>

          {/* Read-Only Dynamic Client ID Badge */}
          <div className="flex items-center gap-1.5 bg-[#1e1e1e] border border-amber-500/40 px-3 py-1.5 rounded-md text-xs shadow-xs">
            <User size={13} className="text-amber-400" />
            <span className="text-[#888] hidden md:inline">Assigned Client:</span>
            <span className="text-amber-400 font-mono font-bold">{clientId}</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Form on Left, Real-time Tracker & History on Right */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Simple Job Application Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#252526] rounded-xl border border-[#333333] shadow-lg overflow-hidden">
            {/* Form Header */}
            <div className="px-6 py-4 border-b border-[#333333] bg-[#2a2d2e] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Briefcase size={16} className="text-amber-400" />
                  Job Application Form
                </h2>
                <p className="text-xs text-[#8c8c8c] mt-0.5">
                  Apply for open engineering & design roles. Submitting routes your application through the Load Balancer.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e1e1e] text-[#a0a0a0] border border-[#3c3c3c]">
                Mode: Live Demonstration
              </span>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Field 1: Full Name */}
              <div>
                <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-amber-400" />
                    Full Name <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[11px] text-[#777]">Applicant's legal name</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (formErrors.fullName) setFormErrors(prev => ({ ...prev, fullName: null }));
                  }}
                  placeholder="e.g. Alex Johnson"
                  className={`w-full bg-[#1e1e1e] border ${
                    formErrors.fullName ? 'border-rose-500' : 'border-[#3c3c3c] focus:border-amber-500'
                  } focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white placeholder-[#555]`}
                />
                {formErrors.fullName && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} className="shrink-0" /> {formErrors.fullName}
                  </p>
                )}
              </div>

              {/* Field 2 & 3: Email Address & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center gap-1.5">
                    <Mail size={13} className="text-amber-400" />
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) setFormErrors(prev => ({ ...prev, email: null }));
                    }}
                    placeholder="e.g. alex.johnson@example.com"
                    className={`w-full bg-[#1e1e1e] border ${
                      formErrors.email ? 'border-rose-500' : 'border-[#3c3c3c] focus:border-amber-500'
                    } focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white placeholder-[#555]`}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} className="shrink-0" /> {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center gap-1.5">
                    <Phone size={13} className="text-amber-400" />
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: null }));
                    }}
                    placeholder="e.g. +1 (555) 234-5678"
                    className={`w-full bg-[#1e1e1e] border ${
                      formErrors.phone ? 'border-rose-500' : 'border-[#3c3c3c] focus:border-amber-500'
                    } focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white placeholder-[#555]`}
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} className="shrink-0" /> {formErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Field 4 & 5: Job Role & Years of Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center gap-1.5">
                    <Briefcase size={13} className="text-amber-400" />
                    Job Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={jobRole}
                    onChange={(e) => {
                      setJobRole(e.target.value);
                      if (formErrors.jobRole) setFormErrors(prev => ({ ...prev, jobRole: null }));
                    }}
                    className={`w-full bg-[#1e1e1e] border ${
                      formErrors.jobRole ? 'border-rose-500' : 'border-[#3c3c3c] focus:border-amber-500'
                    } focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white cursor-pointer`}
                  >
                    <option value="" disabled className="bg-[#252526]">Select a job role...</option>
                    {JOB_ROLES.map(role => (
                      <option key={role} value={role} className="bg-[#252526]">
                        {role}
                      </option>
                    ))}
                  </select>
                  {formErrors.jobRole && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} className="shrink-0" /> {formErrors.jobRole}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center gap-1.5">
                    <GraduationCap size={13} className="text-amber-400" />
                    Years of Experience <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={experience}
                    onChange={(e) => {
                      setExperience(e.target.value);
                      if (formErrors.experience) setFormErrors(prev => ({ ...prev, experience: null }));
                    }}
                    className={`w-full bg-[#1e1e1e] border ${
                      formErrors.experience ? 'border-rose-500' : 'border-[#3c3c3c] focus:border-amber-500'
                    } focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white cursor-pointer`}
                  >
                    <option value="" disabled className="bg-[#252526]">Select experience level...</option>
                    {EXPERIENCE_LEVELS.map(level => (
                      <option key={level} value={level} className="bg-[#252526]">
                        {level}
                      </option>
                    ))}
                  </select>
                  {formErrors.experience && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} className="shrink-0" /> {formErrors.experience}
                    </p>
                  )}
                </div>
              </div>

              {/* Field 6: Skills */}
              <div>
                <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Code size={13} className="text-amber-400" />
                    Skills <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[11px] text-[#777]">Comma-separated</span>
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => {
                    setSkills(e.target.value);
                    if (formErrors.skills) setFormErrors(prev => ({ ...prev, skills: null }));
                  }}
                  placeholder="e.g. JavaScript, React, Node.js, CSS"
                  className={`w-full bg-[#1e1e1e] border ${
                    formErrors.skills ? 'border-rose-500' : 'border-[#3c3c3c] focus:border-amber-500'
                  } focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white placeholder-[#555]`}
                />
                {formErrors.skills && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} className="shrink-0" /> {formErrors.skills}
                  </p>
                )}
                <p className="text-[11px] text-[#777] mt-1">
                  List your core technologies and programming languages.
                </p>
              </div>

              {/* Field 7: Why should we hire you? (Optional) */}
              <div>
                <label className="block text-xs font-medium text-[#cccccc] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    Why should we hire you?
                  </span>
                  <span className="text-[11px] text-[#777]">Optional</span>
                </label>
                <textarea
                  rows={3}
                  value={whyHire}
                  onChange={(e) => setWhyHire(e.target.value)}
                  placeholder="Tell us briefly why you would be a great fit for this role and what excites you about building impactful software..."
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-3 py-2 text-xs text-white placeholder-[#555]"
                />
              </div>

              {/* Success Notification Banner */}
              {submitSuccess && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start justify-between gap-2 shadow-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-300 block">Application Accepted by Load Balancer</span>
                      <span className="text-emerald-400/90 text-[11px]">{submitSuccess}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitSuccess(null)}
                    className="text-emerald-400 hover:text-white font-mono text-xs ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Error Notice Banner */}
              {submitError && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 shadow-xs">
                  <AlertTriangle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-semibold text-rose-300 block">Submission Failed</span>
                    <span className="text-rose-400/90 text-[11px]">{submitError}</span>
                  </div>
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
                  disabled={isSubmitting || !backendStatus.connected || backendStatus.checking}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                    isSubmitting
                      ? 'bg-amber-500/40 text-amber-200 cursor-not-allowed'
                      : backendStatus.checking
                      ? 'bg-zinc-800 text-amber-400/80 cursor-wait border border-zinc-700'
                      : !backendStatus.connected
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold active:scale-[0.98]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : backendStatus.checking ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Checking Connection...</span>
                    </>
                  ) : !backendStatus.connected ? (
                    <>
                      <XCircle size={14} className="text-rose-400" />
                      <span>API Unreachable</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Submit Application</span>
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
                When you click <strong>Submit Application</strong>, a real HTTP POST request is dispatched to{' '}
                <code className="text-amber-300 bg-[#1e1e1e] px-1 py-0.5 rounded font-mono">/api/requests</code>.
                The authoritative load balancer evaluates server capacities, weights, and active concurrency to route your application to an optimal backend server.
                Check the <strong>Load Balancer Management Portal (Port 3000)</strong> to watch it process in real time!
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
                Live Application Status Tracker
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
                  <p className="text-xs">No active application being tracked.</p>
                  <p className="text-[11px] text-[#555]">Submit a job application on the left to inspect live server routing & processing.</p>
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
                          {trackedRequest.status === 'processing' && 'Server is processing application data'}
                          {trackedRequest.status === 'completed' && 'Application processed and stored successfully'}
                          {trackedRequest.status === 'queued' && 'Queued waiting for server capacity'}
                          {trackedRequest.status === 'rejected' && 'Admission capacity exceeded or no servers available'}
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
                        <Briefcase size={11} className="text-amber-400" />
                        Job Role Applied
                      </div>
                      <div className="font-medium text-amber-400 truncate">
                        {trackedRequest.jobRole || (trackedRequest.title ? trackedRequest.title.replace('Job Application: ', '').split(' (')[0] : 'Engineer')}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30]">
                      <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <User size={11} className="text-amber-400" />
                        Candidate Name
                      </div>
                      <div className="text-white text-[11px] truncate">
                        {trackedRequest.userName || trackedRequest.clientName || 'Applicant'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d30]">
                      <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock size={11} className="text-amber-400" />
                        Processing Duration
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
                Recent Applications History ({submissionHistory.length})
              </h2>
              {submissionHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[11px] text-[#777] hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="p-4 max-h-[340px] overflow-y-auto space-y-2">
              {submissionHistory.length === 0 ? (
                <div className="py-6 text-center text-[#666666] text-xs">
                  No applications submitted yet. Submitting an application will record its server routing here.
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
                      <span className="font-medium text-white truncate max-w-[200px]" title={item.title}>
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
                        {item.serverName || (item.status === 'rejected' ? 'None' : 'Pending')}
                      </span>
                      <span className="font-mono text-[10px]">
                        {new Date(item.createdAt || Date.now()).toLocaleTimeString()}
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
        <div>Network Load Balancer &bull; Real-Time Job Application Portal</div>
        <div className="font-mono text-[11px] text-[#666]">Port 5174 &bull; HTTP REST API &bull; Dynamic Client ID: {clientId}</div>
      </footer>
    </div>
  );
}
