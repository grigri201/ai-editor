import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ConfigState, LLMProvider, LLMModel, DEFAULT_MODELS, PROVIDER_MODELS } from '@/types/config';

// 简单的加密解密函数（仅用于基本保护，不是真正的安全加密）
const encodeApiKey = (key: string): string => {
  if (!key) return '';
  return btoa(key);
};

const decodeApiKey = (encoded: string): string => {
  if (!encoded) return '';
  try {
    return atob(encoded);
  } catch {
    return '';
  }
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      provider: 'deepseek' as LLMProvider,
      model: 'deepseek-chat' as LLMModel,

      setApiKey: (key: string) => {
        set({ apiKey: encodeApiKey(key) });
      },

      setProvider: (provider: LLMProvider) => {
        const currentModel = get().model;
        const availableModels = PROVIDER_MODELS[provider];
        
        // 如果当前模型不在新提供商的可用模型中，切换到默认模型
        const newModel = availableModels.includes(currentModel as any) 
          ? currentModel 
          : DEFAULT_MODELS[provider];
        
        set({ provider, model: newModel });
      },

      setModel: (model: LLMModel) => {
        set({ model });
      },

      clearConfig: () => {
        set({ 
          apiKey: '', 
          provider: 'deepseek',
          model: 'deepseek-chat'
        });
      },
    }),
    {
      name: 'ai-editor-config',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        provider: state.provider,
        model: state.model,
      }),
      // 处理 Next.js hydration 问题
      skipHydration: true,
    }
  )
);

// 获取解密后的 API Key
export const getDecryptedApiKey = (): string => {
  const encodedKey = useConfigStore.getState().apiKey;
  return decodeApiKey(encodedKey);
};

// 手动 hydrate 函数，在客户端组件中使用
export const hydrateConfigStore = () => {
  useConfigStore.persist.rehydrate();
};