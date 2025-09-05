export interface ModelConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface AIConfig {
  defaultModel: string;
  models: Record<string, ModelConfig>;
}

export const aiConfig: AIConfig = {
  defaultModel: 'qwen-plus',
  models: {
    'qwen-plus': {
      name: 'qwen-plus',
      apiKey: 'sk-c540e602a6954d3b900c4c1e2fd7f898',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
      maxTokens: 4000,
      temperature: 0.7,
      timeout: 30000,
    },
    openai: {
      name: 'openai',
      apiKey: 'sk-your-openai-api-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      maxTokens: 2000,
      temperature: 0.7,
      timeout: 30000,
    },
    // 可以添加其他模型配置
  },
};
