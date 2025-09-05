import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { AIService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { CreateConversationDto, PageQueryDto } from './dto/conversation.dto';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';

@UseInterceptors(TransformInterceptor)
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('chat')
  async chat(
    @Req() req: Request,
    @Body() chatDto: ChatDto,
    @Res() res: Response,
  ) {
    const userId = (req.user as any)?.id; // 从JWT中获取用户ID
    await this.aiService.chatStream(userId, chatDto, res);
  }

  /**
   * 创建一个新的对话
   */
  @Post('conversations')
  async createConversation(
    @Req() req: Request,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    const userId = (req.user as any)?.id;
    return this.aiService.createConversation(userId, createConversationDto);
  }

  /**
   * 获取用户的所有对话
   */
  @Get('conversations')
  async getConversations(
    @Req() req: Request,
    @Query() pageQueryDto: PageQueryDto,
  ) {
    const userId = (req.user as any)?.id;
    return this.aiService.getConversations(userId, pageQueryDto);
  }

  /**
   * 获取用户的指定对话
   */
  @Get('conversations/:id')
  async getConversation(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any)?.id;
    return this.aiService.getConversation(userId, id);
  }

  /**
   * 修改会话名称
   * @param req
   * @param id
   * @param updateConversationDto
   * @returns
   */
  @Post('conversations/:id')
  async updateConversationName(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateConversationDto: { title: string },
  ) {
    const userId = (req.user as any)?.id;
    return this.aiService.updateConversationName(
      userId,
      id,
      updateConversationDto,
    );
  }

  /**
   * 删除用户的指定对话
   */

  @Delete('conversations/:id')
  async deleteConversation(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any)?.id;
    return this.aiService.deleteConversation(userId, id);
  }
}
