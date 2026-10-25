/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        className={`w-full ${maxWidth} bg-[#252526] border border-[#3e3e42] rounded-lg shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#3e3e42] bg-[#1e1e1e]">
          <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-white hover:bg-[#333333] rounded transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto text-sm text-[#cccccc] space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
