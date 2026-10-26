/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HTTP API Client for Authoritative Backend Communication
 */

const API_BASE = '/api';

export async function fetchState() {
  try {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API] Failed to fetch state from backend:', err.message);
    return null;
  }
}

export async function submitRequestToApi(requestData) {
  try {
    const idempotencyKey = requestData.idempotencyKey || `req-sub-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        ...requestData,
        idempotencyKey
      })
    });
    return await res.json();
  } catch (err) {
    console.error('[API] Submit request error:', err);
    throw err;
  }
}

export async function updateAlgorithmInApi(algorithm) {
  try {
    const res = await fetch(`${API_BASE}/algorithm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algorithm })
    });
    return await res.json();
  } catch (err) {
    console.error('[API] Update algorithm error:', err);
  }
}

export async function updateServerInApi(serverId, updates) {
  try {
    const res = await fetch(`${API_BASE}/servers/${serverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return await res.json();
  } catch (err) {
    console.error('[API] Update server error:', err);
  }
}

export async function addServerToApi(serverData) {
  try {
    const res = await fetch(`${API_BASE}/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverData)
    });
    return await res.json();
  } catch (err) {
    console.error('[API] Add server error:', err);
  }
}

export async function deleteServerFromApi(serverId) {
  try {
    const res = await fetch(`${API_BASE}/servers/${serverId}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (err) {
    console.error('[API] Delete server error:', err);
  }
}

export async function updateSettingsInApi(settings) {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return await res.json();
  } catch (err) {
    console.error('[API] Update settings error:', err);
  }
}

export async function resetSimulationInApi() {
  try {
    const res = await fetch(`${API_BASE}/reset`, {
      method: 'POST'
    });
    return await res.json();
  } catch (err) {
    console.error('[API] Reset error:', err);
  }
}

export async function loadDemoScenarioInApi() {
  try {
    const res = await fetch(`${API_BASE}/demo-scenario`, {
      method: 'POST'
    });
    return await res.json();
  } catch (err) {
    console.error('[API] Demo scenario error:', err);
  }
}

export async function clearAllInApi() {
  try {
    const res = await fetch(`${API_BASE}/clear-all`, {
      method: 'POST'
    });
    return await res.json();
  } catch (err) {
    console.error('[API] Clear all error:', err);
  }
}
