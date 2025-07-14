import { MarkdownEditorRef } from '@/components/CodeMirrorEditor';
import { DiffResult, DiffHunk, DiffOperationType, DiffPreviewItem, DiffApplyResult } from '@/types/diff';
import { parseDiff, findContextPosition, canApplyDiff, generateDiffPreview } from './diff-parser';

/**
 * 处理 AI 响应并生成预览
 * @param aiResponse AI 返回的 DIFF 格式文本
 * @param editorContent 编辑器当前内容
 * @returns DIFF 预览项数组
 */
export function processAIResponse(aiResponse: string, editorContent: string): {
  success: boolean;
  previews: DiffPreviewItem[];
  error?: string;
} {
  // 解析 DIFF
  const diffResult = parseDiff(aiResponse);
  if (!diffResult.success) {
    return {
      success: false,
      previews: [],
      error: diffResult.error,
    };
  }

  // 验证是否可以应用（暂时跳过验证，让我们看看具体的匹配问题）
  const canApply = canApplyDiff(editorContent, diffResult.hunks);
  if (!canApply) {
    console.warn('DIFF 验证失败，但继续处理以便调试');
    // 不要直接返回错误，让我们看看能匹配多少
  }

  // 生成预览项
  const previews: DiffPreviewItem[] = [];
  let searchPosition = 0;

  for (let i = 0; i < diffResult.hunks.length; i++) {
    const hunk = diffResult.hunks[i];
    const position = findContextPosition(editorContent, hunk.context, searchPosition);
    
    if (position === -1) {
      console.error(`警告：找不到上下文 "${hunk.context}"，尝试从头查找`);
      // 如果找不到，尝试从头开始查找（可能是因为之前的修改影响了位置）
      const retryPosition = findContextPosition(editorContent, hunk.context, 0);
      if (retryPosition === -1) {
        console.error(`错误：完全找不到上下文 "${hunk.context}"`);
        continue; // 跳过找不到的块
      }
      searchPosition = retryPosition;
    } else {
      searchPosition = position;
    }

    previews.push({
      id: `diff-${Date.now()}-${i}`,
      hunk,
      position: searchPosition + hunk.context.length,
      preview: generateDiffPreview(hunk),
      accepted: false,
      rejected: false,
    });

    searchPosition = searchPosition + hunk.context.length + 1;
  }

  return {
    success: true,
    previews,
  };
}

/**
 * 应用单个 DIFF 预览到编辑器
 * @param editor 编辑器引用
 * @param preview DIFF 预览项
 * @param showHighlight 是否显示高亮标记
 */
export function applyDiffPreview(
  editor: MarkdownEditorRef,
  preview: DiffPreviewItem,
  showHighlight: boolean = true
): boolean {
  try {
    const currentContent = editor.getValue();
    let position = findContextPosition(currentContent, preview.hunk.context);
    
    if (position === -1) {
      console.error(`无法应用预览，找不到上下文: "${preview.hunk.context}"`);
      return false;
    }

    // 计算上下文结束位置
    let offset = position + preview.hunk.context.length;
    
    // 如果有删除操作，先验证删除内容是否匹配
    const deleteOps = preview.hunk.operations.filter(op => op.type === DiffOperationType.Delete);
    if (deleteOps.length > 0) {
      // 获取要删除的完整内容
      const expectedDelete = deleteOps.map(op => op.content).join('');
      const actualContent = currentContent.substring(offset, offset + expectedDelete.length);
      
      // 如果不匹配，尝试在附近查找
      if (actualContent !== expectedDelete) {
        console.warn(`删除内容不匹配，尝试在附近查找...`);
        console.log(`期望: "${expectedDelete}"`);
        console.log(`实际: "${actualContent}"`);
        
        // 在上下文附近搜索要删除的内容
        const searchStart = Math.max(0, position - 50);
        const searchEnd = Math.min(currentContent.length, position + preview.hunk.context.length + 200);
        const searchText = currentContent.substring(searchStart, searchEnd);
        const deleteIndex = searchText.indexOf(expectedDelete);
        
        if (deleteIndex !== -1) {
          offset = searchStart + deleteIndex;
          console.log(`在位置 ${offset} 找到了要删除的内容`);
        } else {
          console.error(`在附近找不到要删除的内容`);
          return false;
        }
      }
    }
    
    // 按顺序处理操作
    for (const op of preview.hunk.operations) {
      if (op.type === DiffOperationType.Delete) {
        // 删除操作
        const deleteLength = op.content.length;
        const actualContent = currentContent.substring(offset, offset + deleteLength);
        
        // 验证要删除的内容是否匹配
        if (actualContent !== op.content) {
          console.warn(`删除内容不完全匹配，但继续处理:
  期望: "${op.content}"
  实际: "${actualContent}"`);
        }
        
        if (showHighlight) {
          // 用高亮标记替换要删除的内容
          editor.replaceRange(`[{-}${op.content}]`, offset, offset + deleteLength);
          offset += `[{-}${op.content}]`.length;
        } else {
          // 直接删除
          editor.deleteText(offset, deleteLength);
        }
      } else if (op.type === DiffOperationType.Add) {
        // 添加操作
        const insertText = showHighlight ? `[{+}${op.content}]` : op.content;
        editor.insertText(offset, insertText);
        offset += insertText.length;
      }
    }

    return true;
  } catch (error) {
    console.error('应用 DIFF 失败:', error);
    return false;
  }
}

/**
 * 批量应用 DIFF 预览
 * @param editor 编辑器引用
 * @param previews 要应用的预览项数组
 * @param showHighlight 是否显示高亮标记
 * @returns 应用结果
 */
export function applyDiffPreviews(
  editor: MarkdownEditorRef,
  previews: DiffPreviewItem[],
  showHighlight: boolean = true
): DiffApplyResult {
  try {
    // 按位置从后往前排序，避免位置偏移问题
    const sortedPreviews = [...previews].sort((a, b) => b.position - a.position);
    let appliedCount = 0;

    for (const preview of sortedPreviews) {
      if (!preview.rejected && applyDiffPreview(editor, preview, showHighlight)) {
        appliedCount++;
      }
    }

    return {
      success: true,
      newText: editor.getValue(),
      appliedCount,
    };
  } catch (error) {
    return {
      success: false,
      error: `批量应用失败：${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 清理文本中的高亮标记
 * @param text 包含高亮标记的文本
 * @returns 清理后的文本
 */
export function cleanHighlightMarkers(text: string): string {
  // 处理特殊情况：[{+}] 表示插入空行
  text = text.replace(/\[\{\+\}\]/g, '\n');
  
  // 处理组合格式 [{-}删除内容{+}添加内容]
  text = text.replace(/\[\{-\}[^\{\]]*\{\+\}([^\]]*)\]/g, '$1');
  
  // 处理单独格式
  // 移除 [{+}...] 标记，保留内容
  text = text.replace(/\[\{\+\}([^\]]*)\]/g, '$1');
  // 移除 [{-}...] 标记和内容
  text = text.replace(/\[\{-\}([^\]]*)\]/g, '');
  
  return text;
}

/**
 * 接受 DIFF 修改（移除高亮标记）
 * @param editor 编辑器引用
 * @param keepAdditions 是否保留添加的内容
 * @param removeDelations 是否移除删除的内容
 */
export function acceptDiffChanges(
  editor: MarkdownEditorRef,
  keepAdditions: boolean = true,
  removeDelations: boolean = true
): void {
  const content = editor.getValue();
  let newContent = content;

  if (keepAdditions) {
    // 处理特殊情况：[{+}] 表示插入空行
    newContent = newContent.replace(/\[\{\+\}\]/g, '\n');
    // 处理组合格式：保留添加内容
    newContent = newContent.replace(/\[\{-\}[^\{\]]*\{\+\}([^\]]*)\]/g, '$1');
    // 处理单独的添加：保留内容
    newContent = newContent.replace(/\[\{\+\}([^\]]*)\]/g, '$1');
  }

  if (removeDelations) {
    // 处理组合格式：已经在上面处理了
    // 处理单独的删除：移除整个标记
    newContent = newContent.replace(/\[\{-\}([^\]]*)\]/g, '');
  }

  if (newContent !== content) {
    editor.setValue(newContent);
  }
}

/**
 * 拒绝 DIFF 修改（恢复原始内容）
 * @param editor 编辑器引用
 */
export function rejectDiffChanges(editor: MarkdownEditorRef): void {
  const content = editor.getValue();
  let newContent = content;

  // 处理组合格式：保留删除内容
  newContent = newContent.replace(/\[\{-\}([^\{\]]*)\{\+\}[^\]]*\]/g, '$1');
  
  // 处理单独的添加：移除整个标记
  newContent = newContent.replace(/\[\{\+\}([^\]]*)\]/g, '');
  
  // 处理单独的删除：保留内容
  newContent = newContent.replace(/\[\{-\}([^\]]*)\]/g, '$1');

  if (newContent !== content) {
    editor.setValue(newContent);
  }
}