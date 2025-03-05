/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { InferenceServerStart } from '@kbn/inference-plugin/server';
import { Message } from '../../../common/messages';
import { Conversation, ConversationCreateRequest } from '../../../common/conversations';
import { userMessageEvent } from '../../../common/utils/conversation';
import { AgentFactory } from '../orchestration';
import { ConversationService } from '../conversations';

interface ChatServiceOptions {
  logger: Logger;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentFactory: AgentFactory;
}

export class ChatService {
  private readonly inference: InferenceServerStart;
  private readonly logger: Logger;
  private readonly conversationService: ConversationService;
  private readonly agentFactory: AgentFactory;

  constructor({ inference, logger, conversationService, agentFactory }: ChatServiceOptions) {
    this.inference = inference;
    this.logger = logger;
    this.conversationService = conversationService;
    this.agentFactory = agentFactory;
  }

  async converse({
    agentId,
    conversationId,
    connectorId,
    request,
    nextUserMessage,
  }: {
    agentId: string;
    connectorId: string;
    conversationId?: string;
    nextUserMessage: string;
    request: KibanaRequest;
  }) {
    const conversationClient = await this.conversationService.getScopedClient({ request });

    let conversation: Conversation;
    if (conversationId) {
      conversation = await conversationClient.get({ conversationId });
    } else {
      conversation = await conversationClient.create({
        agentId,
        title: 'New conversation', // TODO: translate
        events: [],
      });
    }

    // TODO: update with userMessageEvent(nextUserMessage)

    const agent = await this.agentFactory.getAgent({ request, connectorId, agentId });
    agent.run()
  }
}
