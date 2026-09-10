/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO(elastic/search-team#15972): replace N individual get() calls with a bulk API once it lands.

import { asyncMapWithLimit } from '@kbn/std';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';

export interface ConversationTitlesClient {
  getTitles(conversationIds: string[]): Promise<Map<string, string>>;
}

const CONCURRENCY_LIMIT = 10;

export const createConversationTitlesClient = ({
  agentBuilder,
  request,
  logger,
}: {
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  logger: Logger;
}): ConversationTitlesClient => ({
  async getTitles(conversationIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(conversationIds)];
    const client = await agentBuilder.conversations.getScopedClient({ request });

    const pairs = await asyncMapWithLimit(uniqueIds, CONCURRENCY_LIMIT, async (id) => {
      try {
        const conversation = await client.get(id);
        return [id, conversation.title] as [string, string];
      } catch (err) {
        logger.debug(`Could not resolve title for conversation [${id}]: ${err}`);
        return undefined;
      }
    });

    const map = new Map<string, string>();
    for (const pair of pairs) {
      if (pair) map.set(pair[0], pair[1]);
    }
    return map;
  },
});
