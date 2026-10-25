/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Input Validation & Edge Case Guardrails for Load Balancing Simulator
 */

export function validateClient(client, existingClients = []) {
  const errors = [];

  if (!client.id || typeof client.id !== 'string' || client.id.trim() === '') {
    errors.push('Client ID is required.');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(client.id.trim())) {
    errors.push('Client ID can only contain letters, numbers, hyphens, and underscores.');
  } else {
    const isDuplicate = existingClients.some(
      c => c.id.toLowerCase() === client.id.trim().toLowerCase() && c.id !== client._originalId
    );
    if (isDuplicate) {
      errors.push(`Client ID "${client.id}" is already in use.`);
    }
  }

  if (!client.name || typeof client.name !== 'string' || client.name.trim() === '') {
    errors.push('Client name is required.');
  } else if (client.name.trim().length > 50) {
    errors.push('Client name must be 50 characters or less.');
  }

  const validTypes = ['Browser', 'Mobile App', 'Desktop App', 'API Client', 'Custom'];
  if (!validTypes.includes(client.type)) {
    errors.push(`Client type must be one of: ${validTypes.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateServer(server, existingServers = []) {
  const errors = [];

  if (!server.id || typeof server.id !== 'string' || server.id.trim() === '') {
    errors.push('Server ID is required.');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(server.id.trim())) {
    errors.push('Server ID can only contain letters, numbers, hyphens, and underscores.');
  } else {
    const isDuplicate = existingServers.some(
      s => s.id.toLowerCase() === server.id.trim().toLowerCase() && s.id !== server._originalId
    );
    if (isDuplicate) {
      errors.push(`Server ID "${server.id}" is already in use.`);
    }
  }

  if (!server.name || typeof server.name !== 'string' || server.name.trim() === '') {
    errors.push('Server name is required.');
  } else if (server.name.trim().length > 50) {
    errors.push('Server name must be 50 characters or less.');
  }

  const weight = Number(server.weight);
  if (isNaN(weight) || weight < 1 || !Number.isInteger(weight)) {
    errors.push('Weight must be a positive integer greater than or equal to 1.');
  }

  const maxCapacity = Number(server.maxCapacity);
  if (isNaN(maxCapacity) || maxCapacity < 1 || !Number.isInteger(maxCapacity)) {
    errors.push('Maximum capacity must be an integer greater than or equal to 1.');
  }

  const concurrencyLimit = Number(server.concurrencyLimit);
  if (isNaN(concurrencyLimit) || concurrencyLimit < 1 || !Number.isInteger(concurrencyLimit)) {
    errors.push('Concurrency limit must be an integer greater than or equal to 1.');
  } else if (concurrencyLimit > maxCapacity) {
    errors.push(`Concurrency limit (${concurrencyLimit}) cannot exceed maximum capacity (${maxCapacity}).`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateRequestBatch({ count, durationMs, clientId }, clients) {
  const errors = [];

  const targetClient = clients.find(c => c.id === clientId);
  if (!targetClient) {
    errors.push('Please select a valid client.');
  } else if (!targetClient.enabled) {
    errors.push(`Client "${targetClient.name}" is disabled and cannot generate requests.`);
  }

  const numCount = Number(count);
  if (isNaN(numCount) || numCount < 1 || !Number.isInteger(numCount)) {
    errors.push('Request count must be an integer of at least 1.');
  } else if (numCount > 100) {
    errors.push('Request count cannot exceed 100 per batch for smooth visualization.');
  }

  const numDuration = Number(durationMs);
  if (isNaN(numDuration) || numDuration < 100) {
    errors.push('Processing duration must be at least 100ms.');
  } else if (numDuration > 60000) {
    errors.push('Processing duration cannot exceed 60,000ms (1 minute).');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
