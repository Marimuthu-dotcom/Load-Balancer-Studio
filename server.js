/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Authoritative Backend & API Server for Network Load Balancer
 * Integrates:
 * - Real API communication between User Application and Load Balancer
 * - Authoritative server fleet state & metrics
 * - Strict capacity enforcement & concurrency limits
 * - Dynamic simulated server auto-scaling on overload
 * - Vite middleware integration for AI Studio preview on port 3000
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { routeRequest, ALGORITHM_INFO } from './src/engine/algorithms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// 1. CORS Headers for Cross-Origin Localhost Communication (Section 4 & 17)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 2. Authoritative Load Balancer In-Memory State
const PRESET_SERVERS = [
  {
    id: 'srv-a',
    name: 'Server A (High-Capacity)',
    enabled: true,
    paused: false,
    weight: 5,
    maxCapacity: 10,
    currentWorkload: 0,
    concurrencyLimit: 3,
    activeRequests: 0,
    totalAssigned: 0,
    completedRequests: 0,
    failedRequests: 0,
    isAutoScaled: false
  },
  {
    id: 'srv-b',
    name: 'Server B (Medium-Capacity)',
    enabled: true,
    paused: false,
    weight: 3,
    maxCapacity: 6,
    currentWorkload: 0,
    concurrencyLimit: 2,
    activeRequests: 0,
    totalAssigned: 0,
    completedRequests: 0,
    failedRequests: 0,
    isAutoScaled: false
  },
  {
    id: 'srv-c',
    name: 'Server C (Standard)',
    enabled: true,
    paused: false,
    weight: 2,
    maxCapacity: 4,
    currentWorkload: 0,
    concurrencyLimit: 2,
    activeRequests: 0,
    totalAssigned: 0,
    completedRequests: 0,
    failedRequests: 0,
    isAutoScaled: false
  }
];

let state = {
  servers: [...PRESET_SERVERS],
  requests: [], // authoritative request records
  queuedRequests: [],
  activeRequests: [],
  selectedAlgorithm: 'ROUND_ROBIN',
  settings: {
    simulationSpeed: 1,
    defaultDurationMs: 2500,
    queueingEnabled: true,
    autoScaleOnOverload: true,
    maxAutoScaledServers: 8
  },
  scalingEvents: [],
  latestDecision: null
};

// Idempotency cache (prevents duplicate requests on double-clicks or retries)
const idempotencyCache = new Map(); // key -> { requestId, timestamp }

// Cleanup old idempotency keys every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of idempotencyCache.entries()) {
    if (now - val.timestamp > 60000) {
      idempotencyCache.delete(key);
    }
  }
}, 60000);

/**
 * Check queued requests and dispatch as soon as any server has freed up capacity
 */
function tryProcessQueue() {
  if (state.queuedRequests.length === 0) return;

  for (let i = 0; i < state.queuedRequests.length; i++) {
    const queuedReq = state.queuedRequests[i];
    const decision = routeRequest(state.selectedAlgorithm, state.servers, undefined, queuedReq.workload);

    if (decision && decision.selectedServer) {
      // Dequeue
      state.queuedRequests.splice(i, 1);
      i--;

      const server = state.servers.find(s => s.id === decision.selectedServer.id);
      if (server) {
        assignAndProcessRequest(queuedReq, server, decision.explanation);
      }
    }
  }
}

/**
 * Assign a request to a server, reserve workload, track concurrency, and simulate asynchronous execution
 */
function assignAndProcessRequest(requestRecord, server, explanation) {
  const workload = requestRecord.workload || 1;

  // Reserve capacity and connection slot
  server.currentWorkload += workload;
  server.activeRequests += 1;
  server.totalAssigned += 1;

  requestRecord.status = 'processing';
  requestRecord.serverId = server.id;
  requestRecord.serverName = server.name;
  requestRecord.assignedAt = Date.now();
  requestRecord.decisionExplanation = explanation;

  // Add to active requests
  state.activeRequests.push({
    ...requestRecord,
    startTime: Date.now()
  });

  const speed = Math.max(0.1, state.settings.simulationSpeed || 1);
  const effectiveDuration = Math.max(200, Math.round(requestRecord.durationMs / speed));

  setTimeout(() => {
    // Processing completed
    server.currentWorkload = Math.max(0, server.currentWorkload - workload);
    server.activeRequests = Math.max(0, server.activeRequests - 1);
    server.completedRequests += 1;

    requestRecord.status = 'completed';
    requestRecord.completedAt = Date.now();

    // Remove from activeRequests
    state.activeRequests = state.activeRequests.filter(r => r.id !== requestRecord.id);

    // Re-check queue now that capacity and a connection slot are released!
    tryProcessQueue();
  }, effectiveDuration);
}

// ==================== REST API ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Full state for Load Balancer Dashboard & Visualizer
app.get('/api/state', (req, res) => {
  res.json({
    servers: state.servers,
    requests: state.requests.slice(0, 200),
    queuedRequests: state.queuedRequests,
    activeRequests: state.activeRequests,
    selectedAlgorithm: state.selectedAlgorithm,
    settings: state.settings,
    scalingEvents: state.scalingEvents,
    latestDecision: state.latestDecision,
    stats: {
      totalServers: state.servers.length,
      enabledServers: state.servers.filter(s => s.enabled && !s.paused).length,
      autoScaledServers: state.servers.filter(s => s.isAutoScaled).length,
      totalRequests: state.requests.length,
      pendingRequests: state.queuedRequests.length,
      activeRequests: state.activeRequests.length,
      completedRequests: state.servers.reduce((acc, s) => acc + (s.completedRequests || 0), 0),
      failedRequests: state.servers.reduce((acc, s) => acc + (s.failedRequests || 0), 0),
      currentFleetWorkload: state.servers.reduce((acc, s) => acc + (s.currentWorkload || 0), 0),
      totalFleetCapacity: state.servers.reduce((acc, s) => acc + (s.maxCapacity || 0), 0)
    }
  });
});

// Single Request Submission from User Form (Section 3 & 4)
app.post('/api/requests', (req, res) => {
  const userName = req.body.userName || req.body.clientName || 'Interactive Requester';
  const userId = req.body.userId || `user-${userName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const requestType = req.body.requestType || 'Data Query';
  const title = req.body.title || 'User Request';
  const payload = req.body.payload || req.body.description || '';
  const workload = req.body.workload !== undefined ? req.body.workload : (req.body.workloadUnits !== undefined ? req.body.workloadUnits : 1);
  const durationMs = req.body.durationMs || state.settings.defaultDurationMs || 2500;
  const idempotencyKey = req.body.idempotencyKey || req.headers['x-idempotency-key'];

  // Validation
  if (!userName || typeof userName !== 'string' || userName.trim() === '') {
    return res.status(400).json({ error: 'User Name is required.' });
  }

  const numWorkload = Math.max(1, parseInt(workload) || 1);
  if (numWorkload < 1 || numWorkload > 50) {
    return res.status(400).json({ error: 'Workload must be an integer between 1 and 50.' });
  }

  // Idempotency check: prevent duplicate requests on double-clicks
  if (idempotencyKey) {
    if (idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey);
      const existingReq = state.requests.find(r => r.id === cached.requestId);
      if (existingReq) {
        return res.status(200).json({
          success: true,
          isDuplicatePrevented: true,
          request: existingReq
        });
      }
    }
  }

  // Generate unique request ID
  const requestId = `req-${Date.now().toString(36).slice(-4)}-${Math.random().toString(36).slice(2, 6)}`;
  if (idempotencyKey) {
    idempotencyCache.set(idempotencyKey, { requestId, timestamp: Date.now() });
  }

  const newRequestRecord = {
    id: requestId,
    userName: userName.trim(),
    userId: userId || `user-${userName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    requestType,
    title: title.trim(),
    payload: payload.trim(),
    workload: numWorkload,
    durationMs: Math.max(200, parseInt(durationMs) || state.settings.defaultDurationMs),
    createdAt: Date.now(),
    status: 'submitted',
    algorithm: state.selectedAlgorithm,
    serverId: null,
    serverName: null,
    decisionExplanation: null
  };

  state.requests.unshift(newRequestRecord);

  // If fleet has no servers
  if (state.servers.length === 0) {
    newRequestRecord.status = 'rejected';
    newRequestRecord.decisionExplanation = 'Rejected: Fleet is empty. No servers exist in topology.';
    return res.status(503).json({
      success: false,
      status: 'rejected',
      request: newRequestRecord,
      message: 'No servers configured in Load Balancer fleet.'
    });
  }

  // 1. Initial algorithm evaluation for this incoming workload
  let decision = routeRequest(state.selectedAlgorithm, state.servers, undefined, numWorkload);
  let selectedServer = decision.selectedServer;
  let didAutoScale = false;

  // 2. Controlled Elastic Auto-Scaling on Overload (Section 11)
  // Only create a simulated server if NO server is eligible, auto-scale is enabled, and limit not reached
  if (!selectedServer && state.settings.autoScaleOnOverload) {
    const currentCount = state.servers.length;
    const maxAllowed = state.settings.maxAutoScaledServers || 8;

    if (currentCount < maxAllowed) {
      // Find server with highest workload/capacity to base replica properties on
      const baseServer = state.servers.slice().sort((a, b) => (b.currentWorkload - a.currentWorkload))[0] || state.servers[0];
      const replicaNum = state.servers.filter(s => s.isAutoScaled).length + 1;
      const baseNameClean = baseServer.name.replace(/ \(Auto-Replica \d+\)/, '').replace(/ \(Replica \d+\)/, '');

      const newSimulatedServer = {
        id: `srv-scale-${Date.now().toString(36).slice(-3)}-${replicaNum}`,
        name: `${baseNameClean} (Auto-Replica ${replicaNum})`,
        enabled: true,
        paused: false,
        weight: baseServer.weight || 3,
        maxCapacity: baseServer.maxCapacity || 10,
        currentWorkload: 0,
        concurrencyLimit: baseServer.concurrencyLimit || 3,
        activeRequests: 0,
        totalAssigned: 0,
        completedRequests: 0,
        failedRequests: 0,
        isAutoScaled: true,
        scaledFrom: baseServer.name,
        createdAt: Date.now()
      };

      state.servers.push(newSimulatedServer);
      didAutoScale = true;

      const scaleEvent = {
        id: Date.now(),
        timestamp: Date.now(),
        serverName: newSimulatedServer.name,
        fromServer: baseServer.name,
        reason: `All existing servers reached capacity/concurrency limit. Auto-scaled replica server ${newSimulatedServer.name} with ${newSimulatedServer.maxCapacity} capacity units and ${newSimulatedServer.concurrencyLimit} concurrency limit.`
      };
      state.scalingEvents.unshift(scaleEvent);

      // Re-evaluate algorithm with the expanded fleet
      decision = routeRequest(state.selectedAlgorithm, state.servers, undefined, numWorkload);
      selectedServer = decision.selectedServer || newSimulatedServer;
    }
  }

  // Record latest decision trace
  state.latestDecision = {
    requestId: newRequestRecord.id,
    userName: newRequestRecord.userName,
    workload: newRequestRecord.workload,
    selectedServer: selectedServer ? { id: selectedServer.id, name: selectedServer.name } : null,
    eligibleServers: decision?.eligibleServers || [],
    skippedServers: decision?.skippedServers || [],
    algorithm: ALGORITHM_INFO[state.selectedAlgorithm],
    explanation: decision?.explanation || 'No eligible servers available.',
    timestamp: Date.now(),
    didAutoScale
  };

  // 3. Process according to admission outcome
  if (selectedServer) {
    const srv = state.servers.find(s => s.id === selectedServer.id);
    let finalExplanation = decision.explanation;
    if (didAutoScale) {
      finalExplanation = `[Auto-Scaled Server Created] ${decision.explanation}`;
    }
    assignAndProcessRequest(newRequestRecord, srv, finalExplanation);

    return res.status(201).json({
      success: true,
      status: 'processing',
      request: newRequestRecord,
      server: {
        id: srv.id,
        name: srv.name,
        currentWorkload: srv.currentWorkload,
        maxCapacity: srv.maxCapacity,
        activeRequests: srv.activeRequests,
        concurrencyLimit: srv.concurrencyLimit
      },
      message: `Request assigned to ${srv.name}.`,
      didAutoScale
    });
  } else {
    // Ineligible and couldn't scale
    if (state.settings.queueingEnabled) {
      newRequestRecord.status = 'queued';
      newRequestRecord.decisionExplanation = `Request queued: All servers are at full capacity or concurrency limit. Awaiting available resources.`;
      state.queuedRequests.push(newRequestRecord);

      return res.status(202).json({
        success: true,
        status: 'queued',
        request: newRequestRecord,
        message: 'All servers are currently busy. Request has been queued in the Load Balancer buffer.'
      });
    } else {
      newRequestRecord.status = 'rejected';
      newRequestRecord.decisionExplanation = `Request rejected: Maximum capacity or concurrency limit exceeded across all available servers.`;
      newRequestRecord.completedAt = Date.now();

      return res.status(503).json({
        success: false,
        status: 'rejected',
        request: newRequestRecord,
        message: 'Request rejected: All servers are at maximum capacity/concurrency limit.'
      });
    }
  }
});

// Poll single request status by ID
app.get('/api/requests/:id', (req, res) => {
  const reqRecord = state.requests.find(r => r.id === req.params.id);
  if (!reqRecord) {
    return res.status(404).json({ error: 'Request not found.' });
  }
  res.json({ request: reqRecord });
});

// Server Fleet management endpoints
app.get('/api/servers', (req, res) => {
  res.json({ servers: state.servers });
});

app.post('/api/servers', (req, res) => {
  const { id, name, weight = 3, maxCapacity = 10, concurrencyLimit = 3 } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'Server ID and Name are required.' });
  }
  if (state.servers.some(s => s.id === id)) {
    return res.status(400).json({ error: 'Server ID already exists.' });
  }

  const newServer = {
    id: id.trim(),
    name: name.trim(),
    weight: Math.max(1, parseInt(weight) || 1),
    maxCapacity: Math.max(1, parseInt(maxCapacity) || 1),
    currentWorkload: 0,
    concurrencyLimit: Math.max(1, parseInt(concurrencyLimit) || 1),
    activeRequests: 0,
    totalAssigned: 0,
    completedRequests: 0,
    failedRequests: 0,
    enabled: true,
    paused: false,
    isAutoScaled: false
  };

  state.servers.push(newServer);
  res.status(201).json({ success: true, server: newServer });
});

app.put('/api/servers/:id', (req, res) => {
  const server = state.servers.find(s => s.id === req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found.' });
  }

  const { weight, maxCapacity, concurrencyLimit, enabled, paused } = req.body;
  if (weight !== undefined) server.weight = Math.max(1, parseInt(weight) || 1);
  if (maxCapacity !== undefined) server.maxCapacity = Math.max(1, parseInt(maxCapacity) || 1);
  if (concurrencyLimit !== undefined) server.concurrencyLimit = Math.max(1, parseInt(concurrencyLimit) || 1);
  if (enabled !== undefined) server.enabled = Boolean(enabled);
  if (paused !== undefined) server.paused = Boolean(paused);

  res.json({ success: true, server });
});

app.delete('/api/servers/:id', (req, res) => {
  const index = state.servers.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Server not found.' });
  }

  // Drain active requests from server
  const removed = state.servers.splice(index, 1)[0];
  state.activeRequests = state.activeRequests.filter(r => r.serverId !== removed.id);

  res.json({ success: true, deleted: removed });
});

// Algorithm selection
app.post('/api/algorithm', (req, res) => {
  const { algorithm } = req.body;
  if (algorithm && ALGORITHM_INFO[algorithm]) {
    state.selectedAlgorithm = algorithm;
    return res.json({ success: true, selectedAlgorithm: state.selectedAlgorithm });
  }
  res.status(400).json({ error: 'Invalid algorithm key.' });
});

// Settings update
app.post('/api/settings', (req, res) => {
  const { simulationSpeed, defaultDurationMs, queueingEnabled, autoScaleOnOverload, maxAutoScaledServers } = req.body;
  if (simulationSpeed !== undefined) state.settings.simulationSpeed = Number(simulationSpeed);
  if (defaultDurationMs !== undefined) state.settings.defaultDurationMs = Number(defaultDurationMs);
  if (queueingEnabled !== undefined) state.settings.queueingEnabled = Boolean(queueingEnabled);
  if (autoScaleOnOverload !== undefined) state.settings.autoScaleOnOverload = Boolean(autoScaleOnOverload);
  if (maxAutoScaledServers !== undefined) state.settings.maxAutoScaledServers = Number(maxAutoScaledServers);

  res.json({ success: true, settings: state.settings });
});

// Reset transient counters
app.post('/api/reset', (req, res) => {
  state.queuedRequests = [];
  state.activeRequests = [];
  state.scalingEvents = [];
  state.latestDecision = null;
  state.servers.forEach(s => {
    s.currentWorkload = 0;
    s.activeRequests = 0;
    s.totalAssigned = 0;
    s.completedRequests = 0;
    s.failedRequests = 0;
  });
  res.json({ success: true, message: 'Simulation counters reset successfully.' });
});

// Load standard demo scenario
app.post('/api/demo-scenario', (req, res) => {
  state.servers = PRESET_SERVERS.map(s => ({
    ...s,
    currentWorkload: 0,
    activeRequests: 0,
    totalAssigned: 0,
    completedRequests: 0,
    failedRequests: 0
  }));
  state.queuedRequests = [];
  state.activeRequests = [];
  state.scalingEvents = [];
  state.latestDecision = null;
  res.json({ success: true, servers: state.servers });
});

// Clear all data
app.post('/api/clear-all', (req, res) => {
  state.servers = [];
  state.requests = [];
  state.queuedRequests = [];
  state.activeRequests = [];
  state.scalingEvents = [];
  state.latestDecision = null;
  res.json({ success: true, message: 'All simulator data cleared.' });
});

// ==================== VITE CLIENT INTEGRATION ====================

const PORT = process.env.PORT || 3000;

async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite dev server middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LoadBalancer] Server running on port ${PORT}`);
    console.log(`[LoadBalancer] API Ready at http://localhost:${PORT}/api/state`);
  });
}

startServer();
