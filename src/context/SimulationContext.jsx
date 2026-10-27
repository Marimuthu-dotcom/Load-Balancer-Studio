/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Central Simulation Engine & Application State Provider
 * Dynamic working architecture with Elastic Auto-Scaling on Server Overload
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  loadClients,
  saveClients,
  loadServers,
  saveServers,
  loadHistory,
  saveHistory,
  loadSettings,
  saveSettings,
  clearRequestHistoryStorage,
  resetSimulationCountersStorage,
  clearAllSimulatorDataStorage,
  DEFAULT_CLIENTS,
  DEFAULT_SERVERS,
  PRESET_DEMO_CLIENTS,
  PRESET_DEMO_SERVERS,
  DEFAULT_SETTINGS
} from '../storage/localStorage.js';
import {
  routeRequest,
  ALGORITHM_INFO,
  globalAlgorithmState
} from '../engine/algorithms.js';
import { io } from 'socket.io-client';
import {
  fetchState,
  submitRequestToApi,
  updateAlgorithmInApi,
  resetSimulationInApi,
  loadDemoScenarioInApi
} from '../engine/api.js';

const SimulationContext = createContext(null);

export function SimulationProvider({ children }) {
  // 1. Persistent State
  const [clients, setClients] = useState(() => loadClients());
  const [servers, setServers] = useState(() => loadServers());
  const [history, setHistory] = useState(() => loadHistory());
  const [settings, setSettings] = useState(() => loadSettings());

  // 2. Active Transient Simulation State
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(settings.defaultAlgorithm || 'ROUND_ROBIN');
  const [simulationStatus, setSimulationStatus] = useState('idle'); // 'idle' | 'running' | 'paused' | 'stopped'
  const [activeRequests, setActiveRequests] = useState([]);
  const [queuedRequests, setQueuedRequests] = useState([]);
  const [latestDecision, setLatestDecision] = useState(null);
  const [autoScaleAlert, setAutoScaleAlert] = useState(null); // Notifications when elastic scaling spawns a server
  const [socketConnected, setSocketConnected] = useState(false);

  // Stale-callback protection generation counter
  const runGenerationRef = useRef(1);
  const activeTimersRef = useRef(new Map()); // reqId -> timeoutId
  const requestCounterRef = useRef(1);
  const autoScaleReplicaCounterRef = useRef(1);

  // Sync to localStorage
  useEffect(() => {
    saveClients(clients);
  }, [clients]);

  useEffect(() => {
    saveServers(servers);
  }, [servers]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Derived Summary Statistics
  const stats = React.useMemo(() => {
    const totalAssigned = servers.reduce((acc, s) => acc + (s.totalAssigned || 0), 0);
    const totalCompleted = servers.reduce((acc, s) => acc + (s.completedRequests || 0), 0);
    const totalFailed = servers.reduce((acc, s) => acc + (s.failedRequests || 0), 0);
    const totalClientsCount = clients.length;
    const enabledServersCount = servers.filter(s => s.enabled && !s.paused).length;
    const autoScaledServersCount = servers.filter(s => s.isAutoScaled).length;
    const totalRequestsGenerated = history.length + queuedRequests.length + activeRequests.length;

    const serverDistribution = {};
    servers.forEach(s => {
      const curW = s.currentWorkload !== undefined ? s.currentWorkload : s.activeRequests;
      serverDistribution[s.id] = {
        name: s.name,
        assigned: s.totalAssigned || 0,
        active: s.activeRequests || 0,
        currentWorkload: curW,
        completed: s.completedRequests || 0,
        failed: s.failedRequests || 0,
        maxCapacity: s.maxCapacity,
        concurrencyLimit: s.concurrencyLimit,
        weight: s.weight,
        isAutoScaled: s.isAutoScaled || false,
        utilization: s.maxCapacity > 0 ? Math.min(100, Math.round((curW / s.maxCapacity) * 100)) : 0,
        workloadUtilization: s.maxCapacity > 0 ? Math.min(100, Math.round((curW / s.maxCapacity) * 100)) : 0,
        concurrencyUtilization: s.concurrencyLimit > 0 ? Math.min(100, Math.round((s.activeRequests / s.concurrencyLimit) * 100)) : 0
      };
    });

    return {
      totalClients: totalClientsCount,
      totalServers: servers.length,
      enabledServers: enabledServersCount,
      autoScaledServers: autoScaledServersCount,
      totalRequestsGenerated,
      pendingRequests: queuedRequests.length,
      activeRequests: activeRequests.length,
      completedRequests: totalCompleted,
      failedRequests: totalFailed,
      serverDistribution
    };
  }, [clients, servers, history, queuedRequests, activeRequests]);

  /**
   * Complete an in-flight request
   */
  const handleRequestCompleted = useCallback((requestId, serverId, clientId, isFailed = false, failReason = null, workloadUnits = 1) => {
    // Remove timer ref
    activeTimersRef.current.delete(requestId);

    // Update active requests
    setActiveRequests(prev => prev.filter(r => r.id !== requestId));

    // Update Server state
    setServers(prevServers =>
      prevServers.map(s => {
        if (s.id !== serverId) return s;
        const newActive = Math.max(0, s.activeRequests - 1);
        const curW = s.currentWorkload !== undefined ? s.currentWorkload : s.activeRequests;
        const newWorkload = Math.max(0, curW - (Number(workloadUnits) || 1));
        return {
          ...s,
          activeRequests: newActive,
          currentWorkload: newWorkload,
          completedRequests: isFailed ? s.completedRequests : s.completedRequests + 1,
          failedRequests: isFailed ? s.failedRequests + 1 : s.failedRequests
        };
      })
    );

    // Update Client stats
    setClients(prevClients =>
      prevClients.map(c => {
        if (c.id !== clientId) return c;
        return {
          ...c,
          successfulRequests: isFailed ? c.successfulRequests : c.successfulRequests + 1,
          failedRequests: isFailed ? c.failedRequests + 1 : c.failedRequests
        };
      })
    );

    // Update Record in History
    setHistory(prevHistory =>
      prevHistory.map(record => {
        if (record.id !== requestId) return record;
        return {
          ...record,
          status: isFailed ? 'failed' : 'completed',
          completedAt: Date.now(),
          failureReason: failReason || undefined
        };
      })
    );
  }, []);

  /**
   * Dispatch a single request through the load balancer with dynamic Auto-Scaling
   */
  const dispatchRequest = useCallback((requestItem) => {
    const currentGen = runGenerationRef.current;
    const client = clients.find(c => c.id === requestItem.clientId);

    if (!client || !client.enabled) {
      const rejectionRecord = {
        id: requestItem.id,
        clientId: requestItem.clientId,
        clientName: client?.name || 'Unknown Client',
        serverId: null,
        serverName: 'None (Rejected)',
        algorithm: ALGORITHM_INFO[selectedAlgorithm]?.name || selectedAlgorithm,
        status: 'rejected',
        createdAt: requestItem.createdAt,
        assignedAt: null,
        completedAt: Date.now(),
        durationMs: requestItem.durationMs,
        serverLoadAtSelection: null,
        decisionExplanation: `Rejected: Client is disabled or missing.`,
        failureReason: 'Client disabled or deleted.',
        payloadDescription: requestItem.payloadDescription
      };
      setHistory(prev => [rejectionRecord, ...prev]);
      return false;
    }

    // Check if any servers exist
    if (servers.length === 0) {
      const rejectionRecord = {
        id: requestItem.id,
        clientId: client.id,
        clientName: client.name,
        serverId: null,
        serverName: 'None (Rejected)',
        algorithm: ALGORITHM_INFO[selectedAlgorithm]?.name || selectedAlgorithm,
        status: 'rejected',
        createdAt: requestItem.createdAt,
        assignedAt: null,
        completedAt: Date.now(),
        durationMs: requestItem.durationMs,
        serverLoadAtSelection: null,
        decisionExplanation: 'No servers configured in fleet. Please add or deploy servers.',
        failureReason: 'No servers available in topology.',
        payloadDescription: requestItem.payloadDescription
      };
      setHistory(prev => [rejectionRecord, ...prev]);
      setLatestDecision({
        requestId: requestItem.id,
        clientId: client.id,
        clientName: client.name,
        selectedServer: null,
        eligibleServers: [],
        skippedServers: [],
        algorithm: ALGORITHM_INFO[selectedAlgorithm],
        serverMetrics: {},
        explanation: 'Fleet is empty: No servers exist to receive traffic. Deploy servers first.',
        timestamp: Date.now(),
        status: 'rejected'
      });
      return false;
    }

    // Step 1: Initial algorithm evaluation
    let currentFleet = [...servers];
    const incomingWorkload = Math.max(1, Number(requestItem.workloadUnits) || 1);
    let decision = routeRequest(selectedAlgorithm, currentFleet, incomingWorkload);
    let selectedServer = decision.selectedServer;
    let didAutoScale = false;
    let autoScaleReason = '';

    // Step 2: DYNAMIC AUTO-SCALING ON OVERLOAD
    // If no eligible server or all servers are at concurrency/capacity, auto-scale a new replica!
    if (!selectedServer && settings.autoScaleOnOverload) {
      // Find the overloaded server with highest load or capacity
      const overloadedServer = currentFleet.slice().sort((a, b) => (b.activeRequests - a.activeRequests))[0] || currentFleet[0];
      
      const replicaNum = autoScaleReplicaCounterRef.current++;
      const baseCleanName = overloadedServer.name.replace(/ \(Replica \d+\)/, '').replace(/ \(Auto-Replica \d+\)/, '');
      const newServerId = `srv-scale-${Date.now().toString(36).slice(-4)}-${replicaNum}`;
      
      const newServer = {
        id: newServerId,
        name: `${baseCleanName} (Auto-Replica ${replicaNum})`,
        enabled: true,
        paused: false,
        weight: overloadedServer.weight || 3,
        maxCapacity: overloadedServer.maxCapacity || 8,
        concurrencyLimit: overloadedServer.concurrencyLimit || 3,
        activeRequests: 0,
        totalAssigned: 0,
        completedRequests: 0,
        failedRequests: 0,
        isAutoScaled: true,
        scaledFrom: overloadedServer.name,
        createdAt: Date.now()
      };

      // Add to fleet immediately
      currentFleet = [...currentFleet, newServer];
      setServers(currentFleet);

      didAutoScale = true;
      autoScaleReason = `Server fleet overloaded! ${overloadedServer.name} reached maximum connection limit (${overloadedServer.activeRequests}/${overloadedServer.concurrencyLimit}). Dynamically spawned ${newServer.name} (weight: ${newServer.weight}, max concurrency: ${newServer.concurrencyLimit}) to absorb incoming traffic.`;

      // Trigger user-facing auto-scale alert banner
      setAutoScaleAlert({
        id: Date.now(),
        message: `⚡ Auto-Scale Activated: ${newServer.name} created automatically from ${overloadedServer.name} to handle load!`,
        newServerName: newServer.name,
        fromServerName: overloadedServer.name
      });
      setTimeout(() => setAutoScaleAlert(null), 5000);

      // Re-evaluate algorithm with the newly expanded fleet
      decision = routeRequest(selectedAlgorithm, currentFleet);
      selectedServer = decision.selectedServer || newServer;
    }

    if (!selectedServer) {
      // Still no server available (e.g. if auto-scaling was disabled by user)
      if (settings.queueingEnabled) {
        const queuedItem = {
          ...requestItem,
          status: 'queued',
          queuedAt: Date.now(),
          queueReason: decision.explanation
        };
        setQueuedRequests(prev => [...prev, queuedItem]);

        setLatestDecision({
          requestId: requestItem.id,
          clientId: client.id,
          clientName: client.name,
          selectedServer: null,
          eligibleServers: decision.eligibleServers,
          skippedServers: decision.skippedServers,
          algorithm: decision.algorithm,
          serverMetrics: decision.serverMetrics,
          explanation: `Request queued: All servers are currently at maximum capacity. Waiting for available capacity...`,
          timestamp: Date.now(),
          status: 'queued'
        });
        return false;
      } else {
        const rejectedRecord = {
          id: requestItem.id,
          clientId: client.id,
          clientName: client.name,
          serverId: null,
          serverName: 'None (Rejected)',
          algorithm: decision.algorithm?.name || selectedAlgorithm,
          status: 'rejected',
          createdAt: requestItem.createdAt,
          assignedAt: null,
          completedAt: Date.now(),
          durationMs: requestItem.durationMs,
          serverLoadAtSelection: decision.serverMetrics,
          decisionExplanation: decision.explanation,
          failureReason: 'Admission capacity exceeded: No eligible server available.',
          payloadDescription: requestItem.payloadDescription
        };
        setHistory(prev => [rejectedRecord, ...prev]);
        setLatestDecision({
          requestId: requestItem.id,
          clientId: client.id,
          clientName: client.name,
          selectedServer: null,
          eligibleServers: decision.eligibleServers,
          skippedServers: decision.skippedServers,
          algorithm: decision.algorithm,
          serverMetrics: decision.serverMetrics,
          explanation: `Request rejected: ${decision.explanation}`,
          timestamp: Date.now(),
          status: 'rejected'
        });
        return false;
      }
    }

    // Server selected! Assign and start simulated processing
    const explanationText = didAutoScale
      ? `${autoScaleReason} Allocated to ${selectedServer.name}.`
      : decision.explanation;

    const assignedRecord = {
      id: requestItem.id,
      clientId: client.id,
      clientName: client.name,
      serverId: selectedServer.id,
      serverName: selectedServer.name,
      algorithm: decision.algorithm?.name || selectedAlgorithm,
      status: 'processing',
      createdAt: requestItem.createdAt,
      assignedAt: Date.now(),
      completedAt: null,
      durationMs: requestItem.durationMs,
      serverLoadAtSelection: {
        activeAtSelection: selectedServer.activeRequests,
        weight: selectedServer.weight,
        maxCapacity: selectedServer.maxCapacity,
        concurrencyLimit: selectedServer.concurrencyLimit
      },
      decisionExplanation: explanationText,
      payloadDescription: requestItem.payloadDescription
    };

    setHistory(prev => [assignedRecord, ...prev]);

    setLatestDecision({
      requestId: requestItem.id,
      clientId: client.id,
      clientName: client.name,
      selectedServer: {
        id: selectedServer.id,
        name: selectedServer.name,
        activeRequests: selectedServer.activeRequests,
        weight: selectedServer.weight,
        isAutoScaled: selectedServer.isAutoScaled
      },
      eligibleServers: decision.eligibleServers,
      skippedServers: decision.skippedServers,
      algorithm: decision.algorithm,
      serverMetrics: decision.serverMetrics,
      explanation: explanationText,
      timestamp: Date.now(),
      status: 'assigned',
      didAutoScale
    });

    // Update Server counts (increase active, currentWorkload, and totalAssigned)
    setServers(prevServers =>
      prevServers.map(s => {
        if (s.id !== selectedServer.id) return s;
        const curW = s.currentWorkload !== undefined ? s.currentWorkload : s.activeRequests;
        return {
          ...s,
          activeRequests: s.activeRequests + 1,
          currentWorkload: curW + incomingWorkload,
          totalAssigned: (s.totalAssigned || 0) + 1
        };
      })
    );

    // Update Client counts
    setClients(prevClients =>
      prevClients.map(c => {
        if (c.id !== client.id) return c;
        return {
          ...c,
          totalRequests: (c.totalRequests || 0) + 1
        };
      })
    );

    // Add to Active Requests for Visual Animation
    const activeItem = {
      id: requestItem.id,
      clientId: client.id,
      clientName: client.name,
      serverId: selectedServer.id,
      serverName: selectedServer.name,
      status: 'processing',
      durationMs: requestItem.durationMs,
      remainingMs: requestItem.durationMs,
      startTime: Date.now(),
      stage: 'client', // 'client' -> 'lb_entering' -> 'lb_evaluating' -> 'server_travel' -> 'processing'
      progress: 0,
      payloadDescription: requestItem.payloadDescription,
      workloadUnits: incomingWorkload
    };

    setActiveRequests(prev => [...prev, activeItem]);

    const effectiveSpeed = Math.max(0.1, settings.simulationSpeed || 1);
    const effectiveDelay = Math.max(80, Math.round(requestItem.durationMs / effectiveSpeed));

    // Staged animation transitions
    setTimeout(() => {
      if (runGenerationRef.current !== currentGen) return;
      setActiveRequests(prev => prev.map(r => r.id === requestItem.id ? { ...r, stage: 'lb_entering' } : r));
    }, Math.min(250, effectiveDelay * 0.15));

    setTimeout(() => {
      if (runGenerationRef.current !== currentGen) return;
      setActiveRequests(prev => prev.map(r => r.id === requestItem.id ? { ...r, stage: 'server_travel' } : r));
    }, Math.min(500, effectiveDelay * 0.35));

    setTimeout(() => {
      if (runGenerationRef.current !== currentGen) return;
      setActiveRequests(prev => prev.map(r => r.id === requestItem.id ? { ...r, stage: 'processing' } : r));
    }, Math.min(750, effectiveDelay * 0.5));

    // Completion timer
    const completionTimer = setTimeout(() => {
      if (runGenerationRef.current !== currentGen) return;
      handleRequestCompleted(requestItem.id, selectedServer.id, client.id, false, null, incomingWorkload);
    }, effectiveDelay);

    activeTimersRef.current.set(requestItem.id, completionTimer);

    return true;
  }, [clients, servers, selectedAlgorithm, settings, handleRequestCompleted]);

  /**
   * Monitor queued requests and dispatch as soon as any server has capacity
   */
  useEffect(() => {
    if (queuedRequests.length === 0) return;
    if (simulationStatus === 'paused') return;

    const decision = routeRequest(selectedAlgorithm, servers);
    if (decision.selectedServer || settings.autoScaleOnOverload) {
      const nextRequest = queuedRequests[0];
      setQueuedRequests(prev => prev.slice(1));
      dispatchRequest(nextRequest);
    }
  }, [servers, queuedRequests, selectedAlgorithm, simulationStatus, settings.autoScaleOnOverload, dispatchRequest]);

  /**
   * Progress ticker for active request progress bars
   */
  useEffect(() => {
    if (activeRequests.length === 0 || simulationStatus === 'paused') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const speed = settings.simulationSpeed || 1;

      setActiveRequests(prev =>
        prev.map(r => {
          const elapsed = (now - r.startTime) * speed;
          const progress = Math.min(100, Math.round((elapsed / r.durationMs) * 100));
          return {
            ...r,
            progress
          };
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [activeRequests.length, simulationStatus, settings.simulationSpeed]);

  /**
   * User Action: Run Multi-Client Simulation
   * Exactly matches user's request:
   * "The user can select the How many client should send a request then after select the clients then click the run simulation btn"
   */
  const runMultiClientSimulation = useCallback(({ selectedClientIds, requestsPerClient = 2, durationMs, payloadDescription }) => {
    if (!selectedClientIds || selectedClientIds.length === 0) return;

    setSimulationStatus('running');
    const duration = durationMs || settings.defaultDurationMs;
    const reqsPerClient = Math.max(1, requestsPerClient);
    let sequenceIndex = 0;

    selectedClientIds.forEach((cId) => {
      const targetClient = clients.find(c => c.id === cId);
      if (!targetClient || !targetClient.enabled) return;

      for (let r = 0; r < reqsPerClient; r++) {
        const delayMs = sequenceIndex * Math.max(120, Math.floor(450 / (settings.simulationSpeed || 1)));
        sequenceIndex++;

        setTimeout(() => {
          if (runGenerationRef.current !== runGenerationRef.current) return;
          const id = `req-${Date.now().toString(36).slice(-4)}-${requestCounterRef.current++}`;
          const req = {
            id,
            clientId: targetClient.id,
            durationMs: duration,
            payloadDescription: payloadDescription || `${targetClient.name} traffic #${r + 1}`,
            createdAt: Date.now()
          };
          dispatchRequest(req);
        }, delayMs);
      }
    });
  }, [clients, settings, dispatchRequest]);

  /**
   * User Action: Send One Request
   */
  const sendOneRequest = useCallback(({ clientId, durationMs, payloadDescription }) => {
    const id = `req-${Date.now().toString(36).slice(-4)}-${requestCounterRef.current++}`;
    const req = {
      id,
      clientId,
      durationMs: durationMs || settings.defaultDurationMs,
      payloadDescription: payloadDescription || 'Standard HTTP GET /data',
      createdAt: Date.now()
    };
    setSimulationStatus('running');
    return dispatchRequest(req);
  }, [settings.defaultDurationMs, dispatchRequest]);

  /**
   * Sync with authoritative backend API (supports User Form submissions from port 5174)
   */
  /**
   * Sync with authoritative backend API (initial load & reconnection reconciliation)
   */
  const syncFromBackend = useCallback(async () => {
    try {
      const data = await fetchState();
      if (data && (data.success !== false && data.servers)) {
        if (Array.isArray(data.servers)) setServers(data.servers);
        if (Array.isArray(data.activeRequests)) setActiveRequests(data.activeRequests);
        if (Array.isArray(data.queuedRequests)) setQueuedRequests(data.queuedRequests);
        if (Array.isArray(data.requests)) setHistory(data.requests);
        if (data.selectedAlgorithm) setSelectedAlgorithm(data.selectedAlgorithm);
        if (data.latestDecision) setLatestDecision(data.latestDecision);
        if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      // offline fallback
    }
  }, []);

  /**
   * Real-Time Socket.IO Integration
   * Listens for push events emitted when User Portal dispatches requests
   */
  useEffect(() => {
    let socket;
    try {
      const socketUrl = import.meta.env?.VITE_BACKEND_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000');
      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 30,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        setSocketConnected(true);
        syncFromBackend();
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
      });

      socket.on('state:init', (payload) => {
        if (payload) {
          if (Array.isArray(payload.servers)) setServers(payload.servers);
          if (Array.isArray(payload.activeRequests)) setActiveRequests(payload.activeRequests);
          if (Array.isArray(payload.queuedRequests)) setQueuedRequests(payload.queuedRequests);
          if (Array.isArray(payload.requests)) setHistory(payload.requests);
          if (payload.selectedAlgorithm) setSelectedAlgorithm(payload.selectedAlgorithm);
          if (payload.latestDecision) setLatestDecision(payload.latestDecision);
          if (payload.settings) setSettings(prev => ({ ...prev, ...payload.settings }));
        }
      });

      socket.on('request:assigned', (data) => {
        if (!data || !data.request) return;
        setSimulationStatus('running');
        if (data.latestDecision) setLatestDecision(data.latestDecision);
        if (Array.isArray(data.servers)) setServers(data.servers);

        // Prepend to history avoiding duplicates
        setHistory(prev => {
          const exists = prev.some(r => r.id === data.request.id);
          return exists ? prev.map(r => r.id === data.request.id ? { ...r, ...data.request } : r) : [data.request, ...prev];
        });

        // Add to activeRequests avoiding duplicates
        setActiveRequests(prev => {
          const exists = prev.some(r => r.id === data.request.id);
          return exists ? prev.map(r => r.id === data.request.id ? { ...r, ...data.request } : r) : [...prev, data.request];
        });
      });

      socket.on('request:completed', (data) => {
        if (!data || !data.request) return;
        if (Array.isArray(data.servers)) setServers(data.servers);

        // Update in history
        setHistory(prev =>
          prev.map(r => (r.id === data.request.id ? { ...r, ...data.request, status: 'completed' } : r))
        );

        // Remove from activeRequests
        setActiveRequests(prev => prev.filter(r => r.id !== data.request.id));
      });

      socket.on('request:queued', (data) => {
        if (!data || !data.request) return;
        if (Array.isArray(data.queuedRequests)) {
          setQueuedRequests(data.queuedRequests);
        } else {
          setQueuedRequests(prev => [...prev, data.request]);
        }
        setHistory(prev => {
          const exists = prev.some(r => r.id === data.request.id);
          return exists ? prev.map(r => r.id === data.request.id ? { ...r, ...data.request } : r) : [data.request, ...prev];
        });
      });

      socket.on('request:dequeued', (data) => {
        if (!data || !data.request) return;
        if (Array.isArray(data.queuedRequests)) {
          setQueuedRequests(data.queuedRequests);
        } else {
          setQueuedRequests(prev => prev.filter(r => r.id !== data.request.id));
        }
      });

      socket.on('request:rejected', (data) => {
        if (!data || !data.request) return;
        setHistory(prev => {
          const exists = prev.some(r => r.id === data.request.id);
          return exists ? prev.map(r => r.id === data.request.id ? { ...r, ...data.request } : r) : [data.request, ...prev];
        });
      });

      socket.on('server:scaled', (data) => {
        if (Array.isArray(data.servers)) setServers(data.servers);
        if (data.event) {
          setAutoScaleAlert(data.event);
          setTimeout(() => setAutoScaleAlert(null), 6000);
        }
      });

      socket.on('servers:update', (data) => {
        if (data && Array.isArray(data.servers)) {
          setServers(data.servers);
        }
      });

      socket.on('algorithm:changed', (data) => {
        if (data && data.selectedAlgorithm) {
          setSelectedAlgorithm(data.selectedAlgorithm);
        }
      });

      socket.on('settings:update', (data) => {
        if (data && data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      });

      socket.on('state:reset', (payload) => {
        if (payload) {
          if (Array.isArray(payload.servers)) setServers(payload.servers);
          if (Array.isArray(payload.activeRequests)) setActiveRequests(payload.activeRequests);
          if (Array.isArray(payload.queuedRequests)) setQueuedRequests(payload.queuedRequests);
          if (Array.isArray(payload.requests)) setHistory(payload.requests);
          setLatestDecision(null);
          setSimulationStatus('idle');
        }
      });
    } catch (err) {
      console.warn('Socket.IO connection setup failed:', err);
    }

    // Initial load
    syncFromBackend();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [syncFromBackend]);

  /**
   * Submit single Form Request from User Portal or integrated form
   * (Strict 1 submit = 1 request)
   */
  const submitFormRequest = useCallback(async (formPayload) => {
    try {
      const apiRes = await submitRequestToApi(formPayload);
      if (apiRes && apiRes.success) {
        await syncFromBackend();
        return apiRes;
      }
    } catch (err) {
      console.warn('Backend API unavailable, using in-memory fallback', err);
    }

    // Local fallback
    const id = `req-${Date.now().toString(36).slice(-4)}-${requestCounterRef.current++}`;
    const reqItem = {
      id,
      clientId: clients[0]?.id || 'cli-1',
      clientName: formPayload.clientName || 'Interactive User',
      durationMs: settings.defaultDurationMs || 2500,
      payloadDescription: formPayload.title || formPayload.description || 'User Form Request',
      workloadUnits: Number(formPayload.workloadUnits) || 1,
      createdAt: Date.now()
    };
    setSimulationStatus('running');
    const dispatched = dispatchRequest(reqItem);
    return {
      success: true,
      request: {
        ...reqItem,
        status: dispatched ? 'processing' : 'rejected'
      }
    };
  }, [clients, settings.defaultDurationMs, dispatchRequest, syncFromBackend]);

  /**
   * User Action: Quick Fleet Deployment
   */
  const initializeFleet = useCallback(({ serverCount = 3, clientCount = 4 }) => {
    runGenerationRef.current += 1;
    activeTimersRef.current.forEach(timerId => clearTimeout(timerId));
    activeTimersRef.current.clear();

    setActiveRequests([]);
    setQueuedRequests([]);
    setLatestDecision(null);
    setAutoScaleAlert(null);
    globalAlgorithmState.reset();

    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const weights = [5, 3, 2, 4, 3, 2];
    const capacities = [10, 6, 4, 8, 6, 4];
    const concurrencies = [3, 2, 2, 3, 2, 2];

    const newServers = [];
    for (let i = 0; i < Math.min(6, serverCount); i++) {
      const letter = letters[i] || `X${i+1}`;
      newServers.push({
        id: `srv-${letter.toLowerCase()}`,
        name: `Server ${letter} (${i === 0 ? 'High-Cap' : i === 1 ? 'Med-Cap' : 'Standard'})`,
        enabled: true,
        paused: false,
        weight: weights[i] || 3,
        maxCapacity: capacities[i] || 6,
        concurrencyLimit: concurrencies[i] || 2,
        activeRequests: 0,
        totalAssigned: 0,
        completedRequests: 0,
        failedRequests: 0,
        isAutoScaled: false
      });
    }

    const clientTypes = ['Browser', 'Mobile App', 'Desktop App', 'API Client', 'Custom'];
    const newClients = [];
    for (let i = 0; i < Math.min(5, clientCount); i++) {
      newClients.push({
        id: `cli-${i + 1}`,
        name: `Client ${i + 1} — ${clientTypes[i] || 'Client'}`,
        type: clientTypes[i] || 'Custom',
        enabled: true,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      });
    }

    setServers(newServers);
    setClients(newClients);
    saveServers(newServers);
    saveClients(newClients);
    setSimulationStatus('idle');

    return { servers: newServers, clients: newClients };
  }, []);

  /**
   * Playback Controls
   */
  const startSimulation = useCallback(() => {
    setSimulationStatus('running');
  }, []);

  const pauseSimulation = useCallback(() => {
    setSimulationStatus('paused');
    activeTimersRef.current.forEach(timerId => clearTimeout(timerId));
    activeTimersRef.current.clear();
  }, []);

  const resumeSimulation = useCallback(() => {
    setSimulationStatus('running');
    const currentGen = runGenerationRef.current;
    const speed = settings.simulationSpeed || 1;

    setActiveRequests(prev =>
      prev.map(r => {
        const remaining = Math.max(100, r.durationMs * (1 - (r.progress || 0) / 100));
        const effectiveDelay = Math.max(50, Math.round(remaining / speed));

        const timer = setTimeout(() => {
          if (runGenerationRef.current !== currentGen) return;
          handleRequestCompleted(r.id, r.serverId, r.clientId, false);
        }, effectiveDelay);

        activeTimersRef.current.set(r.id, timer);

        return {
          ...r,
          startTime: Date.now() - (r.durationMs - remaining) / speed
        };
      })
    );
  }, [settings.simulationSpeed, handleRequestCompleted]);

  const stopSimulation = useCallback(() => {
    setSimulationStatus('stopped');
    setQueuedRequests([]);
  }, []);

  const resetSimulation = useCallback(() => {
    runGenerationRef.current += 1;
    activeTimersRef.current.forEach(timerId => clearTimeout(timerId));
    activeTimersRef.current.clear();

    setActiveRequests([]);
    setQueuedRequests([]);
    setLatestDecision(null);
    setAutoScaleAlert(null);
    setSimulationStatus('idle');
    globalAlgorithmState.reset();

    const { servers: resetServers, clients: resetClients } = resetSimulationCountersStorage(servers, clients);
    setServers(resetServers);
    setClients(resetClients);
  }, [servers, clients]);

  /**
   * Load Demo Scenario preset
   */
  const loadDemoScenario = useCallback(() => {
    runGenerationRef.current += 1;
    activeTimersRef.current.forEach(timerId => clearTimeout(timerId));
    activeTimersRef.current.clear();

    setActiveRequests([]);
    setQueuedRequests([]);
    setLatestDecision(null);
    setAutoScaleAlert(null);
    globalAlgorithmState.reset();

    const freshServers = PRESET_DEMO_SERVERS.map(s => ({
      ...s,
      activeRequests: 0,
      totalAssigned: 0,
      completedRequests: 0,
      failedRequests: 0
    }));

    const freshClients = PRESET_DEMO_CLIENTS.map(c => ({
      ...c,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    }));

    setServers(freshServers);
    setClients(freshClients);
    saveServers(freshServers);
    saveClients(freshClients);
    setSimulationStatus('idle');
  }, []);

  const clearHistoryAction = useCallback(() => {
    clearRequestHistoryStorage();
    setHistory([]);
  }, []);

  const clearAllDataAction = useCallback(() => {
    runGenerationRef.current += 1;
    activeTimersRef.current.forEach(timerId => clearTimeout(timerId));
    activeTimersRef.current.clear();

    clearAllSimulatorDataStorage();
    setActiveRequests([]);
    setQueuedRequests([]);
    setLatestDecision(null);
    setAutoScaleAlert(null);
    setHistory([]);
    globalAlgorithmState.reset();

    // Clean empty default
    setServers([]);
    setClients([]);
    setSettings(DEFAULT_SETTINGS);
    setSimulationStatus('idle');
  }, []);

  const addClient = useCallback((client) => {
    setClients(prev => [...prev, client]);
  }, []);

  const editClient = useCallback((updatedClient) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  }, []);

  const deleteClient = useCallback((clientId) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
  }, []);

  const addServer = useCallback((server) => {
    setServers(prev => [...prev, server]);
  }, []);

  const editServer = useCallback((updatedServer) => {
    setServers(prev => prev.map(s => s.id === updatedServer.id ? { ...s, ...updatedServer } : s));
  }, []);

  const toggleServerEnabled = useCallback((serverId) => {
    setServers(prev =>
      prev.map(s => s.id === serverId ? { ...s, enabled: !s.enabled } : s)
    );
  }, []);

  const toggleServerPaused = useCallback((serverId) => {
    setServers(prev =>
      prev.map(s => s.id === serverId ? { ...s, paused: !s.paused } : s)
    );
  }, []);

  const deleteServer = useCallback((serverId, forceDraining = false) => {
    if (forceDraining) {
      setActiveRequests(prev => prev.filter(r => r.serverId !== serverId));
    }
    setServers(prev => prev.filter(s => s.id !== serverId));
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        clients,
        servers,
        history,
        settings,
        selectedAlgorithm,
        simulationStatus,
        activeRequests,
        queuedRequests,
        latestDecision,
        autoScaleAlert,
        stats,
        socketConnected,
        setSelectedAlgorithm,
        setSettings,
        sendOneRequest,
        runMultiClientSimulation,
        initializeFleet,
        startSimulation,
        pauseSimulation,
        resumeSimulation,
        stopSimulation,
        resetSimulation,
        loadDemoScenario,
        clearHistoryAction,
        clearAllDataAction,
        addClient,
        editClient,
        deleteClient,
        addServer,
        editServer,
        deleteServer,
        toggleServerEnabled,
        toggleServerPaused,
        submitFormRequest,
        syncFromBackend
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
