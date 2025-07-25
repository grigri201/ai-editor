import OpenAI from 'openai';
import { LLMProvider } from '@/types/config';
import { getDecryptedApiKey, useConfigStore } from '@/stores/configStore';
import { UNIFIED_EDIT_PROMPT } from '@/prompts/unified';

// API 端点配置
const API_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1'
} as const;

// 替换模板中的占位符
function applyTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// 创建 OpenAI 客户端实例
export function createLLMClient(provider: LLMProvider, apiKey: string): OpenAI | null {
  if (!apiKey) {
    return null;
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: API_ENDPOINTS[provider],
      dangerouslyAllowBrowser: true // 仅在开发环境中使用，生产环境应通过后端API
    });

    return client;
  } catch (error) {
    console.error(`创建 ${provider} 客户端失败:`, error);
    return null;
  }
}

// 获取当前配置的 LLM 客户端
export function getCurrentLLMClient(): OpenAI | null {
  const { provider } = useConfigStore.getState();
  const apiKey = getDecryptedApiKey();
  
  return createLLMClient(provider, apiKey);
}

// 验证配置是否完整
export function validateLLMConfig(): { isValid: boolean; error?: string } {
  const apiKey = getDecryptedApiKey();
  const { provider } = useConfigStore.getState();

  if (!apiKey) {
    return { 
      isValid: false, 
      error: `Please set ${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} API Key in settings` 
    };
  }

  return { isValid: true };
}

// 发送消息到 LLM
export async function sendMessageToLLM(
  message: string,
  systemPrompt?: string,
  templateVariables?: {
    content?: string;
    instruction?: string;
    language?: string;
  }
): Promise<{ success: boolean; content?: string; error?: string }> {
  const client = getCurrentLLMClient();
  const { model } = useConfigStore.getState();

  if (!client) {
    const validation = validateLLMConfig();
    return { success: false, error: validation.error };
  }

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    // 如果提供了模板变量，使用统一模板
    if (templateVariables) {
      const finalSystemPrompt = systemPrompt || UNIFIED_EDIT_PROMPT;
      const unifiedMessage = applyTemplate(finalSystemPrompt, {
        content: templateVariables.content || '',
        instruction: templateVariables.instruction || message,
        language: templateVariables.language || 'en',
      });
      messages.push({ role: 'system', content: unifiedMessage });
    } else {
      // 否则使用原始方式
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: message });
    }

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.3, // 降低 temperature 以获得更一致的输出
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      return { success: false, error: 'No valid response received' };
    }

    return { success: true, content };
  } catch (error) {
    console.error('LLM 请求失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Request failed, please try again later' 
    };
  }
}

// 创建流式响应
export async function* streamMessageToLLM(
  message: string,
  systemPrompt?: string,
  templateVariables?: {
    content?: string;
    instruction?: string;
    language?: string;
  }
): AsyncGenerator<{ chunk?: string; error?: string; done?: boolean }> {
  const client = getCurrentLLMClient();
  const { model } = useConfigStore.getState();

  if (!client) {
    const validation = validateLLMConfig();
    yield { error: validation.error, done: true };
    return;
  }

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    // 如果提供了模板变量，使用统一模板
    if (templateVariables) {
      const finalSystemPrompt = systemPrompt || UNIFIED_EDIT_PROMPT;
      const unifiedMessage = applyTemplate(finalSystemPrompt, {
        content: templateVariables.content || '',
        instruction: templateVariables.instruction || message,
        language: templateVariables.language || 'en',
      });
      messages.push({ role: 'system', content: unifiedMessage });
    } else {
      // 否则使用原始方式
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: message });
    }

    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.3, // 降低 temperature 以获得更一致的输出
      max_tokens: 2000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { chunk: content };
      }
    }

    yield { done: true };
  } catch (error) {
    console.error('LLM 流式请求失败:', error);
    yield { 
      error: error instanceof Error ? error.message : 'Request failed, please try again later',
      done: true 
    };
  }
}