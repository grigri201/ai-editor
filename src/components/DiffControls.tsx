'use client';

import React from 'react';

interface DiffControlsProps {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  isLoading?: boolean;
  hasDiffs: boolean;
}

export default function DiffControls({
  onAcceptAll,
  onRejectAll,
  isLoading = false,
  hasDiffs
}: DiffControlsProps) {
  if (!hasDiffs) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 flex gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
      <button
        onClick={onAcceptAll}
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="接受所有修改"
      >
        接受全部
      </button>
      <button
        onClick={onRejectAll}
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="拒绝所有修改"
      >
        拒绝全部
      </button>
    </div>
  );
}