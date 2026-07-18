import { Body, Controller, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { UsageGuard } from '../usage/usage.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { StopStreamDto } from './dto/stop-stream.dto';
import { StopStreamResult } from './chat-stream-event.types';

@ApiTags('chat')
@ApiBearerAuth('bearer')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(UsageGuard)
  @ApiOperation({
    summary: 'Send a message and stream the AI answer over SSE',
    description:
      'Returns a text/event-stream. Events: started, tool_start, tool_query, ' +
      'tool_end, token, done, tool_error, error.',
  })
  @ApiResponse({
    status: 200,
    description: 'Server-Sent Events stream (text/event-stream).',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: 'data: {"type":"token","content":"Apple"}\n\n',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({ status: 429, description: 'Usage budget exceeded.' })
  async chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.chatService.orchestrateStream(user.id, dto, res);
  }

  @Post('stop')
  @HttpCode(200)
  @ApiOperation({ summary: 'Abort an in-flight chat stream' })
  @ApiResponse({ status: 200, description: 'Stream aborted (or already finished).', type: StopStreamResult })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  stop(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StopStreamDto,
  ): StopStreamResult {
    return this.chatService.stopStream(user.id, dto);
  }
}
