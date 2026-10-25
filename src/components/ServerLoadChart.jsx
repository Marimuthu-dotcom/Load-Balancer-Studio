/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export default function ServerLoadChart({ servers = [] }) {
  if (!servers || servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border border-dashed border-[#3e3e42] rounded-lg text-[#858585] text-xs">
        <span>No server data available to render chart.</span>
      </div>
    );
  }

  const maxAssigned = Math.max(1, ...servers.map(s => s.totalAssigned || 0));
  const totalAssignedAll = servers.reduce((sum, s) => sum + (s.totalAssigned || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-[#858585]">
        <span>Requests Assigned per Server</span>
        <span className="font-mono tabular-nums">{totalAssignedAll} Total Assigned</span>
      </div>

      <div className="space-y-3">
        {servers.map((server, idx) => {
          const assigned = server.totalAssigned || 0;
          const active = server.activeRequests || 0;
          const completed = server.completedRequests || 0;
          const percentOfMax = Math.min(100, Math.round((assigned / maxAssigned) * 100));
          const shareOfTotal = totalAssignedAll > 0 ? ((assigned / totalAssignedAll) * 100).toFixed(1) : '0.0';

          const colorPalette = [
            'from-amber-500 to-amber-600',
            'from-blue-500 to-blue-600',
            'from-emerald-500 to-emerald-600',
            'from-purple-500 to-purple-600',
            'from-cyan-500 to-cyan-600'
          ];
          const colorClass = colorPalette[idx % colorPalette.length];

          return (
            <div key={server.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#cccccc]">{server.name}</span>
                  {!server.enabled && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-red-950/60 border border-red-800 text-red-400 rounded">Disabled</span>
                  )}
                  {server.enabled && server.paused && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-950/60 border border-amber-800 text-amber-400 rounded">Paused</span>
                  )}
                  <span className="text-[10px] text-[#858585]">Weight: {server.weight}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                  <span className="text-white font-semibold">{assigned} assigned</span>
                  <span className="text-[#858585]">({shareOfTotal}%)</span>
                  {active > 0 && (
                    <span className="text-amber-400 font-semibold">{active} active</span>
                  )}
                </div>
              </div>

              <div className="h-5 bg-[#18181b] border border-[#2d2d30] rounded-sm overflow-hidden flex relative">
                <div
                  className={`h-full bg-linear-to-r ${colorClass} transition-all duration-300 rounded-xs`}
                  style={{ width: `${percentOfMax}%` }}
                />
                {assigned === 0 && (
                  <div className="absolute inset-0 flex items-center px-2 text-[10px] text-[#6e6e6e] font-mono">
                    0 requests
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
