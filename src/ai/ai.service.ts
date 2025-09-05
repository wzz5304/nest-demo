import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import axios from 'axios';

import { Conversation } from './schemas/conversation.schema';
import { Message, MessageRole, MessageStatus } from './schemas/message.schema';
import { ChatDto } from './dto/chat.dto';
import { CreateConversationDto, PageQueryDto } from './dto/conversation.dto';
import { aiConfig } from './ai.config';
import {
  ChatCompletionMessage,
  ChatCompletionRequest,
  ChatStreamResponse,
  SSEMessage,
} from './interfaces/ai.interface';
import { ApiResponse, Page } from '../common/interfaces/api-response.interface';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  /**
   * 处理循环引用的JSON序列化
   */
  private getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    };
  }

  /**
   * 发送SSE事件
   */
  private sendSSEEvent(res: Response, message: SSEMessage): void {
    const { event, data, id, retry } = message;

    if (event) {
      res.write(`event: ${event}\n`);
    }
    if (id) {
      res.write(`id: ${id}\n`);
    }
    if (retry) {
      res.write(`retry: ${retry}\n`);
    }

    try {
      res.write(
        `data: ${JSON.stringify(data, this.getCircularReplacer())}\n\n`,
      );
    } catch (error) {
      this.logger.error(`序列化SSE数据失败: ${error.message}`);
      res.write(
        `data: ${JSON.stringify({
          error: 'serialization_error',
          message: '数据序列化失败',
        })}\n\n`,
      );
    }

    // 某些环境下需要手动刷新缓冲区
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
  }

  /**
   * 调用流式AI模型
   */
  private createStreamHandler(
    res: Response,
    resolve: (content: string) => void,
    reject: (error: Error) => void,
  ) {
    let contentAccumulator = '';
    let isResolved = false;

    // 统一处理流完成逻辑
    const completeStream = (content: string) => {
      if (isResolved) return;
      isResolved = true;
      this.logger.debug('流处理完成');
      this.sendSSEEvent(res, {
        event: 'done',
        data: { content },
      });
      resolve(content);
    };

    // 统一处理流错误逻辑
    const failStream = (error: Error) => {
      if (isResolved) return;
      isResolved = true;
      this.logger.error(`流处理失败: ${error.message}`);
      this.sendSSEEvent(res, {
        event: 'error',
        data: { error: 'stream_error', message: error.message },
      });
      reject(error);
    };

    return {
      handleData: (chunk: Buffer) => {
        try {
          const lines = chunk
            .toString()
            .split('\n')
            .filter((line) => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith(':')) continue;
            if (!line.startsWith('data:')) continue;

            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              this.logger.debug('收到流结束标记 [DONE]');
              completeStream(contentAccumulator);
              return;
            }

            try {
              const parsedData = JSON.parse(data) as ChatStreamResponse;
              const { choices } = parsedData;

              if (choices?.[0]?.delta?.content) {
                contentAccumulator += choices[0].delta.content;
                this.sendSSEEvent(res, {
                  event: 'chunk',
                  data: { content: choices[0].delta.content },
                });
              }

              if (choices?.[0]?.finish_reason) {
                this.logger.debug(`收到完成原因: ${choices[0].finish_reason}`);
                completeStream(contentAccumulator);
                return;
              }
            } catch (parseError) {
              this.logger.error(
                `解析流数据失败: ${parseError.message}, 原始数据: ${data}`,
              );
            }
          }
        } catch (error) {
          this.logger.error(`处理流数据块失败: ${error.message}`);
          failStream(error);
        }
      },

      handleEnd: () => {
        this.logger.debug('流数据传输结束');
        if (contentAccumulator) {
          completeStream(contentAccumulator);
        } else {
          const error = new Error('未收到AI响应');
          this.logger.error('流数据传输结束但未收到有效响应');
          failStream(error);
        }
      },

      handleError: (error: Error) => {
        this.logger.error(`流数据传输错误: ${error.message}`);
        failStream(error);
      },
    };
  }

  /**
   * 调用流式AI模型
   */
  private async callStreamAIModel(
    messages: ChatCompletionMessage[],
    modelName: string,
    res: Response,
  ): Promise<string> {
    const modelConfig =
      aiConfig.models[modelName] || aiConfig.models[aiConfig.defaultModel];
    const requestData: ChatCompletionRequest = {
      model: modelConfig.model,
      messages,
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxTokens,
      stream: true,
    };

    try {
      this.logger.log(
        `调用流式AI模型: ${modelConfig.baseUrl}/chat/completions, 模型: ${modelConfig.model}`,
      );

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error('请求超时，请稍后再试');
          reject(error);
        }, modelConfig.timeout);
      });

      const streamPromise = new Promise<string>((resolve, reject) => {
        const handler = this.createStreamHandler(res, resolve, reject);

        axios
          .post(`${modelConfig.baseUrl}/chat/completions`, requestData, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${modelConfig.apiKey}`,
            },
            responseType: 'stream',
          })
          .then((response) => {
            response.data.on('data', handler.handleData);
            response.data.on('end', handler.handleEnd);
            response.data.on('error', handler.handleError);
          })
          .catch((error) => {
            this.logger.error(`API请求失败: ${error.message}`);
            if (error.response) {
              this.logger.error(`响应状态: ${error.response.status}`);
              if (error.response.data) {
                const safeData =
                  typeof error.response.data === 'object'
                    ? JSON.stringify(
                        error.response.data,
                        this.getCircularReplacer(),
                      )
                    : error.response.data;
                this.logger.error(`响应数据: ${safeData}`);
              }
            }
            handler.handleError(error);
          });
      });

      return (await Promise.race([streamPromise, timeoutPromise])) as string;
    } catch (error) {
      this.logger.error(`调用流式AI模型失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取或创建会话
   */
  private async getOrCreateConversation(
    userId: number,
    message: string,
    modelName: string,
    conversationId?: string,
  ) {
    if (conversationId) {
      const conversation = await this.conversationModel
        .findById(conversationId)
        .exec();
      if (!conversation) {
        throw new Error('会话不存在');
      }
      if (conversation.userId !== userId) {
        throw new Error('无权访问此会话');
      }
      return conversation;
    }

    const conversation = new this.conversationModel({
      userId,
      title: message.substring(0, 20) + (message.length > 20 ? '...' : ''),
      model: modelName,
      messageCount: 0,
      lastMessageAt: new Date(),
    });
    await conversation.save();
    return conversation;
  }

  /**
   * 创建消息
   */
  private async createMessage(
    conversation: any,
    userId: number,
    content: string,
    role: string,
    modelName: string,
    status = MessageStatus.COMPLETED,
  ) {
    const message = new this.messageModel({
      conversationId: conversation._id,
      userId,
      role,
      content,
      status,
      model: modelName,
    });
    await message.save();
    return message;
  }

  private async updateConversation(conversation: any) {
    conversation.messageCount += 1;
    conversation.lastMessageAt = new Date();
    await conversation.save();
  }

  /**
   * 处理流式响应错误
   */
  private handleStreamError(error: any, res: Response) {
    this.logger.error(`聊天流式响应失败: ${error.message}`, error.stack);
    const errorMessage = { error: 'chat_error', message: error.message };
    this.sendSSEEvent(res, { event: 'error', data: errorMessage });
    res.end();
  }

  async chatStream(
    userId: number,
    chatDto: ChatDto,
    res: Response,
  ): Promise<void> {
    const { message, conversationId, model, systemPrompt } = chatDto;
    const modelName = model || aiConfig.defaultModel;
    let conversation: Conversation; // 明确类型

    try {
      // 设置SSE响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // 获取或创建会话
      conversation = await this.getOrCreateConversation(
        userId,
        message,
        modelName,
        conversationId,
      );

      // 向客户端发送conversation信息（包含足够信息让客户端创建占位符）
      res.write(
        `event: conversation\ndata: ${JSON.stringify(conversation)}\n\n`,
      );

      // 保存用户消息
      const userMessage = await this.createMessage(
        conversation,
        userId,
        message,
        MessageRole.USER,
        modelName,
      );

      // 此时更新会话 - 因为添加了新的用户消息
      await this.updateConversation(conversation);

      // 准备消息上下文
      const messages: ChatCompletionMessage[] = [];
      if (systemPrompt) {
        messages.push({ role: MessageRole.SYSTEM, content: systemPrompt });
      }

      // 获取历史消息（包含刚创建的用户消息）
      const historyMessages = await this.messageModel
        .find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(2)
        .exec();

      // 按时间顺序排列消息
      historyMessages.reverse().forEach((msg) => {
        messages.push({ role: msg.role, content: msg.content });
      });

      const aiResponseContent = await this.callStreamAIModel(
        messages,
        modelName,
        res,
      );

      // 创建并保存AI助手消息（此时已完成流式传输）
      await this.createMessage(
        conversation,
        userId,
        aiResponseContent,
        MessageRole.ASSISTANT,
        modelName,
        MessageStatus.COMPLETED,
      );

      // 最后更新一次会话 - 因为添加了AI回复
      await this.updateConversation(conversation);
      res.end();
    } catch (error) {
      this.handleStreamError(error, res);
    }
  }

  /**
   * 创建会话
   */
  async createConversation(
    userId: number,
    createConversationDto: CreateConversationDto,
  ): Promise<ApiResponse<Conversation>> {
    try {
      const { title, model } = createConversationDto;

      const conversation = new this.conversationModel({
        userId,
        title: title || '新对话',
        model: model || aiConfig.defaultModel,
        messageCount: 0,
        lastMessageAt: new Date(),
      });

      await conversation.save();

      return {
        code: 200,
        data: conversation,
        errorMessage: null,
      };
    } catch (error) {
      this.logger.error(`创建会话失败: ${error.message}`, error.stack);
      return {
        code: 500,
        data: null,
        errorMessage: `创建会话失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取会话列表
   */
  async getConversations(
    userId: number,
    pageQueryDto: PageQueryDto,
  ): Promise<ApiResponse<Page<Conversation>>> {
    try {
      const { page = 1, limit = 20 } = pageQueryDto;
      const skip = (page - 1) * limit;

      const query = { userId, isDeleted: false };

      const [conversations, total] = await Promise.all([
        this.conversationModel
          .find(query)
          .sort({ lastMessageAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.conversationModel.countDocuments(query).exec(),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        code: 200,
        data: {
          content: conversations,
          pageNum: page,
          pageSize: limit,
          totalElements: total,
          totalPages,
        },
        errorMessage: null,
      };
    } catch (error) {
      this.logger.error(`获取会话列表失败: ${error.message}`, error.stack);
      return {
        code: 500,
        data: null,
        errorMessage: `获取会话列表失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取会话详情
   */
  async getConversation(
    userId: number,
    conversationId: string,
  ): Promise<ApiResponse<{ conversation: Conversation; messages: Message[] }>> {
    try {
      const conversation = await this.conversationModel
        .findById(conversationId)
        .exec();

      if (!conversation) {
        return {
          code: 404,
          data: null,
          errorMessage: '会话不存在',
        };
      }

      if (conversation.userId !== userId) {
        return {
          code: 403,
          data: null,
          errorMessage: '无权访问此会话',
        };
      }

      const messages = await this.messageModel
        .find({ conversationId })
        .sort({ createdAt: 1 })
        .exec();

      return {
        code: 200,
        data: {
          conversation,
          messages,
        },
        errorMessage: null,
      };
    } catch (error) {
      this.logger.error(`获取会话详情失败: ${error.message}`, error.stack);
      return {
        code: 500,
        data: null,
        errorMessage: `获取会话详情失败: ${error.message}`,
      };
    }
  }

  /**
   * 修改会话名称
   * */
  async updateConversationName(
    userId: number,
    conversationId: string,
    updateConversationDto: { title: string },
  ) {
    const updatedProfile = await this.conversationModel
      .findOneAndUpdate(
        { _id: conversationId, userId },
        updateConversationDto,
        {
          new: true,
        },
      )
      .exec();
    if (!updatedProfile) {
      return {
        code: 404,
        data: null,
        errorMessage: '会话不存在',
      };
    }

    return {
      code: 200,
      data: updatedProfile,
      errorMessage: null,
    };
  }

  /**
   * 删除会话（软删除）
   */
  async deleteConversation(
    userId: number,
    conversationId: string,
  ): Promise<ApiResponse<boolean>> {
    try {
      const conversation = await this.conversationModel
        .findById(conversationId)
        .exec();

      if (!conversation) {
        return {
          code: 404,
          data: false,
          errorMessage: '会话不存在',
        };
      }

      if (conversation.userId !== userId) {
        return {
          code: 403,
          data: false,
          errorMessage: '无权删除此会话',
        };
      }

      conversation.isDeleted = true;
      await conversation.save();

      return {
        code: 200,
        data: true,
        errorMessage: null,
      };
    } catch (error) {
      this.logger.error(`删除会话失败: ${error.message}`, error.stack);
      return {
        code: 500,
        data: false,
        errorMessage: `删除会话失败: ${error.message}`,
      };
    }
  }
}
