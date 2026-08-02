/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';

import {
  AGENT_BUILDER_API_VERSION,
  AGENT_BUILDER_CONVERSATIONS_PATH,
} from '../../../../helpers/agent_builder_api';
import { scopedSelfGet } from '../scoped_self_get';

/** Shape of the Agent Builder conversations list response we consume. */
interface AgentBuilderListConversationsResponse {
  results: ConversationWithoutRounds[];
}

export interface ListAgentBuilderConversationsParams {
  /** Core's HTTP start contract. */
  http: HttpServiceStart;
  /** The incoming request, used to list conversations as the calling user. */
  request: KibanaRequest;
  /** Space id resolved from the request (S9). */
  spaceId: string;
}

/**
 * List the caller's Agent Builder conversations in the request's space via
 * `GET /api/agent_builder/conversations`. That route is already access-filtered per user by
 * `buildReadAccessFilter`, so the PND intersection against derived ids is safe by construction.
 *
 * ⚠️ The Agent Builder list API has no pagination and caps at 1000 conversations. Returns `[]` for
 * any non-2xx response.
 */
export const listAgentBuilderConversations = async ({
  http,
  request,
  spaceId,
}: ListAgentBuilderConversationsParams): Promise<ConversationWithoutRounds[]> => {
  const { body } = await scopedSelfGet<AgentBuilderListConversationsResponse>({
    http,
    path: AGENT_BUILDER_CONVERSATIONS_PATH,
    request,
    spaceId,
    version: AGENT_BUILDER_API_VERSION,
  });

  return body?.results ?? [];
};
