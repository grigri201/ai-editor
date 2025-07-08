'use client';

import React from 'react';
import { DiffPreviewItem } from '@/types/diff';

interface DiffPreviewProps {
  previews: DiffPreviewItem[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  isLoading?: boolean;
}

export default function DiffPreview({
  previews,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  isLoading = false,
}: DiffPreviewProps) {
  if (previews.length === 0) {
    return null;
  }

  // 计算统计信息
  const totalChanges = previews.length;
  const acceptedCount = previews.filter(p => p.accepted).length;
  const rejectedCount = previews.filter(p => p.rejected).length;
  const pendingCount = totalChanges - acceptedCount - rejectedCount;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl max-h-[50vh] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-gray-900">AI 建议的修改</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{totalChanges} 项修改</span>
              {acceptedCount > 0 && (
                <span className="text-green-600">• {acceptedCount} 已接受</span>
              )}
              {rejectedCount > 0 && (
                <span className="text-red-600">• {rejectedCount} 已拒绝</span>
              )}
              {pendingCount > 0 && (
                <span className="text-gray-600">• {pendingCount} 待处理</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAcceptAll}
              disabled={isLoading || pendingCount === 0}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              全部接受
            </button>
            <button
              onClick={onRejectAll}
              disabled={isLoading || pendingCount === 0}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              全部拒绝
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="overflow-y-auto max-h-[calc(50vh-4rem)] p-4 space-y-3">
        {previews.map((preview) => (
          <DiffPreviewCard
            key={preview.id}
            preview={preview}
            onAccept={() => onAccept(preview.id)}
            onReject={() => onReject(preview.id)}
            disabled={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

interface DiffPreviewCardProps {
  preview: DiffPreviewItem;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
}

function DiffPreviewCard({ preview, onAccept, onReject, disabled }: DiffPreviewCardProps) {
  const isProcessed = preview.accepted || preview.rejected;
  
  // 解析预览文本以渲染高亮
  const renderPreview = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // 匹配 =={+}...== 和 =={-}...==
    const regex = /==\{([+-])\}([^=]+)==/g;
    let match;
    
    while ((match = regex.exec(preview.preview)) !== null) {
      // 添加匹配前的普通文本
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {preview.preview.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      // 添加高亮部分
      const type = match[1];
      const content = match[2];
      const className = type === '+' 
        ? 'bg-green-100 text-green-800 px-1 rounded' 
        : 'bg-red-100 text-red-800 px-1 rounded line-through';
      
      parts.push(
        <span key={`highlight-${match.index}`} className={className}>
          {content}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加最后的普通文本
    if (lastIndex < preview.preview.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {preview.preview.substring(lastIndex)}
        </span>
      );
    }
    
    return parts;
  };

  return (
    <div
      className={`
        p-3 rounded-lg border transition-all
        ${preview.accepted ? 'border-green-400 bg-green-50' : ''}
        ${preview.rejected ? 'border-red-400 bg-red-50' : ''}
        ${!isProcessed ? 'border-gray-200 bg-gray-50' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 上下文 */}
          {preview.hunk.context && (
            <div className="text-sm text-gray-500 mb-1 truncate">
              位置: {preview.hunk.context}
            </div>
          )}
          
          {/* 预览内容 */}
          <div className="font-mono text-sm break-words">
            {renderPreview()}
          </div>
        </div>
        
        {/* 操作按钮 */}
        {!isProcessed && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onAccept}
              disabled={disabled}
              className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="接受修改"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={onReject}
              disabled={disabled}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="拒绝修改"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* 状态标记 */}
        {preview.accepted && (
          <span className="text-sm text-green-600 font-medium">已接受</span>
        )}
        {preview.rejected && (
          <span className="text-sm text-red-600 font-medium">已拒绝</span>
        )}
      </div>
    </div>
  );
}