import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { ConversationsService } from './conversations.service';
import {
  ConversationSummaryDto,
  ConversationWithMessagesDto,
  PaginatedConversationsDto,
} from './dto/conversation.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@ApiTags('conversations')
@ApiBearerAuth('bearer')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created.', type: ConversationSummaryDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationSummaryDto> {
    return this.conversationsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List the current user’s conversations (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated conversation list.', type: PaginatedConversationsDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListConversationsDto,
  ): Promise<PaginatedConversationsDto> {
    return this.conversationsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single conversation with its messages' })
  @ApiResponse({ status: 200, description: 'Conversation with messages.', type: ConversationWithMessagesDto })
  @ApiResponse({ status: 403, description: 'Conversation belongs to another user.' })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConversationWithMessagesDto> {
    return this.conversationsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation renamed.', type: ConversationSummaryDto })
  @ApiResponse({ status: 403, description: 'Conversation belongs to another user.' })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ): Promise<ConversationSummaryDto> {
    return this.conversationsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a conversation (cascades to messages)' })
  @ApiResponse({ status: 204, description: 'Conversation deleted.' })
  @ApiResponse({ status: 403, description: 'Conversation belongs to another user.' })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.conversationsService.remove(user.id, id);
  }
}
