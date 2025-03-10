/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavedObjectsClientContract, Logger, SavedObject } from '@kbn/core/server';
import type { Conversation, ConversationCreateRequest } from '../../../common/conversations';
import {
  conversationTypeName,
  type ConversationAttributes,
} from '../../saved_objects/conversations';
import type { ClientUser } from './types';
import { savedObjectToModel, createRequestToRaw, updateToAttributes } from './convert_model';

interface ConversationClientOptions {
  logger: Logger;
  client: SavedObjectsClientContract;
  user: ClientUser;
}

export type ConversationUpdatableFields = Partial<Pick<Conversation, 'title' | 'events'>>;

export interface ConversationClient {
  list(): Promise<Conversation[]>;
  get(options: { conversationId: string }): Promise<Conversation>;
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  update(conversationId: string, fields: ConversationUpdatableFields): Promise<Conversation>;
}

export class ConversationClientImpl implements ConversationClient {
  private readonly client: SavedObjectsClientContract;
  private readonly user: ClientUser;
  // @ts-expect-error will be used at some point
  private readonly logger: Logger;

  constructor({ client, user, logger }: ConversationClientOptions) {
    this.client = client;
    this.user = user;
    this.logger = logger;
  }

  async list(): Promise<Conversation[]> {
    const { saved_objects: results } = await this.client.find<ConversationAttributes>({
      type: conversationTypeName,
      filter: `${conversationTypeName}.attributes.user_id: ${this.user.id}`,
      perPage: 1000,
    });

    return results.map(savedObjectToModel);
  }

  async get({ conversationId }: { conversationId: string }): Promise<Conversation> {
    const conversationSo = await this._rawGet({ conversationId });
    return savedObjectToModel(conversationSo);
  }

  async create(conversation: ConversationCreateRequest): Promise<Conversation> {
    const now = new Date();
    const id = conversation.id ?? uuidv4();
    const attributes = createRequestToRaw({
      conversation,
      id,
      user: this.user,
      creationDate: now,
    });
    const created = await this.client.create<ConversationAttributes>(
      conversationTypeName,
      attributes,
      { id }
    );
    return savedObjectToModel(created);
  }

  async update(
    conversationId: string,
    updatedFields: ConversationUpdatableFields
  ): Promise<Conversation> {
    const conversationSo = await this._rawGet({ conversationId });
    const updatedAttributes = {
      ...conversationSo.attributes,
      ...updateToAttributes({ updatedFields }),
    };

    await this.client.update<ConversationAttributes>(
      conversationTypeName,
      conversationSo.id,
      updatedAttributes
    );

    return savedObjectToModel({
      ...conversationSo,
      attributes: updatedAttributes,
    });
  }

  private async _rawGet({
    conversationId,
  }: {
    conversationId: string;
  }): Promise<SavedObject<ConversationAttributes>> {
    const { saved_objects: results } = await this.client.find<ConversationAttributes>({
      type: conversationTypeName,
      filter: `${conversationTypeName}.attributes.user_id: ${this.user.id} AND ${conversationTypeName}.attributes.conversation_id: ${conversationId}`,
    });
    if (results.length > 0) {
      return results[0];
    }
    throw new Error(`Conversation ${conversationId} not found`);
  }
}
