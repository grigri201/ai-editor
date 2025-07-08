/**
 * DIFF 操作类型
 */
export enum DiffOperationType {
  /** 上下文行，用于定位 */
  Context = 'context',
  /** 删除操作 */
  Delete = 'delete',
  /** 添加操作 */
  Add = 'add',
}

/**
 * DIFF 操作项
 */
export interface DiffOperation {
  /** 操作类型 */
  type: DiffOperationType;
  /** 操作内容 */
  content: string;
  /** 原始行（带前缀） */
  rawLine: string;
}

/**
 * DIFF 块（一组相关的修改）
 */
export interface DiffHunk {
  /** 上下文内容（定位用） */
  context: string;
  /** 该块中的所有操作 */
  operations: DiffOperation[];
}

/**
 * DIFF 解析结果
 */
export interface DiffResult {
  /** 是否解析成功 */
  success: boolean;
  /** 所有的 DIFF 块 */
  hunks: DiffHunk[];
  /** 错误信息（如果解析失败） */
  error?: string;
}

/**
 * 编辑器操作
 */
export interface EditorOperation {
  /** 操作类型 */
  type: 'insert' | 'delete' | 'replace';
  /** 开始位置 */
  from: number;
  /** 结束位置（仅用于删除和替换） */
  to?: number;
  /** 要插入的文本（仅用于插入和替换） */
  text?: string;
}

/**
 * DIFF 预览项
 */
export interface DiffPreviewItem {
  /** 唯一标识符 */
  id: string;
  /** DIFF 块 */
  hunk: DiffHunk;
  /** 在编辑器中的位置 */
  position: number;
  /** 预览文本（包含高亮标记） */
  preview: string;
  /** 是否已接受 */
  accepted?: boolean;
  /** 是否已拒绝 */
  rejected?: boolean;
}

/**
 * DIFF 应用结果
 */
export interface DiffApplyResult {
  /** 是否应用成功 */
  success: boolean;
  /** 更新后的文本 */
  newText?: string;
  /** 应用的操作数 */
  appliedCount?: number;
  /** 错误信息 */
  error?: string;
}