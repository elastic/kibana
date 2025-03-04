/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { Conversation } from '../../../common/conversations';
import {
  conversationTypeName,
  type ConversationAttributes,
} from '../../saved_objects/conversations';
import { fromModel } from './convert_model';

interface ClientUser {
  id: string;
  username: string;
}

interface ConversationClientOptions {
  logger: Logger;
  client: SavedObjectsClientContract;
  user: ClientUser;
}

export interface ConversationClient {
  list(): Promise<Conversation[]>;
}

export class ConversationClientImpl implements ConversationClient {
  private readonly client: SavedObjectsClientContract;
  private readonly user: ClientUser;
  private readonly logger: Logger;

  constructor({ client, user, logger }: ConversationClientOptions) {
    this.client = client;
    this.user = user;
    this.logger = logger;
  }

  async list(): Promise<Conversation[]> {
    const { saved_objects: results } = await this.client.find<ConversationAttributes>({
      type: conversationTypeName,
      filter: `${conversationTypeName}.user_id: ${this.user.id}`,
    });

    return results.map(fromModel);
  }
}
