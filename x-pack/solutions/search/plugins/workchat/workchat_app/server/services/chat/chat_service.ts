/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map, toArray, concatWith, EMPTY, of, mergeMap, from } from 'rxjs';
import { KibanaRequest, Logger } from '@kbn/core/server';
import { InferenceServerStart } from '@kbn/inference-plugin/server';
import { Conversation } from '../../../common/conversations';
import { conversationCreatedEvent } from '../../../common/utils/chat_events';
import { userMessageEvent, messageEvent } from '../../../common/utils/conversation';
import { isMessageEvent } from '../../../common/utils/chat_events';
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
        title: 'New conversation', // TODO: translate default + TODO: generate title from conv
        events: [],
      });
    }

    conversation.events.push(userMessageEvent(nextUserMessage));

    const agent = await this.agentFactory.getAgent({ request, connectorId, agentId });
    const agentOutput = await agent.run({ conversation });

    const agentEvents$ = agentOutput.events$;

    const updateConversation$ = agentEvents$.pipe(
      filter(isMessageEvent),
      map((event) => event.message),
      toArray(),
      mergeMap((newMessages) => {
        const newEvents = newMessages.map((message) => messageEvent(message));

        return from(
          conversationClient.update(conversation.id, {
            events: [...conversation.events, ...newEvents],
          })
        );
      }),
      mergeMap(() => {
        return conversationId
          ? EMPTY
          : of(conversationCreatedEvent({ title: 'Updated title', id: conversation.id }));
      })
    );

    return agentEvents$.pipe(concatWith(updateConversation$));
  }
}
