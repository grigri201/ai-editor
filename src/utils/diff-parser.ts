import { DiffResult, DiffHunk, DiffOperation, DiffOperationType } from '@/types/diff';

/**
 * 解析 AI 返回的 DIFF 格式内容
 * @param diffText AI 返回的 DIFF 文本
 * @returns 解析结果
 */
export function parseDiff(diffText: string): DiffResult {
  try {
    console.log('开始解析 DIFF，输入长度:', diffText.length);
    console.log('输入内容:', diffText);
    
    // 移除可能的首尾空白
    let cleanText = diffText.trim();
    
    // 尝试提取 DIFF 内容
    // 有些 AI 可能会在 DIFF 前后添加额外的说明文字
    // 尝试找到第一个 @ 符号到 [EOF] 之间的内容
    const diffStartIndex = cleanText.indexOf('@');
    const eofIndex = cleanText.lastIndexOf('[EOF]');
    
    if (diffStartIndex !== -1 && eofIndex !== -1 && eofIndex > diffStartIndex) {
      // 提取 DIFF 部分
      cleanText = cleanText.substring(diffStartIndex, eofIndex + 5).trim();
      console.log('提取的 DIFF 内容:', cleanText);
    }
    
    // 检查是否以 [EOF] 结尾
    if (!cleanText.endsWith('[EOF]')) {
      // 如果没有 [EOF]，尝试查找并添加
      if (!cleanText.includes('[EOF]')) {
        // 检查是否有 DIFF 格式的内容（@ 或 + 或 - 开头的行）
        const hasDiffContent = cleanText.split('\n').some(line => 
          line.trim().startsWith('@') || 
          line.trim().startsWith('+') || 
          line.trim().startsWith('-')
        );
        
        if (hasDiffContent) {
          console.warn('警告：响应中没有 [EOF] 标记，将自动添加');
          cleanText += '\n[EOF]';
        } else {
          // 如果完全没有 DIFF 格式，可能是 AI 用了其他格式
          console.error('错误：响应不包含有效的 DIFF 格式');
          return {
            success: false,
            hunks: [],
            error: 'AI 响应不包含有效的 DIFF 格式（需要以 @、- 或 + 开头的行）',
          };
        }
      }
    }

    // 移除 [EOF] 标记并按行分割
    const content = cleanText.slice(0, cleanText.lastIndexOf('[EOF]')).trim();
    if (!content) {
      return {
        success: true,
        hunks: [],
      };
    }

    const lines = content.split('\n');
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 跳过空行
      if (!line.trim()) {
        continue;
      }

      // 检查是否是上下文行
      if (line.startsWith('@')) {
        // 如果有未完成的 hunk，先保存
        if (currentHunk && currentHunk.operations.length > 0) {
          hunks.push(currentHunk);
        }
        
        // 创建新的 hunk
        currentHunk = {
          context: line.substring(1), // 移除 @ 前缀
          operations: [],
        };
      }
      // 检查是否是删除行
      else if (line.startsWith('-')) {
        if (!currentHunk) {
          return {
            success: false,
            hunks: [],
            error: `第 ${i + 1} 行错误：删除操作前需要先有上下文行（@）`,
          };
        }
        
        currentHunk.operations.push({
          type: DiffOperationType.Delete,
          content: line.substring(1), // 移除 - 前缀
          rawLine: line,
        });
      }
      // 检查是否是添加行
      else if (line.startsWith('+')) {
        if (!currentHunk) {
          // 如果是文件开头的添加，创建一个没有上下文的 hunk
          currentHunk = {
            context: '',
            operations: [],
          };
        }
        
        currentHunk.operations.push({
          type: DiffOperationType.Add,
          content: line.substring(1), // 移除 + 前缀
          rawLine: line,
        });
      }
      // 其他情况视为格式错误
      else {
        return {
          success: false,
          hunks: [],
          error: `第 ${i + 1} 行格式错误：行必须以 @、- 或 + 开头`,
        };
      }
    }

    // 保存最后一个 hunk
    if (currentHunk && currentHunk.operations.length > 0) {
      hunks.push(currentHunk);
    }

    return {
      success: true,
      hunks,
    };
  } catch (error) {
    return {
      success: false,
      hunks: [],
      error: `解析错误：${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 将 DIFF 块转换为预览文本（带高亮标记）
 * @param hunk DIFF 块
 * @returns 预览文本
 */
export function generateDiffPreview(hunk: DiffHunk): string {
  const parts: string[] = [];
  
  // 处理每个操作
  for (const op of hunk.operations) {
    if (op.type === DiffOperationType.Delete) {
      // 删除的内容用 =={-}...== 包裹
      parts.push(`=={-}${op.content}==`);
    } else if (op.type === DiffOperationType.Add) {
      // 添加的内容用 =={+}...== 包裹
      parts.push(`=={+}${op.content}==`);
    }
  }
  
  return parts.join('');
}

/**
 * 查找上下文在文本中的位置
 * @param text 完整文本
 * @param context 上下文内容
 * @param startFrom 开始搜索的位置
 * @returns 找到的位置，-1 表示未找到
 */
export function findContextPosition(text: string, context: string, startFrom: number = 0): number {
  if (!context) {
    return 0; // 空上下文表示文件开头
  }
  
  // 先尝试精确匹配
  let position = text.indexOf(context, startFrom);
  
  if (position === -1) {
    // 如果精确匹配失败，尝试去除首尾空白后匹配
    const trimmedContext = context.trim();
    const searchText = text.substring(startFrom);
    const lines = searchText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === trimmedContext) {
        // 计算实际位置
        position = startFrom;
        for (let j = 0; j < i; j++) {
          position += lines[j].length + 1; // +1 for newline
        }
        console.log(`模糊匹配成功: "${trimmedContext}" 在位置 ${position}`);
        break;
      }
    }
  } else {
    console.log(`精确匹配成功: "${context}" 在位置 ${position}`);
  }
  
  if (position === -1) {
    console.error(`无法找到上下文: "${context}"`);
  }
  
  return position;
}

/**
 * 验证 DIFF 是否可以应用到文本
 * @param text 原始文本
 * @param hunks DIFF 块数组
 * @returns 是否可以应用
 */
export function canApplyDiff(text: string, hunks: DiffHunk[]): boolean {
  let lastPosition = 0;
  console.log(`开始验证 ${hunks.length} 个 DIFF 块`);
  
  for (let i = 0; i < hunks.length; i++) {
    const hunk = hunks[i];
    console.log(`验证第 ${i + 1} 个块，上下文: "${hunk.context}"`);
    
    const position = findContextPosition(text, hunk.context, lastPosition);
    if (position === -1) {
      console.error(`找不到上下文: "${hunk.context}"`);
      return false; // 找不到上下文
    }
    
    // 检查删除操作是否匹配
    let checkPosition = position + hunk.context.length;
    for (const op of hunk.operations) {
      if (op.type === DiffOperationType.Delete) {
        const deleteText = text.substring(checkPosition, checkPosition + op.content.length);
        if (deleteText !== op.content) {
          console.error(`删除内容不匹配:
  期望: "${op.content}"
  实际: "${deleteText}"
  位置: ${checkPosition}`);
          return false; // 要删除的内容不匹配
        }
        checkPosition += op.content.length;
      }
    }
    
    lastPosition = position;
  }
  
  console.log('所有 DIFF 块验证通过');
  return true;
}