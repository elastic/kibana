/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsServiceStart,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import { agentTypeName } from '../../saved_objects/agents';
import { AgentClientImpl, AgentClient } from './agent_client';

interface ConversationServiceOptions {
  logger: Logger;
  savedObjects: SavedObjectsServiceStart;
  security: SecurityServiceStart;
}

export interface AgentService {
  /**
   * Returns an agent client scoped to the current user.
   */
  getScopedClient(options: { request: KibanaRequest }): Promise<AgentClient>;
}

export class AgentServiceImpl implements AgentService {
  private readonly savedObjects: SavedObjectsServiceStart;
  private readonly security: SecurityServiceStart;
  private readonly logger: Logger;

  constructor({ savedObjects, security, logger }: ConversationServiceOptions) {
    this.savedObjects = savedObjects;
    this.security = security;
    this.logger = logger;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<AgentClient> {
    const user = this.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('No user bound to the provided request');
    }
    const soClient = this.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [agentTypeName],
    });

    return new AgentClientImpl({
      logger: this.logger.get('client'),
      client: soClient,
      user: { id: user.profile_uid!, name: user.username },
    });
  }
}
