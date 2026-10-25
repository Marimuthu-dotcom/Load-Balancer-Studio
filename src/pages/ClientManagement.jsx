/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import { validateClient, validateRequestBatch } from '../engine/validation.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
  Users,
  Plus,
  Search,
  Send,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Smartphone,
  Globe,
  Monitor,
  Code2,
  HelpCircle,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function ClientManagement() {
  const {
    clients,
    history,
    addClient,
    editClient,
    deleteClient,
    sendOneRequest,
    sendBatchRequests,
    settings
  } = useSimulation();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Client for detail inspection
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);

  // Form states for Add/Edit
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Browser');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formErrors, setFormErrors] = useState([]);

  // Request generation panel state
  const [genCount, setGenCount] = useState(5);
  const [genDuration, setGenDuration] = useState(settings.defaultDurationMs || 2500);
  const [genPayload, setGenPayload] = useState('GET /api/v1/resource');
  const [genError, setGenError] = useState('');
  const [genSuccessMsg, setGenSuccessMsg] = useState('');

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ENABLED' && c.enabled) ||
        (statusFilter === 'DISABLED' && !c.enabled);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [clients, searchQuery, typeFilter, statusFilter]);

  // Selected Client
  const activeClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  // Client's request history
  const clientHistory = useMemo(() => {
    if (!activeClient) return [];
    return history.filter((h) => h.clientId === activeClient.id).slice(0, 15);
  }, [history, activeClient]);

  const openAddModal = () => {
    const nextNum = clients.length + 1;
    setFormId(`cli-${Date.now().toString(36).slice(-4)}`);
    setFormName(`Client ${nextNum} — Custom Client`);
    setFormType('Browser');
    setFormEnabled(true);
    setFormErrors([]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setFormId(client.id);
    setFormName(client.name);
    setFormType(client.type);
    setFormEnabled(client.enabled);
    setFormErrors([]);
  };

  const handleSaveClient = (e) => {
    e.preventDefault();
    const clientData = {
      id: formId.trim(),
      name: formName.trim(),
      type: formType,
      enabled: formEnabled,
      _originalId: editingClient?.id
    };

    const validation = validateClient(clientData, clients);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    if (editingClient) {
      editClient({
        ...editingClient,
        name: clientData.name,
        type: clientData.type,
        enabled: clientData.enabled
      });
      setEditingClient(null);
    } else {
      addClient({
        id: clientData.id,
        name: clientData.name,
        type: clientData.type,
        enabled: clientData.enabled,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      });
      setIsAddModalOpen(false);
      setSelectedClientId(clientData.id);
    }
  };

  const handleDeleteClient = () => {
    if (!deletingClient) return;
    deleteClient(deletingClient.id);
    if (selectedClientId === deletingClient.id) {
      const remaining = clients.filter(c => c.id !== deletingClient.id);
      setSelectedClientId(remaining[0]?.id || null);
    }
    setDeletingClient(null);
  };

  const handleSendSingle = () => {
    if (!activeClient) return;
    if (!activeClient.enabled) {
      setGenError(`Client "${activeClient.name}" is disabled. Enable it to send requests.`);
      return;
    }
    setGenError('');
    sendOneRequest({
      clientId: activeClient.id,
      durationMs: Number(genDuration),
      payloadDescription: genPayload
    });
    setGenSuccessMsg(`Dispatched 1 request from ${activeClient.name}`);
    setTimeout(() => setGenSuccessMsg(''), 2500);
  };

  const handleSendBatch = () => {
    if (!activeClient) return;
    const batchValidation = validateRequestBatch(
      { count: genCount, durationMs: genDuration, clientId: activeClient.id },
      clients
    );
    if (!batchValidation.isValid) {
      setGenError(batchValidation.errors.join(' '));
      return;
    }
    setGenError('');
    sendBatchRequests({
      clientId: activeClient.id,
      count: Number(genCount),
      durationMs: Number(genDuration),
      payloadDescription: genPayload
    });
    setGenSuccessMsg(`Queued batch of ${genCount} requests from ${activeClient.name}`);
    setTimeout(() => setGenSuccessMsg(''), 2500);
  };

  const getClientIcon = (type) => {
    switch (type) {
      case 'Browser':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'Mobile App':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'Desktop App':
        return <Monitor className="w-4 h-4 text-purple-400" />;
      case 'API Client':
        return <Code2 className="w-4 h-4 text-amber-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#252526] border border-[#2d2d30]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Client Management
          </h2>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Configure client nodes, send individual or batch requests, and inspect per-client telemetry.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Main Grid: Client List & Controls + Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Client List with Search & Filter */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-3 bg-[#252526] border border-[#2d2d30] rounded-lg flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#71717a] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by client ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#18181b] border border-[#3e3e42] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#18181b] border border-[#3e3e42] rounded-md px-2.5 py-1.5 text-xs text-[#cccccc] focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="Browser">Browser</option>
                <option value="Mobile App">Mobile App</option>
                <option value="Desktop App">Desktop App</option>
                <option value="API Client">API Client</option>
                <option value="Custom">Custom</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#18181b] border border-[#3e3e42] rounded-md px-2.5 py-1.5 text-xs text-[#cccccc] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ENABLED">Enabled Only</option>
                <option value="DISABLED">Disabled Only</option>
              </select>
            </div>
          </div>

          {/* Clients Table / Cards */}
          <div className="bg-[#252526] border border-[#2d2d30] rounded-lg overflow-hidden">
            {clients.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#858585] space-y-3">
                <Users className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">No Client Nodes Registered</p>
                  <p className="text-[11px] text-[#71717a]">Create a client node below or deploy the standard demo fleet.</p>
                </div>
                <button
                  onClick={openAddModal}
                  className="px-4 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-colors"
                >
                  Create Client
                </button>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#858585] space-y-2">
                <p>No clients match the current search or filters.</p>
                <button
                  onClick={() => { setSearchQuery(''); setTypeFilter('ALL'); setStatusFilter('ALL'); }}
                  className="text-amber-400 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#2d2d30] bg-[#1e1e1e] text-[#858585] font-mono text-[11px]">
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Total Requests</th>
                      <th className="py-2.5 px-3">Success / Fail</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d2d30]">
                    {filteredClients.map((client) => {
                      const isSelected = selectedClientId === client.id;
                      return (
                        <tr
                          key={client.id}
                          onClick={() => setSelectedClientId(client.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#2a2d2e] border-l-2 border-l-[#f59e0b]' : 'hover:bg-[#202023]'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              {getClientIcon(client.type)}
                              <div>
                                <div className="font-semibold text-white">{client.name}</div>
                                <div className="text-[10px] text-[#71717a] font-mono">{client.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#a1a1aa]">{client.type}</td>
                          <td className="py-3 px-3">
                            {client.enabled ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                                Enabled
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/60 border border-red-800 text-red-400">
                                Disabled
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-white">
                            {client.totalRequests || 0}
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-[11px]">
                            <span className="text-emerald-400">{client.successfulRequests || 0}</span>
                            <span className="text-[#52525b] mx-1">/</span>
                            <span className="text-red-400">{client.failedRequests || 0}</span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openEditModal(client)}
                              className="p-1 text-[#858585] hover:text-white hover:bg-[#333338] rounded"
                              title="Edit Client"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingClient(client)}
                              className="p-1 text-[#858585] hover:text-red-400 hover:bg-red-950/50 rounded"
                              title="Delete Client"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Request Generation Controls Panel */}
          {activeClient && (
            <div className="p-4 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#2d2d30] pb-2">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Generate Traffic from {activeClient.name}
                  </h3>
                </div>
                {!activeClient.enabled && (
                  <span className="text-[11px] text-red-400 bg-red-950/60 border border-red-800 px-2 py-0.5 rounded">
                    Client Disabled
                  </span>
                )}
              </div>

              {genError && (
                <div className="p-2.5 bg-red-950/50 border border-red-800 rounded text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{genError}</span>
                </div>
              )}

              {genSuccessMsg && (
                <div className="p-2.5 bg-emerald-950/50 border border-emerald-800 rounded text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{genSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-[#858585] mb-1">Batch Request Count</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={genCount}
                    onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={!activeClient.enabled}
                    className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#858585] mb-1">Processing Duration (ms)</label>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    max="30000"
                    value={genDuration}
                    onChange={(e) => setGenDuration(Math.max(100, parseInt(e.target.value) || 1000))}
                    disabled={!activeClient.enabled}
                    className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#858585] mb-1">Payload / Route Description</label>
                  <input
                    type="text"
                    value={genPayload}
                    onChange={(e) => setGenPayload(e.target.value)}
                    disabled={!activeClient.enabled}
                    placeholder="e.g. GET /api/v1/items"
                    className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b] disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSendSingle}
                  disabled={!activeClient.enabled}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#27272a] hover:bg-[#323238] border border-[#3f3f46] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Send 1 Request
                </button>
                <button
                  onClick={handleSendBatch}
                  disabled={!activeClient.enabled}
                  className="px-4 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Send Batch ({genCount} Requests)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Client Details Panel & Filtered History */}
        <div className="space-y-4">
          {activeClient ? (
            <div className="p-4 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#2d2d30] pb-3">
                <div className="flex items-center gap-2">
                  {getClientIcon(activeClient.type)}
                  <div>
                    <h3 className="text-sm font-bold text-white">{activeClient.name}</h3>
                    <span className="text-[10px] text-[#71717a] font-mono">ID: {activeClient.id}</span>
                  </div>
                </div>
                <button
                  onClick={() => openEditModal(activeClient)}
                  className="text-xs text-amber-400 hover:underline"
                >
                  Edit
                </button>
              </div>

              {/* Client Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-[#18181b] border border-[#2d2d30] rounded">
                  <div className="text-[10px] text-[#858585]">Total</div>
                  <div className="text-sm font-bold font-mono text-white tabular-nums">
                    {activeClient.totalRequests || 0}
                  </div>
                </div>
                <div className="p-2 bg-[#18181b] border border-[#2d2d30] rounded">
                  <div className="text-[10px] text-[#858585]">Success</div>
                  <div className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                    {activeClient.successfulRequests || 0}
                  </div>
                </div>
                <div className="p-2 bg-[#18181b] border border-[#2d2d30] rounded">
                  <div className="text-[10px] text-[#858585]">Failed</div>
                  <div className="text-sm font-bold font-mono text-red-400 tabular-nums">
                    {activeClient.failedRequests || 0}
                  </div>
                </div>
              </div>

              {/* Client Status Information */}
              <div className="space-y-1.5 text-xs text-[#a1a1aa] bg-[#1e1e1e] p-3 rounded border border-[#2d2d30]">
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Client Class:</span>
                  <span className="text-white font-medium">{activeClient.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Traffic Allowed:</span>
                  <span className={activeClient.enabled ? 'text-emerald-400' : 'text-red-400'}>
                    {activeClient.enabled ? 'Yes (Active)' : 'No (Blocked)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Success Rate:</span>
                  <span className="font-mono text-white">
                    {activeClient.totalRequests > 0
                      ? `${Math.round(((activeClient.successfulRequests || 0) / activeClient.totalRequests) * 100)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Recent Activity for this client */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#858585]">
                  <span>Recent Requests ({clientHistory.length})</span>
                </div>

                {clientHistory.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#71717a] border border-dashed border-[#3e3e42] rounded">
                    No requests dispatched from this client yet.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {clientHistory.map((h) => (
                      <div
                        key={h.id}
                        className="p-2 bg-[#1e1e1e] border border-[#2d2d30] rounded text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-amber-400">{h.id}</span>
                          <span className={h.status === 'completed' ? 'text-emerald-400' : h.status === 'rejected' ? 'text-red-400' : 'text-blue-400'}>
                            {h.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#858585]">
                          <span>Server: {h.serverName || 'None'}</span>
                          <span>{h.durationMs}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#858585] border border-dashed border-[#3e3e42] rounded-lg">
              No client selected. Click a client row to view details.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={isAddModalOpen || editingClient !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingClient(null);
        }}
        title={editingClient ? `Edit Client: ${editingClient.name}` : 'Add New Client'}
      >
        <form onSubmit={handleSaveClient} className="space-y-4">
          {formErrors.length > 0 && (
            <div className="p-2.5 bg-red-950/50 border border-red-800 rounded text-xs text-red-300 space-y-1">
              {formErrors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#cccccc] mb-1">Client ID</label>
            <input
              type="text"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              disabled={editingClient !== null}
              placeholder="e.g. cli-web-1"
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b] disabled:opacity-60"
            />
            {editingClient && (
              <span className="text-[10px] text-[#71717a] mt-0.5 block">Client ID cannot be modified after creation.</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#cccccc] mb-1">Client Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Production iOS Client"
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#cccccc] mb-1">Client Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="Browser">Browser</option>
              <option value="Mobile App">Mobile App</option>
              <option value="Desktop App">Desktop App</option>
              <option value="API Client">API Client</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="client-enabled-chk"
              checked={formEnabled}
              onChange={(e) => setFormEnabled(e.target.checked)}
              className="rounded bg-[#18181b] border-[#3e3e42] text-[#f59e0b] focus:ring-0"
            />
            <label htmlFor="client-enabled-chk" className="text-xs text-[#cccccc] cursor-pointer">
              Client is enabled (generates requests)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#3e3e42]">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingClient(null);
              }}
              className="px-3 py-1.5 text-xs text-[#cccccc] bg-[#2d2d30] hover:bg-[#3e3e42] rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded"
            >
              {editingClient ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Client Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingClient !== null}
        onClose={() => setDeletingClient(null)}
        onConfirm={handleDeleteClient}
        title="Delete Client?"
        message={`Are you sure you want to delete client "${deletingClient?.name}" (${deletingClient?.id})? Any completed historical records from this client will remain in history logs.`}
        confirmText="Delete Client"
        isDanger={true}
      />
    </div>
  );
}
