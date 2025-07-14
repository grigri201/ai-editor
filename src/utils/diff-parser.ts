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
        const lines = cleanText.split('\n');
        const hasDiffContent = lines.some(line => {
          const trimmed = line.trim();
          return trimmed.startsWith('@') || 
                 trimmed.startsWith('+') || 
                 trimmed.startsWith('-') ||
                 trimmed.match(/^[@\-+]/); // 也匹配没有空格的格式
        });
        
        if (hasDiffContent) {
          console.warn('警告：响应中没有 [EOF] 标记，将自动添加');
          cleanText += '\n[EOF]';
        } else {
          // 尝试智能解析 AI 的响应
          console.warn('警告：响应格式不标准，尝试智能解析...');
          
          // 查找可能的修改指示
          const possibleDiff = lines.find(line => 
            line.includes('改为') || 
            line.includes('替换') || 
            line.includes('删除') ||
            line.includes('添加')
          );
          
          if (!possibleDiff) {
            return {
              success: false,
              hunks: [],
              error: 'AI 响应不包含有效的 DIFF 格式，请确保 AI 返回标准的 DIFF 格式',
            };
          }
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
      // 其他情况，尝试容错处理
      else {
        // 跳过空行
        if (!line.trim()) {
          continue;
        }
        
        // 尝试识别可能的格式变体
        // 例如：没有空格的 @、- 或 +
        if (line.match(/^[@\-+]/)) {
          console.warn(`第 ${i + 1} 行格式警告：可能缺少空格，行内容: "${line}"`);
          
          // 尝试修复格式
          if (line.startsWith('@')) {
            // 上下文行
            if (currentHunk && currentHunk.operations.length > 0) {
              hunks.push(currentHunk);
            }
            currentHunk = {
              context: line.substring(1).trim(),
              operations: [],
            };
          } else if (line.startsWith('-')) {
            if (!currentHunk) {
              console.error(`第 ${i + 1} 行错误：删除操作前需要先有上下文行（@）`);
              continue;
            }
            currentHunk.operations.push({
              type: DiffOperationType.Delete,
              content: line.substring(1).trim(),
              rawLine: line,
            });
          } else if (line.startsWith('+')) {
            if (!currentHunk) {
              currentHunk = {
                context: '',
                operations: [],
              };
            }
            currentHunk.operations.push({
              type: DiffOperationType.Add,
              content: line.substring(1).trim(),
              rawLine: line,
            });
          }
          continue;
        }
        
        // 记录警告但继续处理
        console.warn(`第 ${i + 1} 行格式警告：无法识别的行格式，跳过该行: "${line}"`);
        continue;
      }
    }

    // 保存最后一个 hunk
    if (currentHunk && currentHunk.operations.length > 0) {
      hunks.push(currentHunk);
    }

    // 合并连续的相同类型操作
    for (const hunk of hunks) {
      const mergedOps: DiffOperation[] = [];
      let i = 0;
      
      while (i < hunk.operations.length) {
        const currentOp = hunk.operations[i];
        const sameTypeOps: DiffOperation[] = [currentOp];
        
        // 收集所有连续的相同类型操作
        let j = i + 1;
        while (j < hunk.operations.length && hunk.operations[j].type === currentOp.type) {
          sameTypeOps.push(hunk.operations[j]);
          j++;
        }
        
        // 如果有多个连续的相同类型操作，合并它们
        if (sameTypeOps.length > 1) {
          const mergedContent = sameTypeOps.map(op => op.content).join('\n');
          mergedOps.push({
            type: currentOp.type,
            content: mergedContent,
            rawLine: sameTypeOps.map(op => op.rawLine).join('\n'),
          });
        } else {
          mergedOps.push(currentOp);
        }
        
        i = j;
      }
      
      hunk.operations = mergedOps;
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
  
  // 检查是否是替换操作（先删除后添加）
  let i = 0;
  while (i < hunk.operations.length) {
    const currentOp = hunk.operations[i];
    const nextOp = hunk.operations[i + 1];
    
    // 如果当前是删除，下一个是添加，合并为替换操作
    if (currentOp.type === DiffOperationType.Delete && 
        nextOp && nextOp.type === DiffOperationType.Add) {
      // 组合格式：[{-}删除内容{+}添加内容]
      parts.push(`[{-}${currentOp.content}{+}${nextOp.content}]`);
      i += 2; // 跳过下一个操作
    } else if (currentOp.type === DiffOperationType.Delete) {
      // 纯删除：[{-}删除内容]
      parts.push(`[{-}${currentOp.content}]`);
      i++;
    } else if (currentOp.type === DiffOperationType.Add) {
      // 纯添加：[{+}添加内容]
      parts.push(`[{+}${currentOp.content}]`);
      i++;
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
      // 尝试从头查找
      const retryPosition = findContextPosition(text, hunk.context, 0);
      if (retryPosition === -1) {
        return false; // 找不到上下文
      }
      console.warn(`从头查找到上下文在位置: ${retryPosition}`);
    }
    
    // 检查删除操作是否匹配
    const contextEnd = position + hunk.context.length;
    
    // 打印调试信息
    console.log(`上下文结束位置: ${contextEnd}`);
    console.log(`上下文后的20个字符: "${text.substring(contextEnd, contextEnd + 20).replace(/\n/g, '\\n')}"`);
    
    let checkPosition = contextEnd;
    for (const op of hunk.operations) {
      if (op.type === DiffOperationType.Delete) {
        const deleteText = text.substring(checkPosition, checkPosition + op.content.length);
        if (deleteText !== op.content) {
          console.error(`删除内容不匹配:
  期望: "${op.content}"
  实际: "${deleteText}"
  位置: ${checkPosition}
  上下文: "${hunk.context}"
  上下文位置: ${position}`);
          
          // 尝试在附近查找
          console.log('尝试在附近查找要删除的内容...');
          const searchStart = Math.max(0, checkPosition - 20);
          const searchEnd = Math.min(text.length, checkPosition + 100);
          const nearbyText = text.substring(searchStart, searchEnd);
          const deleteIndex = nearbyText.indexOf(op.content);
          if (deleteIndex !== -1) {
            console.log(`在位置 ${searchStart + deleteIndex} 找到了要删除的内容`);
          }
          
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