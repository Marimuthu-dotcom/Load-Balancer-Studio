/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useSimulation } from '../context/SimulationContext.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
  FileText,
  Search,
  Download,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  Info
} from 'lucide-react';

export default function RequestHistory() {
  const { history, clearHistoryAction, clients, servers } = useSimulation();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [serverFilter, setServerFilter] = useState('ALL');
  const [algorithmFilter, setAlgorithmFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Filtered Records
  const filteredHistory = useMemo(() => {
    return history.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.clientName && r.clientName.toLowerCase().includes(q)) ||
        (r.serverName && r.serverName.toLowerCase().includes(q)) ||
        (r.payloadDescription && r.payloadDescription.toLowerCase().includes(q));

      const matchesClient = clientFilter === 'ALL' || r.clientId === clientFilter;
      const matchesServer = serverFilter === 'ALL' || r.serverId === serverFilter;
      const matchesAlgo = algorithmFilter === 'ALL' || r.algorithm === algorithmFilter;
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchesSearch && matchesClient && matchesServer && matchesAlgo && matchesStatus;
    });
  }, [history, searchQuery, clientFilter, serverFilter, algorithmFilter, statusFilter]);

  // CSV Export handler
  const exportToCSV = () => {
    if (history.length === 0) return;

    const headers = [
      'Request ID',
      'Client ID',
      'Client Name',
      'Server ID',
      'Server Name',
      'Algorithm',
      'Status',
      'Duration (ms)',
      'Created At',
      'Assigned At',
      'Completed At',
      'Decision Explanation',
      'Failure Reason'
    ];

    const rows = history.map((r) => [
      `"${r.id || ''}"`,
      `"${r.clientId || ''}"`,
      `"${(r.clientName || '').replace(/"/g, '""')}"`,
      `"${r.serverId || ''}"`,
      `"${(r.serverName || '').replace(/"/g, '""')}"`,
      `"${(r.algorithm || '').replace(/"/g, '""')}"`,
      `"${r.status || ''}"`,
      r.durationMs || 0,
      `"${r.createdAt ? new Date(r.createdAt).toISOString() : ''}"`,
      `"${r.assignedAt ? new Date(r.assignedAt).toISOString() : ''}"`,
      `"${r.completedAt ? new Date(r.completedAt).toISOString() : ''}"`,
      `"${(r.decisionExplanation || '').replace(/"/g, '""')}"`,
      `"${(r.failureReason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `loadbalancer_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400">Completed</span>;
      case 'processing':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-400">Processing</span>;
      case 'queued':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-400">Queued</span>;
      case 'rejected':
      case 'failed':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/60 border border-red-800 text-red-400">{status}</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{status}</span>;
    }
  };

  // Distinct algorithms present in history
  const recordedAlgorithms = useMemo(() => {
    const set = new Set(history.map(h => h.algorithm).filter(Boolean));
    return Array.from(set);
  }, [history]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#252526] border border-[#2d2d30]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            Request History & Audit Log
          </h2>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Audit historical routing decisions, server loads at selection time, and export CSV reports.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportToCSV}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-[#27272a] hover:bg-[#323238] border border-[#3f3f46] rounded-md transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsClearModalOpen(true)}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/70 border border-red-800/60 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-[#252526] border border-[#2d2d30] rounded-lg space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-1">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search request ID, client, server..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            />
          </div>

          {/* Client Filter */}
          <div>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="ALL">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#252526]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Server Filter */}
          <div>
            <select
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="ALL">All Servers ({servers.length})</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#252526]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Algorithm Filter */}
          <div>
            <select
              value={algorithmFilter}
              onChange={(e) => setAlgorithmFilter(e.target.value)}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="ALL">All Algorithms</option>
              {recordedAlgorithms.map((algo) => (
                <option key={algo} value={algo} className="bg-[#252526]">
                  {algo}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#18181b] border border-[#3e3e42] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="ALL">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="queued">Queued</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#858585] pt-1">
          <span>
            Showing <strong className="text-white font-mono">{filteredHistory.length}</strong> of{' '}
            <strong className="text-white font-mono">{history.length}</strong> stored records
          </span>
          {(searchQuery || clientFilter !== 'ALL' || serverFilter !== 'ALL' || algorithmFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setClientFilter('ALL');
                setServerFilter('ALL');
                setAlgorithmFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-amber-400 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-[#252526] border border-[#2d2d30] rounded-lg overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#858585] space-y-2">
            <p>No historical requests found matching the current criteria.</p>
            <p className="text-[11px] text-[#71717a]">
              Run simulations from the Live Studio to populate the audit log.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2d2d30] bg-[#1e1e1e] text-[#858585] font-mono text-[11px]">
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Origin Client</th>
                  <th className="py-2.5 px-3">Assigned Server</th>
                  <th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d30]">
                {filteredHistory.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className="hover:bg-[#202023] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-mono text-amber-400 font-medium text-[11px]">
                      {record.id}
                    </td>
                    <td className="py-3 px-3 text-white font-medium">
                      {record.clientName}
                    </td>
                    <td className="py-3 px-3">
                      {record.serverName ? (
                        <span className="text-emerald-400 font-medium">{record.serverName}</span>
                      ) : (
                        <span className="text-[#858585]">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#a1a1aa] font-mono text-[11px]">
                      {record.algorithm}
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(record.status)}</td>
                    <td className="py-3 px-3 font-mono text-[#a1a1aa] tabular-nums">
                      {record.durationMs}ms
                    </td>
                    <td className="py-3 px-3 text-[#71717a] font-mono text-[11px]">
                      {record.createdAt ? new Date(record.createdAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center justify-end gap-1">
                        Inspect
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Trace Detail Modal */}
      <Modal
        isOpen={selectedRecord !== null}
        onClose={() => setSelectedRecord(null)}
        title={`Request Decision Trace: ${selectedRecord?.id}`}
        maxWidth="max-w-xl"
      >
        {selectedRecord && (
          <div className="space-y-4 text-xs">
            {/* Top Status Banner */}
            <div className={`p-3 rounded-lg border leading-relaxed ${
              selectedRecord.status === 'completed'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : selectedRecord.status === 'rejected' || selectedRecord.status === 'failed'
                ? 'bg-red-950/40 border-red-800 text-red-200'
                : 'bg-amber-950/40 border-amber-800 text-amber-200'
            }`}>
              <div className="font-bold text-white mb-0.5">
                Outcome: {selectedRecord.status.toUpperCase()}
              </div>
              <p>{selectedRecord.decisionExplanation || selectedRecord.failureReason || 'No trace recorded.'}</p>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-3 bg-[#1e1e1e] p-3 rounded border border-[#2d2d30]">
              <div>
                <span className="text-[#858585] block text-[11px]">Request ID:</span>
                <span className="font-mono text-amber-400 font-semibold">{selectedRecord.id}</span>
              </div>
              <div>
                <span className="text-[#858585] block text-[11px]">Algorithm Used:</span>
                <span className="text-white font-medium">{selectedRecord.algorithm}</span>
              </div>
              <div>
                <span className="text-[#858585] block text-[11px]">Client Origin:</span>
                <span className="text-white font-medium">{selectedRecord.clientName} ({selectedRecord.clientId})</span>
              </div>
              <div>
                <span className="text-[#858585] block text-[11px]">Selected Server:</span>
                <span className="text-emerald-400 font-bold">{selectedRecord.serverName || 'None'}</span>
              </div>
              <div>
                <span className="text-[#858585] block text-[11px]">Simulated Processing Time:</span>
                <span className="font-mono text-white">{selectedRecord.durationMs}ms</span>
              </div>
              <div>
                <span className="text-[#858585] block text-[11px]">Payload / Route:</span>
                <span className="text-[#a1a1aa]">{selectedRecord.payloadDescription || 'Standard Request'}</span>
              </div>
            </div>

            {/* Timeline stamps */}
            <div className="space-y-1.5 p-3 bg-[#18181b] rounded border border-[#2d2d30] font-mono text-[11px]">
              <div className="flex justify-between text-[#858585]">
                <span>Created At:</span>
                <span className="text-white">{selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toISOString() : '—'}</span>
              </div>
              <div className="flex justify-between text-[#858585]">
                <span>Assigned At:</span>
                <span className="text-white">{selectedRecord.assignedAt ? new Date(selectedRecord.assignedAt).toISOString() : '—'}</span>
              </div>
              <div className="flex justify-between text-[#858585]">
                <span>Completed At:</span>
                <span className="text-white">{selectedRecord.completedAt ? new Date(selectedRecord.completedAt).toISOString() : 'In-flight'}</span>
              </div>
            </div>

            {/* Pre-selection metrics */}
            {selectedRecord.serverLoadAtSelection && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#858585]">Pre-Selection Server Load Snapshot:</span>
                <div className="p-2.5 bg-[#18181b] border border-[#2d2d30] rounded font-mono text-[11px] text-zinc-300">
                  <pre className="overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedRecord.serverLoadAtSelection, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#3e3e42]">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-3.5 py-1.5 text-xs text-white bg-[#27272a] hover:bg-[#323238] rounded border border-[#3f3f46]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Clear History Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={clearHistoryAction}
        title="Clear Request History?"
        message="This will permanently delete all stored request audit logs from localStorage. Server and client configurations will be completely preserved."
        confirmText="Clear History"
        isDanger={true}
      />
    </div>
  );
}
