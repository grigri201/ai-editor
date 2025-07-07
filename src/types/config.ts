// LLM 提供商类型
export type LLMProvider = 'openai' | 'deepseek';

// OpenAI 模型
export type OpenAIModel = 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

// DeepSeek 模型
export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';

// 所有模型类型
export type LLMModel = OpenAIModel | DeepSeekModel;

// 模型配置
export interface ModelConfig {
  provider: LLMProvider;
  models: readonly LLMModel[];
}

// 配置状态接口
export interface ConfigState {
  apiKey: string;
  provider: LLMProvider;
  model: LLMModel;
  // Actions
  setApiKey: (key: string) => void;
  setProvider: (provider: LLMProvider) => void;
  setModel: (model: LLMModel) => void;
  clearConfig: () => void;
}

// 各提供商的可用模型
export const PROVIDER_MODELS: Record<LLMProvider, readonly LLMModel[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] as const,
  deepseek: ['deepseek-chat', 'deepseek-reasoner'] as const,
};

// 默认模型
export const DEFAULT_MODELS: Record<LLMProvider, LLMModel> = {
  openai: 'gpt-3.5-turbo',
  deepseek: 'deepseek-reasoner',
};