# 快速输入修复方案 v2

## 问题分析
之前的修复过度复杂化了问题，引入了更多的竞争条件：
1. 输入缓冲机制延迟了渲染，反而造成了光标跳动
2. MutationObserver 在错误时机恢复光标
3. 双重 requestAnimationFrame 延迟过大
4. setTimeout 与渲染存在竞争条件

## 修复方案
回归简单的实现，参考 Slate.js 的核心理念：

### 1. 移除复杂性
- ✅ 移除输入缓冲机制（inputBufferRef）
- ✅ 移除 MutationObserver
- ✅ 移除不必要的状态追踪

### 2. 简化渲染流程
- ✅ 直接更新 DOM，不使用嵌套的 requestAnimationFrame
- ✅ 单个 requestAnimationFrame 恢复光标
- ✅ 保持 100ms 防抖延迟

### 3. 统一异步处理
- ✅ 所有光标设置使用 requestAnimationFrame
- ✅ 移除所有 setTimeout 调用
- ✅ 确保渲染和光标恢复的顺序

## 关键代码改动

### handleInput 简化
```typescript
const handleInput = useCallback(() => {
  if (!editorRef.current || isComposing || isRenderingRef.current) return;
  
  const plainText = getPlainText(editorRef.current);
  notifyChange(plainText);
  
  // 使用防抖渲染
  debouncedRender(plainText);
}, [isComposing, debouncedRender, notifyChange]);
```

### renderContent 简化
```typescript
const renderContent = useCallback((text: string) => {
  if (!editorRef.current || isRenderingRef.current) return;
  
  isRenderingRef.current = true;
  
  // 保存光标位置
  const cursorOffset = getCursorOffset();
  lastCursorPositionRef.current = cursorOffset;
  
  // ... 生成 HTML ...
  
  editorRef.current.innerHTML = html;
  
  // 使用 requestAnimationFrame 恢复光标位置
  requestAnimationFrame(() => {
    setCursorOffset(cursorOffset);
    isRenderingRef.current = false;
  });
}, [setCursorInLine]);
```

## 测试要点
1. 快速输入时光标应保持在正确位置
2. Enter 键后光标应在新行开头
3. 列表项操作正常
4. 无性能问题和错误