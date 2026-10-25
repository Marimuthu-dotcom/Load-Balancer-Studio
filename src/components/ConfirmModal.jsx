/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Modal from './Modal.jsx';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${isDanger ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
          {isDanger ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-[#cccccc] leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#3e3e42] mt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs font-medium text-[#cccccc] bg-[#2d2d30] hover:bg-[#3e3e42] hover:text-white rounded border border-[#3e3e42] transition-colors"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-3.5 py-1.5 text-xs font-medium text-white rounded transition-colors ${
            isDanger
              ? 'bg-red-600 hover:bg-red-500 shadow-sm'
              : 'bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
