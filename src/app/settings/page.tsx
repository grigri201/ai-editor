'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useConfigStore, getDecryptedApiKey, hydrateConfigStore } from '@/stores/configStore';
import { PROVIDER_MODELS, LLMProvider, LLMModel } from '@/types/config';

export default function SettingsPage() {
  const { provider, model, setApiKey, setProvider, setModel, clearConfig } = useConfigStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

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
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all settings?')) {
      clearConfig();
      setApiKeyInput('');
      setSaveMessage('Settings cleared!');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const availableModels = PROVIDER_MODELS[provider];

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="w-[90%] max-w-[1280px] mx-auto pt-10 pb-4">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm transition-colors text-gray-600 hover:text-gray-900"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Editor
        </Link>
      </div>

      {/* Main content */}
      <div className="w-[90%] max-w-[1280px] mx-auto pb-24">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Settings
        </h1>
        
        {/* Settings card */}
        <div className="rounded-xl p-8 shadow-sm bg-white border-gray-200 border">
          <div className="space-y-6">
            {/* API Key input */}
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium mb-2 text-gray-700">
                API Key
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your API Key"
                  className="w-full px-4 py-3 pr-20 rounded-xl focus:outline-none focus:ring-1 border bg-gray-50 text-gray-900 focus:ring-gray-300 placeholder-gray-400 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 text-sm rounded-lg transition-colors bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* LLM Provider */}
            <div>
              <label htmlFor="provider" className="block text-sm font-medium mb-2 text-gray-700">
                LLM Provider
              </label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as LLMProvider)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 border bg-gray-50 text-gray-900 focus:ring-gray-300 border-gray-200"
              >
                <option value="deepseek">DeepSeek</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>

            {/* Model */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium mb-2 text-gray-700">
                Model
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value as LLMModel)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 border bg-gray-50 text-gray-900 focus:ring-gray-300 border-gray-200"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>


            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 rounded-xl font-medium transition-colors bg-blue-500 hover:bg-blue-600 text-white"
              >
                Save Settings
              </button>
              <button
                onClick={handleClear}
                className="px-6 py-3 rounded-xl font-medium transition-colors bg-red-500 hover:bg-red-600 text-white"
              >
                Clear Settings
              </button>
            </div>

            {/* Save message */}
            {saveMessage && (
              <div className="text-center py-2 px-4 rounded-lg bg-green-100 text-green-700">
                {saveMessage}
              </div>
            )}
          </div>
        </div>

        {/* Current settings preview */}
        <div className="mt-8 rounded-xl p-8 shadow-sm bg-white border-gray-200 border">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Current Settings
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                API Key:
              </span>
              <span className={`font-medium ${
                apiKeyInput 
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}>
                {apiKeyInput ? 'Set' : 'Not set'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                Provider:
              </span>
              <span className="font-medium text-blue-600">
                {provider === 'openai' ? 'OpenAI' : 'DeepSeek'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                Model:
              </span>
              <span className="font-medium text-blue-600">
                {model}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}