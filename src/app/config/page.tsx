'use client';

import { useEffect, useState } from 'react';
import { useConfigStore, getDecryptedApiKey, hydrateConfigStore } from '@/stores/configStore';
import { PROVIDER_MODELS, LLMProvider, LLMModel } from '@/types/config';

export default function ConfigPage() {
  const { provider, model, theme, setApiKey, setProvider, setModel, setTheme, clearConfig } = useConfigStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    hydrateConfigStore();
    // 加载已保存的 API Key
    const savedKey = getDecryptedApiKey();
    if (savedKey) {
      setApiKeyInput(savedKey);
    }
  }, []);

  const handleSave = () => {
    setApiKey(apiKeyInput);
    alert('配置已保存');
  };

  const handleClear = () => {
    if (confirm('确定要清除所有配置吗？')) {
      clearConfig();
      setApiKeyInput('');
      alert('配置已清除');
    }
  };

  const availableModels = PROVIDER_MODELS[provider];

  if (!isClient) {
    return <div>加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">配置设置</h1>
        
        <div className="space-y-6 bg-gray-800 rounded-lg p-6">
          {/* API Key 输入 */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="输入你的 API Key"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded"
              >
                {showApiKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          {/* LLM 提供商选择 */}
          <div>
            <label htmlFor="provider" className="block text-sm font-medium mb-2">
              LLM 提供商
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as LLMProvider)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          {/* 模型选择 */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium mb-2">
              模型
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value as LLMModel)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 主题选择 */}
          <div>
            <label htmlFor="theme" className="block text-sm font-medium mb-2">
              界面主题
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">浅色主题</option>
              <option value="dark">深色主题</option>
            </select>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
            >
              保存配置
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors"
            >
              清除配置
            </button>
          </div>
        </div>

        {/* 配置预览 */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">当前配置</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">API Key:</span>{' '}
              <span className={apiKeyInput ? 'text-green-400' : 'text-gray-500'}>
                {apiKeyInput ? '已设置' : '未设置'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">提供商:</span>{' '}
              <span className="text-blue-400">{provider === 'openai' ? 'OpenAI' : 'DeepSeek'}</span>
            </div>
            <div>
              <span className="text-gray-400">模型:</span>{' '}
              <span className="text-blue-400">{model}</span>
            </div>
            <div>
              <span className="text-gray-400">主题:</span>{' '}
              <span className="text-blue-400">{theme === 'light' ? '浅色' : '深色'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}