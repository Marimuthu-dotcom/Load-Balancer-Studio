/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Core Load Balancing Algorithms Engine
 * 
 * Implements:
 * 1. Round Robin (RR)
 * 2. Weighted Round Robin (WRR - Smooth NGINX interleaved deficit algorithm)
 * 3. Least Connections (LC)
 * 4. Weighted Least Connections (WLC)
 * 5. Capacity-Based Selection (CBS)
 * 6. Least Connections with Capacity & Concurrency Limits (LCC)
 */

export const ALGORITHM_INFO = {
  ROUND_ROBIN: {
    id: 'ROUND_ROBIN',
    name: 'Round Robin',
    shortCode: 'RR',
    description: 'Sequentially passes requests to the next available server in a fixed circular order.',
    complexity: 'O(1)',
    useCase: 'Identical server hardware specs with uniform request processing loads.',
    formula: 'Server = ServerList[(Index + 1) % Count]'
  },
  WEIGHTED_ROUND_ROBIN: {
    id: 'WEIGHTED_ROUND_ROBIN',
    name: 'Weighted Round Robin',
    shortCode: 'WRR',
    description: 'Distributes requests proportionally based on configured server weight ratings using smooth interleaving.',
    complexity: 'O(N)',
    useCase: 'Heterogeneous server fleets with varying CPU/RAM capacities under uniform request loads.',
    formula: 'Share ≈ Weight_i / ∑ Weight_k'
  },
  LEAST_CONNECTIONS: {
    id: 'LEAST_CONNECTIONS',
    name: 'Least Connections',
    shortCode: 'LC',
    description: 'Directs new traffic to the server with the fewest active concurrent connections at that moment.',
    complexity: 'O(N)',
    useCase: 'Dynamic workloads with widely varying request processing durations (e.g. video encoding, long polling).',
    formula: 'Server = argmin(ActiveRequests_i)'
  },
  WEIGHTED_LEAST_CONNECTIONS: {
    id: 'WEIGHTED_LEAST_CONNECTIONS',
    name: 'Weighted Least Connections',
    shortCode: 'WLC',
    description: 'Calculates a normalized load score (Active Requests / Weight) and selects the server with the lowest score.',
    complexity: 'O(N)',
    useCase: 'Different server hardware handling requests with unpredictable, non-uniform durations.',
    formula: 'Load Score = ActiveRequests / Weight'
  },
  CAPACITY_BASED: {
    id: 'CAPACITY_BASED',
    name: 'Capacity-Based Selection',
    shortCode: 'CBS',
    description: 'Evaluates headroom by computing Remaining Capacity (Max Capacity − Active) and picks the server with the most room.',
    complexity: 'O(N)',
    useCase: 'Memory-constrained clusters or microservices with strict hard ceilings on active allocations.',
    formula: 'Remaining Capacity = MaxCapacity − ActiveRequests'
  },
  LEAST_CONNECTIONS_WITH_LIMITS: {
    id: 'LEAST_CONNECTIONS_WITH_LIMITS',
    name: 'Least Connections (with Limits)',
    shortCode: 'LCC',
    description: 'Enforces hard capacity & concurrency ceilings first, then assigns to the server with lowest load score (Active / Weight).',
    complexity: 'O(N)',
    useCase: 'Production-grade admission control: strictly prevents overloading servers while balancing dynamically.',
    formula: 'Admission Filter: Active < Concurrency & Active < Capacity → min(Active / Weight)'
  }
};

/**
 * Filter servers to find eligible candidates and log why servers were skipped.
 */
export function evaluateServerEligibility(servers, options = { checkCapacity: true, checkConcurrency: true }) {
  const eligible = [];
  const skipped = [];

  for (const s of servers) {
    if (!s.enabled) {
      skipped.push({ server: s, reason: 'Server is administratively disabled.' });
      continue;
    }
    if (s.paused) {
      skipped.push({ server: s, reason: 'Server processing is paused.' });
      continue;
    }
    if (options.checkCapacity && s.activeRequests >= s.maxCapacity) {
      skipped.push({
        server: s,
        reason: `Server reached max capacity (${s.activeRequests}/${s.maxCapacity}).`
      });
      continue;
    }
    if (options.checkConcurrency && s.activeRequests >= s.concurrencyLimit) {
      skipped.push({
        server: s,
        reason: `Server reached concurrency limit (${s.activeRequests}/${s.concurrencyLimit}).`
      });
      continue;
    }
    eligible.push(s);
  }

  return { eligible, skipped };
}

/**
 * State store for stateful algorithms (Round Robin pointer and WRR current weights)
 */
class AlgorithmState {
  constructor() {
    this.roundRobinIndex = 0;
    this.wrrCurrentWeights = {}; // serverId -> number
  }

  reset() {
    this.roundRobinIndex = 0;
    this.wrrCurrentWeights = {};
  }
}

export const globalAlgorithmState = new AlgorithmState();

/**
 * 1. Round Robin
 */
export function selectRoundRobin(servers, state = globalAlgorithmState) {
  const { eligible, skipped } = evaluateServerEligibility(servers);

  if (eligible.length === 0) {
    return {
      selectedServer: null,
      eligibleServers: [],
      skippedServers: skipped,
      algorithm: ALGORITHM_INFO.ROUND_ROBIN,
      explanation: 'No eligible servers available. All servers are either disabled, paused, or at their capacity/concurrency limits.',
      serverMetrics: {}
    };
  }

  // Circular rotation
  const selectedIndex = state.roundRobinIndex % eligible.length;
  const selectedServer = eligible[selectedIndex];

  // Advance pointer for the next request
  state.roundRobinIndex = (selectedIndex + 1) % eligible.length;

  const serverMetrics = {};
  servers.forEach(s => {
    serverMetrics[s.id] = {
      activeRequests: s.activeRequests,
      weight: s.weight,
      maxCapacity: s.maxCapacity,
      concurrencyLimit: s.concurrencyLimit,
      isEligible: eligible.some(e => e.id === s.id)
    };
  });

  const eligibleListStr = eligible.map((s, idx) => `${s.name} [#${idx + 1}]`).join(', ');
  const explanation = `${selectedServer.name} was selected via Round Robin circular rotation (slot ${selectedIndex + 1} of ${eligible.length} eligible servers: ${eligibleListStr}).`;

  return {
    selectedServer,
    eligibleServers: eligible,
    skippedServers: skipped,
    algorithm: ALGORITHM_INFO.ROUND_ROBIN,
    explanation,
    serverMetrics
  };
}

/**
 * 2. Weighted Round Robin
 * Implements smooth NGINX-style interleaved deficit weighted scheduling
 */
export function selectWeightedRoundRobin(servers, state = globalAlgorithmState) {
  const { eligible, skipped } = evaluateServerEligibility(servers);

  if (eligible.length === 0) {
    return {
      selectedServer: null,
      eligibleServers: [],
      skippedServers: skipped,
      algorithm: ALGORITHM_INFO.WEIGHTED_ROUND_ROBIN,
      explanation: 'No eligible servers available for Weighted Round Robin scheduling.',
      serverMetrics: {}
    };
  }

  let totalWeight = 0;
  for (const s of eligible) {
    const w = Math.max(1, Math.floor(s.weight || 1));
    totalWeight += w;
    if (typeof state.wrrCurrentWeights[s.id] !== 'number') {
      state.wrrCurrentWeights[s.id] = 0;
    }
  }

  // Step 1: Add effective weight to current weight
  for (const s of eligible) {
    const w = Math.max(1, Math.floor(s.weight || 1));
    state.wrrCurrentWeights[s.id] += w;
  }

  // Step 2: Find server with highest current weight (deterministic tie-breaking by lowest ID/index)
  let bestServer = eligible[0];
  let maxWeight = state.wrrCurrentWeights[bestServer.id];

  for (let i = 1; i < eligible.length; i++) {
    const s = eligible[i];
    const currentW = state.wrrCurrentWeights[s.id];
    if (currentW > maxWeight) {
      maxWeight = currentW;
      bestServer = s;
    } else if (currentW === maxWeight) {
      // Deterministic tie-breaker: order in eligible array
    }
  }

  // Step 3: Deduct total weight from the chosen server
  state.wrrCurrentWeights[bestServer.id] -= totalWeight;

  const serverMetrics = {};
  servers.forEach(s => {
    const w = s.weight || 1;
    const sharePercent = totalWeight > 0 && eligible.some(e => e.id === s.id)
      ? ((w / totalWeight) * 100).toFixed(1)
      : '0.0';
    serverMetrics[s.id] = {
      activeRequests: s.activeRequests,
      weight: s.weight,
      currentWeight: state.wrrCurrentWeights[s.id] ?? 0,
      targetRatio: `${sharePercent}%`,
      isEligible: eligible.some(e => e.id === s.id)
    };
  });

  const weightBreakdown = eligible
    .map(s => `${s.name} (weight: ${s.weight}, share: ${((s.weight / totalWeight) * 100).toFixed(0)}%)`)
    .join(', ');

  const explanation = `${bestServer.name} was selected by Weighted Round Robin. Among eligible servers (${weightBreakdown}), ${bestServer.name} had the highest accumulated priority (${maxWeight}) in the current scheduling cycle.`;

  return {
    selectedServer: bestServer,
    eligibleServers: eligible,
    skippedServers: skipped,
    algorithm: ALGORITHM_INFO.WEIGHTED_ROUND_ROBIN,
    explanation,
    serverMetrics
  };
}

/**
 * 3. Least Connections
 * Chooses the eligible server with the lowest number of active requests.
 * Tie-breaker: deterministic first in list (lowest index).
 */
export function selectLeastConnections(servers) {
  const { eligible, skipped } = evaluateServerEligibility(servers);

  if (eligible.length === 0) {
    return {
      selectedServer: null,
      eligibleServers: [],
      skippedServers: skipped,
      algorithm: ALGORITHM_INFO.LEAST_CONNECTIONS,
      explanation: 'No eligible servers available. All servers are either disabled, paused, or full.',
      serverMetrics: {}
    };
  }

  let minActive = Infinity;
  let candidates = [];

  for (const s of eligible) {
    if (s.activeRequests < minActive) {
      minActive = s.activeRequests;
      candidates = [s];
    } else if (s.activeRequests === minActive) {
      candidates.push(s);
    }
  }

  // Deterministic tie-breaking: pick first candidate in configured order
  const selectedServer = candidates[0];
  const tieBroken = candidates.length > 1;

  const serverMetrics = {};
  servers.forEach(s => {
    serverMetrics[s.id] = {
      activeRequests: s.activeRequests,
      weight: s.weight,
      isEligible: eligible.some(e => e.id === s.id)
    };
  });

  const loadSummary = eligible
    .map(s => `${s.name}: ${s.activeRequests} active`)
    .join(', ');

  let explanation = `${selectedServer.name} was selected because it had the fewest active requests (${selectedServer.activeRequests}) among eligible servers (${loadSummary}).`;

  if (tieBroken) {
    const tiedNames = candidates.map(c => c.name).join(', ');
    explanation += ` Tie detected between ${tiedNames}; deterministic priority assigned to ${selectedServer.name} by list order.`;
  }

  return {
    selectedServer,
    eligibleServers: eligible,
    skippedServers: skipped,
    algorithm: ALGORITHM_INFO.LEAST_CONNECTIONS,
    explanation,
    serverMetrics,
    tieBroken
  };
}

/**
 * 4. Weighted Least Connections
 * Score = Active Requests / Weight
 * Selects server with lowest score.
 */
export function selectWeightedLeastConnections(servers) {
  const { eligible, skipped } = evaluateServerEligibility(servers);

  if (eligible.length === 0) {
    return {
      selectedServer: null,
      eligibleServers: [],
      skippedServers: skipped,
      algorithm: ALGORITHM_INFO.WEIGHTED_LEAST_CONNECTIONS,
      explanation: 'No eligible servers available for Weighted Least Connections.',
      serverMetrics: {}
    };
  }

  let minScore = Infinity;
  let candidates = [];
  const serverMetrics = {};

  for (const s of eligible) {
    const weight = Math.max(1, s.weight || 1);
    const score = s.activeRequests / weight;
    serverMetrics[s.id] = {
      activeRequests: s.activeRequests,
      weight: s.weight,
      score: Number(score.toFixed(3)),
      isEligible: true
    };

    if (score < minScore) {
      minScore = score;
      candidates = [s];
    } else if (Math.abs(score - minScore) < 0.00001) {
      candidates.push(s);
    }
  }

  servers.forEach(s => {
    if (!serverMetrics[s.id]) {
      const weight = Math.max(1, s.weight || 1);
      serverMetrics[s.id] = {
        activeRequests: s.activeRequests,
        weight: s.weight,
        score: Number((s.activeRequests / weight).toFixed(3)),
        isEligible: false
      };
    }
  });

  const selectedServer = candidates[0];
  const tieBroken = candidates.length > 1;

  const scoreSummary = eligible
    .map(s => `${s.name} (active: ${s.activeRequests}, weight: ${s.weight} → score: ${(s.activeRequests / (s.weight || 1)).toFixed(2)})`)
    .join(', ');

  let explanation = `${selectedServer.name} was selected with the lowest load score (${(selectedServer.activeRequests / (selectedServer.weight || 1)).toFixed(2)} = ${selectedServer.activeRequests} active / ${selectedServer.weight} weight). Evaluated: ${scoreSummary}.`;

  if (tieBroken) {
    explanation += ` Tie broken deterministically by server ordering.`;
  }

  return {
    selectedServer,
    eligibleServers: eligible,
    skippedServers: skipped,
    algorithm: ALGORITHM_INFO.WEIGHTED_LEAST_CONNECTIONS,
    explanation,
    serverMetrics,
    tieBroken
  };
}

/**
 * 5. Capacity-Based Selection
 * Remaining Capacity = Maximum Capacity − Active Requests
 * Selects server with greatest remaining capacity.
 */
export function selectCapacityBased(servers) {
  const { eligible, skipped } = evaluateServerEligibility(servers);

  if (eligible.length === 0) {
    return {
      selectedServer: null,
      eligibleServers: [],
      skippedServers: skipped,
      algorithm: ALGORITHM_INFO.CAPACITY_BASED,
      explanation: 'No eligible servers available. All servers have zero remaining capacity or are disabled/paused.',
      serverMetrics: {}
    };
  }

  let maxRemaining = -Infinity;
  let candidates = [];
  const serverMetrics = {};

  for (const s of eligible) {
    const remaining = s.maxCapacity - s.activeRequests;
    serverMetrics[s.id] = {
      activeRequests: s.activeRequests,
      maxCapacity: s.maxCapacity,
      remainingCapacity: remaining,
      isEligible: true
    };

    if (remaining > maxRemaining) {
      maxRemaining = remaining;
      candidates = [s];
    } else if (remaining === maxRemaining) {
      candidates.push(s);
    }
  }

  servers.forEach(s => {
    if (!serverMetrics[s.id]) {
      serverMetrics[s.id] = {
        activeRequests: s.activeRequests,
        maxCapacity: s.maxCapacity,
        remainingCapacity: Math.max(0, s.maxCapacity - s.activeRequests),
        isEligible: false
      };
    }
  });

  const selectedServer = candidates[0];
  const tieBroken = candidates.length > 1;

  const capacitySummary = eligible
    .map(s => `${s.name} (${s.maxCapacity - s.activeRequests} slots left of ${s.maxCapacity})`)
    .join(', ');

  let explanation = `${selectedServer.name} was selected because it had the greatest remaining capacity (${maxRemaining} free slots of ${selectedServer.maxCapacity}). Candidates: ${capacitySummary}.`;

  if (tieBroken) {
    explanation += ` Multiple servers had ${maxRemaining} slots available; ${selectedServer.name} selected by deterministic tie-break.`;
  }

  return {
    selectedServer,
    eligibleServers: eligible,
    skippedServers: skipped,
    algorithm: ALGORITHM_INFO.CAPACITY_BASED,
    explanation,
    serverMetrics,
    tieBroken
  };
}

/**
 * 6. Least Connections with Capacity and Concurrency Limits
 * First excludes disabled, paused, capacity-reached, or concurrency-reached servers.
 * Then picks server with lowest (activeRequests / weight).
 */
export function selectLeastConnectionsWithLimits(servers) {
  // Strict check on both capacity and concurrency limits
  const { eligible, skipped } = evaluateServerEligibility(servers, {
    checkCapacity: true,
    checkConcurrency: true
  });

  if (eligible.length === 0) {
    return {
      selectedServer: null,
      eligibleServers: [],
      skippedServers: skipped,
      algorithm: ALGORITHM_INFO.LEAST_CONNECTIONS_WITH_LIMITS,
      explanation: 'No servers passed admission control. All servers are either disabled, paused, or reached hard capacity/concurrency limits.',
      serverMetrics: {}
    };
  }

  let minScore = Infinity;
  let candidates = [];
  const serverMetrics = {};

  for (const s of eligible) {
    const weight = Math.max(1, s.weight || 1);
    const score = s.activeRequests / weight;
    serverMetrics[s.id] = {
      activeRequests: s.activeRequests,
      concurrencyLimit: s.concurrencyLimit,
      maxCapacity: s.maxCapacity,
      weight: s.weight,
      score: Number(score.toFixed(3)),
      isEligible: true
    };

    if (score < minScore) {
      minScore = score;
      candidates = [s];
    } else if (Math.abs(score - minScore) < 0.00001) {
      candidates.push(s);
    }
  }

  servers.forEach(s => {
    if (!serverMetrics[s.id]) {
      const weight = Math.max(1, s.weight || 1);
      serverMetrics[s.id] = {
        activeRequests: s.activeRequests,
        concurrencyLimit: s.concurrencyLimit,
        maxCapacity: s.maxCapacity,
        weight: s.weight,
        score: Number((s.activeRequests / weight).toFixed(3)),
        isEligible: false
      };
    }
  });

  const selectedServer = candidates[0];
  const tieBroken = candidates.length > 1;

  const scoreSummary = eligible
    .map(s => `${s.name} [Active: ${s.activeRequests}/${s.concurrencyLimit} conc, Score: ${(s.activeRequests / (s.weight || 1)).toFixed(2)}]`)
    .join(', ');

  let explanation = `${selectedServer.name} was selected under hard admission limits with lowest score (${(selectedServer.activeRequests / (selectedServer.weight || 1)).toFixed(2)}). Evaluated: ${scoreSummary}.`;

  if (tieBroken) {
    explanation += ` Tie-break resolved via deterministic order.`;
  }

  return {
    selectedServer,
    eligibleServers: eligible,
    skippedServers: skipped,
    algorithm: ALGORITHM_INFO.LEAST_CONNECTIONS_WITH_LIMITS,
    explanation,
    serverMetrics,
    tieBroken
  };
}

/**
 * Universal algorithm dispatcher
 */
export function routeRequest(algorithmKey, servers, state = globalAlgorithmState) {
  switch (algorithmKey) {
    case 'ROUND_ROBIN':
      return selectRoundRobin(servers, state);
    case 'WEIGHTED_ROUND_ROBIN':
      return selectWeightedRoundRobin(servers, state);
    case 'LEAST_CONNECTIONS':
      return selectLeastConnections(servers);
    case 'WEIGHTED_LEAST_CONNECTIONS':
      return selectWeightedLeastConnections(servers);
    case 'CAPACITY_BASED':
      return selectCapacityBased(servers);
    case 'LEAST_CONNECTIONS_WITH_LIMITS':
      return selectLeastConnectionsWithLimits(servers);
    default:
      return selectRoundRobin(servers, state);
  }
}
