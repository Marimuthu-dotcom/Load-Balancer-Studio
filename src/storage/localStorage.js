/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LocalStorage Persistence Layer for Network Load Balancing Simulator
 * Uses namespaced keys to safely manage and isolate simulator state.
 */

const STORAGE_KEYS = {
  CLIENTS: 'nlb_sim_clients_v2',
  SERVERS: 'nlb_sim_servers_v2',
  HISTORY: 'nlb_sim_history_v2',
  SETTINGS: 'nlb_sim_settings_v2',
  STATS: 'nlb_sim_stats_v2'
};

export const DEFAULT_SETTINGS = {
  simulationSpeed: 1, // 0.25x to 5x
  defaultDurationMs: 2500, // Duration in ms
  queueingEnabled: true, // If false, reject when no servers available
  autoScaleOnOverload: true, // Dynamically spawn replica servers when overloaded
  defaultAlgorithm: 'ROUND_ROBIN',
  animationSpeed: 'normal',
  autoDispatchQueued: true
};

// Clean default: starts empty by default as requested by user
export const DEFAULT_SERVERS = [];
export const DEFAULT_CLIENTS = [];

// Preset Demo Fleet for 1-click loading or quick setup
export const PRESET_DEMO_SERVERS = [
  {
    id: 'srv-a',
    name: 'Server A (High-Capacity)',
    enabled: true,
    paused: false,
    weight: 5,
    maxCapacity: 10,
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
    concurrencyLimit: 2,
    activeRequests: 0,
    totalAssigned: 0,
    completedRequests: 0,
    failedRequests: 0,
    isAutoScaled: false
  }
];

export const PRESET_DEMO_CLIENTS = [
  {
    id: 'cli-1',
    name: 'Client 1 — Web Browser',
    type: 'Browser',
    enabled: true,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0
  },
  {
    id: 'cli-2',
    name: 'Client 2 — Mobile App',
    type: 'Mobile App',
    enabled: true,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0
  },
  {
    id: 'cli-3',
    name: 'Client 3 — Desktop App',
    type: 'Desktop App',
    enabled: true,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0
  },
  {
    id: 'cli-4',
    name: 'Client 4 — API Client',
    type: 'API Client',
    enabled: true,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0
  },
  {
    id: 'cli-5',
    name: 'Client 5 — Test Runner',
    type: 'Custom',
    enabled: true,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0
  }
];

/**
 * Safely read from localStorage with fallback
 */
export function loadFromStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch (err) {
    console.warn(`[Storage] Failed to read ${key}:`, err);
    return defaultValue;
  }
}

/**
 * Safely save to localStorage
 */
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Storage] Failed to save ${key}:`, err);
  }
}

export function loadClients() {
  return loadFromStorage(STORAGE_KEYS.CLIENTS, DEFAULT_CLIENTS);
}

export function saveClients(clients) {
  saveToStorage(STORAGE_KEYS.CLIENTS, clients);
}

export function loadServers() {
  const loaded = loadFromStorage(STORAGE_KEYS.SERVERS, DEFAULT_SERVERS);
  // Ensure transient activeRequests is sanitized to 0 on initial app load if stale
  return loaded.map(s => ({
    ...s,
    activeRequests: 0
  }));
}

export function saveServers(servers) {
  saveToStorage(STORAGE_KEYS.SERVERS, servers);
}

export function loadHistory() {
  return loadFromStorage(STORAGE_KEYS.HISTORY, []);
}

export function saveHistory(history) {
  const capped = history.slice(0, 500);
  saveToStorage(STORAGE_KEYS.HISTORY, capped);
}

export function loadSettings() {
  const stored = loadFromStorage(STORAGE_KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings) {
  saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Action 1: Clear only request history records
 */
export function clearRequestHistoryStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    return true;
  } catch (err) {
    console.error('[Storage] Error clearing history:', err);
    return false;
  }
}

/**
 * Action 2: Reset simulation activity/counters while retaining configuration
 */
export function resetSimulationCountersStorage(currentServers, currentClients) {
  const resetServers = currentServers.map(s => ({
    ...s,
    activeRequests: 0,
    totalAssigned: 0,
    completedRequests: 0,
    failedRequests: 0
  }));

  const resetClients = currentClients.map(c => ({
    ...c,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0
  }));

  saveServers(resetServers);
  saveClients(resetClients);
  return { servers: resetServers, clients: resetClients };
}

/**
 * Action 3: Clear all simulator data under the simulator's namespaced keys
 */
export function clearAllSimulatorDataStorage() {
  try {
    Object.values(STORAGE_KEYS).forEach(k => {
      localStorage.removeItem(k);
    });
    return true;
  } catch (err) {
    console.error('[Storage] Error clearing all simulator data:', err);
    return false;
  }
}

export function getStorageUsage() {
  try {
    let totalBytes = 0;
    Object.values(STORAGE_KEYS).forEach(k => {
      const item = localStorage.getItem(k);
      if (item) totalBytes += item.length * 2;
    });
    return {
      bytes: totalBytes,
      kb: (totalBytes / 1024).toFixed(2),
      keysCount: Object.values(STORAGE_KEYS).length
    };
  } catch (err) {
    return { bytes: 0, kb: '0.00', keysCount: 0 };
  }
}
