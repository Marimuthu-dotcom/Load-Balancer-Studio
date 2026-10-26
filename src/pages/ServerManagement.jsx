/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import { validateServer } from '../engine/validation.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
  Server,
  Plus,
  Play,
  Pause,
  Power,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  Scale,
  Gauge
} from 'lucide-react';

export default function ServerManagement() {
  const {
    servers,
    addServer,
    editServer,
    deleteServer,
    toggleServerEnabled,
    toggleServerPaused,
    queuedRequests
  } = useSimulation();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [deletingServer, setDeletingServer] = useState(null);
  const [forceDrainCheck, setForceDrainCheck] = useState(true);

  // Form Fields
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formWeight, setFormWeight] = useState(3);
  const [formMaxCapacity, setFormMaxCapacity] = useState(8);
  const [formConcurrencyLimit, setFormConcurrencyLimit] = useState(3);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formPaused, setFormPaused] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  const openAddModal = () => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const nextLetter = letters[servers.length] || `X${servers.length + 1}`;
    setFormId(`srv-${nextLetter.toLowerCase()}`);
    setFormName(`Server ${nextLetter} (Custom)`);
    setFormWeight(3);
    setFormMaxCapacity(8);
    setFormConcurrencyLimit(3);
    setFormEnabled(true);
    setFormPaused(false);
    setFormErrors([]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (server) => {
    setEditingServer(server);
    setFormId(server.id);
    setFormName(server.name);
    setFormWeight(server.weight);
    setFormMaxCapacity(server.maxCapacity);
    setFormConcurrencyLimit(server.concurrencyLimit);
    setFormEnabled(server.enabled);
    setFormPaused(server.paused);
    setFormErrors([]);
  };

  const handleSaveServer = (e) => {
    e.preventDefault();
    const serverData = {
      id: formId.trim(),
      name: formName.trim(),
      weight: Number(formWeight),
      maxCapacity: Number(formMaxCapacity),
      concurrencyLimit: Number(formConcurrencyLimit),
      enabled: formEnabled,
      paused: formPaused,
      _originalId: editingServer?.id
    };

    const validation = validateServer(serverData, servers);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    if (editingServer) {
      editServer({
        ...editingServer,
        name: serverData.name,
        weight: serverData.weight,
        maxCapacity: serverData.maxCapacity,
        concurrencyLimit: serverData.concurrencyLimit,
        enabled: serverData.enabled,
        paused: serverData.paused
      });
      setEditingServer(null);
    } else {
      addServer({
        id: serverData.id,
        name: serverData.name,
        weight: serverData.weight,
        maxCapacity: serverData.maxCapacity,
        concurrencyLimit: serverData.concurrencyLimit,
        enabled: serverData.enabled,
        paused: serverData.paused,
        activeRequests: 0,
        totalAssigned: 0,
        completedRequests: 0,
        failedRequests: 0
      });
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteServerConfirm = () => {
    if (!deletingServer) return;
    deleteServer(deletingServer.id, forceDrainCheck);
    setDeletingServer(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#252526] border border-[#2d2d30]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" />
            Server Fleet Management
          </h2>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Configure server weights, concurrency limits, maximum capacities, and administrative states (Enable / Disable / Pause).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Server</span>
        </button>
      </div>

      {/* Servers Cards Grid */}
      {servers.length === 0 ? (
        <div className="p-8 bg-[#252526] border border-dashed border-[#3e3e42] rounded-xl text-center space-y-4">
          <Server className="w-10 h-10 text-amber-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Servers in Fleet</h3>
            <p className="text-xs text-[#858585]">
              You can add servers individually or click below to deploy the standard 3-server topology.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded-md transition-colors"
          >
            Create Your First Server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {servers.map((server) => {
            const active = server.activeRequests || 0;
            const maxCap = Math.max(1, server.maxCapacity || 1);
            const conc = Math.max(1, server.concurrencyLimit || 1);
            const currentW = server.currentWorkload !== undefined ? server.currentWorkload : active;
            const remainingCap = Math.max(0, maxCap - currentW);
            const remainingConc = Math.max(0, conc - active);

            const workloadPercent = Math.min(100, Math.max(0, Math.round((currentW / maxCap) * 100)));
            const concurrencyPercent = Math.min(100, Math.max(0, Math.round((active / conc) * 100)));

            return (
              <div
                key={server.id}
                className={`p-5 rounded-lg border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  !server.enabled
                    ? 'bg-[#1e1e1e]/60 border-red-950/60 opacity-80'
                    : server.paused
                    ? 'bg-[#1e1e1e] border-amber-900/60'
                    : server.isAutoScaled
                    ? 'bg-[#252526] border-amber-500/80 shadow-md'
                    : 'bg-[#252526] border-[#2d2d30] shadow-sm'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-white tracking-tight">
                          {server.name}
                        </h3>
                        {server.isAutoScaled && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded font-semibold">
                            Auto-Replica
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#71717a] font-mono">
                        ID: {server.id} {server.scaledFrom && `· From: ${server.scaledFrom}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!server.enabled ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-400">
                          DISABLED
                        </span>
                      ) : server.paused ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-400">
                          PAUSED
                        </span>
                      ) : active >= conc ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-400 font-bold">
                          OVERLOADED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
                          ONLINE
                        </span>
                      )}
                    </div>
                  </div>

                {/* State Toggles (Enable/Disable & Pause/Resume) */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#2d2d30]/70">
                  <button
                    onClick={() => toggleServerEnabled(server.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded text-[11px] font-medium transition-colors border ${
                      server.enabled
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                        : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{server.enabled ? 'Disable' : 'Enable'}</span>
                  </button>

                  <button
                    onClick={() => toggleServerPaused(server.id)}
                    disabled={!server.enabled}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded text-[11px] font-medium transition-colors border disabled:opacity-40 ${
                      server.paused
                        ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {server.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{server.paused ? 'Resume' : 'Pause'}</span>
                  </button>
                </div>
              </div>

              {/* Core Attributes Grid */}
              <div className="grid grid-cols-3 gap-2 py-1">
                <div className="p-2 bg-[#18181b] border border-[#2d2d30] rounded text-center">
                  <div className="text-[10px] text-[#858585] flex items-center justify-center gap-1">
                    <Scale className="w-3 h-3 text-amber-400" />
                    Weight
                  </div>
                  <div className="text-sm font-bold font-mono text-white tabular-nums mt-0.5">
                    {server.weight}
                  </div>
                </div>

                <div className="p-2 bg-[#18181b] border border-[#2d2d30] rounded text-center">
                  <div className="text-[10px] text-[#858585] flex items-center justify-center gap-1">
                    <Layers className="w-3 h-3 text-blue-400" />
                    Max Cap
                  </div>
                  <div className="text-sm font-bold font-mono text-white tabular-nums mt-0.5">
                    {server.maxCapacity}
                  </div>
                </div>

                <div className="p-2 bg-[#18181b] border border-[#2d2d30] rounded text-center">
                  <div className="text-[10px] text-[#858585] flex items-center justify-center gap-1">
                    <Gauge className="w-3 h-3 text-purple-400" />
                    Conc. Limit
                  </div>
                  <div className="text-sm font-bold font-mono text-white tabular-nums mt-0.5">
                    {server.concurrencyLimit}
                  </div>
                </div>
              </div>

              {/* Concurrency and Capacity Utilization Bars */}
              <div className="space-y-2.5 bg-[#1e1e1e] p-3 rounded border border-[#2d2d30]">
                {/* Concurrency Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#a1a1aa]">
                      Active Connections: <strong className="text-white font-mono">{active}</strong> / {conc} max
                    </span>
                    <span className="font-mono text-xs text-amber-400 tabular-nums">
                      {remainingConc} slots free
                    </span>
                  </div>
                  <div className="h-2 bg-[#141416] rounded-full overflow-hidden border border-[#27272a]">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        concurrencyPercent >= 100
                          ? 'bg-red-500'
                          : concurrencyPercent > 66
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${concurrencyPercent}%` }}
                    />
                  </div>
                </div>

                {/* Capacity Utilization Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#a1a1aa]">
                      Reserved Workload: <strong className="text-white font-mono">{currentW}</strong> / {maxCap} units
                    </span>
                    <span className="font-mono text-xs text-amber-400 font-semibold tabular-nums">
                      {remainingCap} units free ({workloadPercent}%)
                    </span>
                  </div>
                  <div className="h-2 bg-[#141416] rounded-full overflow-hidden border border-[#27272a]">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        workloadPercent >= 100
                          ? 'bg-red-500'
                          : workloadPercent > 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${workloadPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Lifecycle Counters Table */}
              <div className="grid grid-cols-3 gap-2 text-[11px] text-center font-mono py-1 border-t border-[#2d2d30]/70">
                <div>
                  <span className="text-[#858585] block text-[10px]">Total Assigned</span>
                  <span className="text-white font-semibold">{server.totalAssigned || 0}</span>
                </div>
                <div>
                  <span className="text-[#858585] block text-[10px]">Completed</span>
                  <span className="text-emerald-400 font-semibold">{server.completedRequests || 0}</span>
                </div>
                <div>
                  <span className="text-[#858585] block text-[10px]">Failed</span>
                  <span className="text-red-400 font-semibold">{server.failedRequests || 0}</span>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#2d2d30]">
                <button
                  onClick={() => openEditModal(server)}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>

                <button
                  onClick={() => {
                    setForceDrainCheck(true);
                    setDeletingServer(server);
                  }}
                  className="flex items-center gap-1 text-xs text-[#858585] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Add / Edit Server Modal */}
      <Modal
        isOpen={isAddModalOpen || editingServer !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingServer(null);
        }}
        title={editingServer ? `Configure Server: ${editingServer.name}` : 'Add New Server'}
      >
        <form onSubmit={handleSaveServer} className="space-y-4">
          {formErrors.length > 0 && (
            <div className="p-2.5 bg-red-950/50 border border-red-800 rounded text-xs text-red-300 space-y-1">
              {formErrors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#cccccc] mb-1">Server ID</label>
              <input
                type="text"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={editingServer !== null}
                placeholder="e.g. srv-prod-1"
                className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b] disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#cccccc] mb-1">Weight Rating</label>
              <input
                type="number"
                min="1"
                max="50"
                value={formWeight}
                onChange={(e) => setFormWeight(parseInt(e.target.value) || 1)}
                className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#cccccc] mb-1">Server Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Server D (High-Memory Node)"
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#cccccc] mb-1">
                Max Capacity
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formMaxCapacity}
                onChange={(e) => setFormMaxCapacity(parseInt(e.target.value) || 1)}
                className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
              />
              <span className="text-[10px] text-[#71717a] mt-0.5 block">Total request ceiling</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#cccccc] mb-1">
                Concurrency Limit
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formConcurrencyLimit}
                onChange={(e) => setFormConcurrencyLimit(parseInt(e.target.value) || 1)}
                className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
              />
              <span className="text-[10px] text-[#71717a] mt-0.5 block">Active connections limit</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#3e3e42]">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="server-enabled-chk"
                checked={formEnabled}
                onChange={(e) => setFormEnabled(e.target.checked)}
                className="rounded bg-[#18181b] border-[#3e3e42] text-[#f59e0b] focus:ring-0"
              />
              <label htmlFor="server-enabled-chk" className="text-xs text-[#cccccc] cursor-pointer">
                Server is administratively enabled (receives traffic)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="server-paused-chk"
                checked={formPaused}
                onChange={(e) => setFormPaused(e.target.checked)}
                className="rounded bg-[#18181b] border-[#3e3e42] text-[#f59e0b] focus:ring-0"
              />
              <label htmlFor="server-paused-chk" className="text-xs text-[#cccccc] cursor-pointer">
                Server is paused (existing requests complete, no new traffic accepted)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#3e3e42]">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingServer(null);
              }}
              className="px-3 py-1.5 text-xs text-[#cccccc] bg-[#2d2d30] hover:bg-[#3e3e42] rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-black bg-[#f59e0b] hover:bg-[#fbbf24] rounded cursor-pointer"
            >
              {editingServer ? 'Save Changes' : 'Create Server'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Server Modal with active load warning and draining policy */}
      <Modal
        isOpen={deletingServer !== null}
        onClose={() => setDeletingServer(null)}
        title="Delete Server Confirmation"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs text-[#cccccc] space-y-1">
              <p>
                Are you sure you want to remove server{' '}
                <strong className="text-white">{deletingServer?.name}</strong> ({deletingServer?.id})?
              </p>
              {deletingServer?.activeRequests > 0 && (
                <p className="text-amber-400 font-medium">
                  Warning: This server currently has {deletingServer.activeRequests} active request(s) being processed!
                </p>
              )}
            </div>
          </div>

          {deletingServer?.activeRequests > 0 && (
            <div className="p-3 bg-[#1e1e1e] border border-[#3e3e42] rounded space-y-2">
              <label className="text-xs font-medium text-white block">Active Request Handling Policy:</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="drain-policy"
                  checked={forceDrainCheck}
                  onChange={(e) => setForceDrainCheck(e.target.checked)}
                  className="rounded bg-[#18181b] border-[#3e3e42] text-[#f59e0b]"
                />
                <label htmlFor="drain-policy" className="text-xs text-[#cccccc] cursor-pointer">
                  Safely drain and terminate in-flight requests from simulator memory
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#3e3e42]">
            <button
              onClick={() => setDeletingServer(null)}
              className="px-3 py-1.5 text-xs text-[#cccccc] bg-[#2d2d30] hover:bg-[#3e3e42] rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteServerConfirm}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded"
            >
              Confirm Deletion
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
