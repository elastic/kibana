/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  filter,
  map,
  toArray,
  of,
  mergeMap,
  defer,
  shareReplay,
  forkJoin,
  switchMap,
  merge,
  catchError,
  throwError,
} from 'rxjs';
import { KibanaRequest, Logger } from '@kbn/core/server';
import { InferenceServerStart } from '@kbn/inference-plugin/server';
import { Conversation } from '../../../common/conversations';
import {
  conversationCreatedEvent,
  conversationUpdatedEvent,
} from '../../../common/utils/chat_events';
import { userMessageEvent, messageEvent } from '../../../common/utils/conversation';
import { isMessageEvent } from '../../../common/utils/chat_events';
import { AgentFactory } from '../orchestration';
import { ConversationService } from '../conversations';
import { generateConversationTitle } from './generate_conversation_title';
import { InternalIntegrationServices } from '@kbn/wci-common';

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
    internalServices,
  }: {
    agentId: string;
    connectorId: string;
    conversationId?: string;
    nextUserMessage: string;
    request: KibanaRequest;
    internalServices: InternalIntegrationServices;
  }) {
    const logError = (source: string, err: Error) => {
      this.logger.error(`Error during converse from ${source}: ${err.message}`);
    };

    const conversationClient = await this.conversationService.getScopedClient({ request });

    let conversation: Conversation;
    if (conversationId) {
      conversation = await conversationClient.get({ conversationId });
    } else {
      conversation = await conversationClient.create({
        agentId,
        title: 'New conversation', // TODO: translate default
        events: [],
      });
    }

    conversation.events.push(userMessageEvent(nextUserMessage));

    const title$ =
      // conversationId ? of(conversation.title) :
      defer(async () =>
        generateConversationTitle({
          conversationEvents: conversation.events,
          chatModel: await this.inference.getChatModel({
            request,
            connectorId,
            chatModelOptions: {},
          }),
        })
      ).pipe(
        catchError((err) => {
          logError('title$', err);
          return throwError(() => err);
        }),
        shareReplay()
      );

    const agent = await this.agentFactory.getAgent({ request, connectorId, agentId, internalServices });
    const agentOutput = await agent.run({ conversation });

    const agentEvents$ = agentOutput.events$;

    const newConversationEvents$ = agentEvents$.pipe(
      filter(isMessageEvent),
      map((event) => event.message),
      toArray(),
      mergeMap((newMessages) => {
        const newEvents = newMessages.map((message) => messageEvent(message));

        return of(newEvents);
      })
    );

    const updateConversation$ = forkJoin({
      title: title$,
      newConversationEvents: newConversationEvents$,
    }).pipe(
      switchMap(({ title, newConversationEvents }) => {
        return conversationClient.update(conversation.id, {
          title,
          events: [...conversation.events, ...newConversationEvents],
        });
      }),
      switchMap((updatedConversation) => {
        return of(
          conversationId
            ? conversationUpdatedEvent({
                title: updatedConversation.title,
                id: updatedConversation.id,
              })
            : conversationCreatedEvent({
                title: updatedConversation.title,
                id: updatedConversation.id,
              })
        );
      })
    );

    return merge(agentEvents$, updateConversation$).pipe(shareReplay());
  }
}
