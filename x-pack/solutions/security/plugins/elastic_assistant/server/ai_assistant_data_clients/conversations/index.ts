/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';
import {
  ConversationCreateProps,
  ConversationResponse,
  ConversationUpdateProps,
  Message,
} from '@kbn/elastic-assistant-common';
import { createConversation } from './create_conversation';
import { updateConversation } from './update_conversation';
import { getConversation } from './get_conversation';
import { deleteConversation } from './delete_conversation';
import { appendConversationMessages } from './append_conversation_messages';
import { AIAssistantDataClient, AIAssistantDataClientParams } from '..';

/**
 * Params for when creating ConversationDataClient in Request Context Factory. Useful if needing to modify
 * configuration after initial plugin start
 */
export interface GetAIAssistantConversationsDataClientParams {
  contentReferencesEnabled?: boolean;
}

export class AIAssistantConversationsDataClient extends AIAssistantDataClient {
  constructor(public readonly options: AIAssistantDataClientParams) {
    super(options);
  }

  /**
   * Updates a conversation with the new messages.
   * @param options
   * @param options.id The existing conversation id.
   * @param options.authenticatedUser Current authenticated user.
   * @returns The conversation response
   */
  public getConversation = async ({
    id,
    authenticatedUser,
  }: {
    id: string;
    authenticatedUser?: AuthenticatedUser | null;
  }): Promise<ConversationResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return getConversation({
      esClient,
      logger: this.options.logger,
      conversationIndex: this.indexTemplateAndPattern.alias,
      id,
      user: authenticatedUser ?? this.options.currentUser,
    });
  };

  /**
   * Updates a conversation with the new messages.
   * @param options
   * @param options.conversation The existing conversation to which append the new messages.
   * @param options.messages Set this to true if this is a conversation that is "immutable"/"pre-packaged".
   * @returns The conversation updated
   */
  public appendConversationMessages = async ({
    existingConversation,
    messages,
  }: {
    existingConversation: ConversationResponse;
    messages: Message[];
  }): Promise<ConversationResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return appendConversationMessages({
      esClient,
      logger: this.options.logger,
      conversationIndex: this.indexTemplateAndPattern.alias,
      existingConversation,
      messages,
    });
  };

  /**
   * Creates a conversation, if given at least the "title" and "g"
   * See {@link https://www.elastic.co/guide/en/security/current/}
   * for more information around formats of the deserializer and serializer
   * @param options
   * @param options.id The id of the conversation to create or "undefined" if you want an "id" to be auto-created for you
   * @param options.title A custom deserializer for the conversation. Optionally, you an define this as handle bars. See online docs for more information.
   * @param options.messages Set this to true if this is a conversation that is "immutable"/"pre-packaged".
   * @param options.g Determines how uploaded conversation item values are parsed. By default, conversation items are parsed using named regex groups. See online docs for more information.
   * @returns The conversation created
   */
  public createConversation = async ({
    conversation,
  }: {
    conversation: ConversationCreateProps;
  }): Promise<ConversationResponse | null> => {
    if (!this.options.currentUser) {
      throw new Error('AIAssistantConversationsDataClient currentUser is not defined.');
    }
    const esClient = await this.options.elasticsearchClientPromise;
    return createConversation({
      esClient,
      logger: this.options.logger,
      conversationIndex: this.indexTemplateAndPattern.alias,
      spaceId: this.spaceId,
      user: this.options.currentUser,
      conversation,
    });
  };

  /**
   * Updates a conversation container's value given the id of the conversation.
   * See {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html}
   * for more information around optimistic concurrency control.
   * @param options
   * @param options.conversationUpdateProps
   * @param options.conversationUpdateProps.id id of the conversation to replace the conversation container data with.
   * @param options.conversationUpdateProps.title The new tilet, or "undefined" if this should not be updated.
   * @param options.conversationUpdateProps.messages The new messages, or "undefined" if this should not be updated.
   * @param options.conversationUpdateProps.excludeFromLastConversationStorage The new value for excludeFromLastConversationStorage, or "undefined" if this should not be updated.
   * @param options.conversationUpdateProps.replacements The new value for replacements, or "undefined" if this should not be updated.
   */
  public updateConversation = async ({
    conversationUpdateProps,
    authenticatedUser,
    isPatch,
  }: {
    conversationUpdateProps: ConversationUpdateProps;
    authenticatedUser?: AuthenticatedUser;
    isPatch?: boolean;
  }): Promise<ConversationResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return updateConversation({
      esClient,
      logger: this.options.logger,
      conversationIndex: this.indexTemplateAndPattern.alias,
      conversationUpdateProps,
      isPatch,
      user: authenticatedUser ?? this.options.currentUser ?? undefined,
    });
  };

  /**
   * Given a conversation id, this will delete the conversation from the id
   * @param options
   * @param options.id The id of the conversation to delete
   * @returns The conversation deleted if found, otherwise null
   */
  public deleteConversation = async (id: string) => {
    const esClient = await this.options.elasticsearchClientPromise;
    return deleteConversation({
      esClient,
      conversationIndex: this.indexTemplateAndPattern.alias,
      id,
      logger: this.options.logger,
    });
  };
}
