/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';

import {
  AGENT_BUILDER_API_VERSION,
  AGENT_BUILDER_CONVERSATIONS_PATH,
} from '../../../../helpers/agent_builder_api';
import { scopedSelfPost } from '../../../../helpers/scoped_self_post';

export interface CreatePndConversationParams {
  /**
   * One of the three installed PND agent ids (D3). Omitted when `ensurePndAgents` did not report
   * success, so Agent Builder falls back to its default agent rather than the route naming an agent
   * that was never ensured — the same degrade-together rule `_derive` follows (ADR-011).
   */
  agentId?: string;
  /** The derived thread id. The create route accepts a client-supplied UUID. */
  conversationId: string;
  http: HttpServiceStart;
  /** The incoming request, so the create runs as the calling user (D7). */
  request: KibanaRequest;
  /** Space resolved from the request (security finding S9). */
  spaceId: string;
  /** Server-built title. Never caller-supplied text (D5). */
  title: string;
}

/** The create hop's outcome, as a status the caller can surface rather than an exception. */
export interface CreatePndConversationResult {
  /** HTTP status Agent Builder answered with. */
  status: number;
}

/**
 * Mint a thread via Agent Builder's public create route, as the calling user (D7).
 *
 * `POST /api/agent_builder/conversations` accepts a client-supplied UUID and a title, so the
 * conversation lands at the derived id `_ensure` already advertises — with no LLM turn. That is
 * what retires ADR-012's one-turn-per-proposal cost and the seeded-turn prompt-injection surface.
 *
 * **`access_control: { access_mode: 'public' }` is load-bearing, not a nicety.** Agent Builder
 * conversations default to **private**, and `buildPndConversations` intersects the *caller's*
 * conversations with the derived id set — so a private thread would be visible only to whoever the
 * workflow's `kibana.request` ran as, and invisible to every analyst working the queue, with no
 * error anywhere.
 *
 * A 409 means the conversation_id already exists (the create route maps `op_type: create`
 * conflicts to conflict, not 404). The caller treats that as the D6 concurrent-create case.
 */
export const createPndConversation = async ({
  agentId,
  conversationId,
  http,
  request,
  spaceId,
  title,
}: CreatePndConversationParams): Promise<CreatePndConversationResult> => {
  const { status } = await scopedSelfPost({
    body: {
      access_control: { access_mode: ConversationAccessControlMode.Public },
      ...(agentId == null ? {} : { agent_id: agentId }),
      conversation_id: conversationId,
      title,
    },
    http,
    path: AGENT_BUILDER_CONVERSATIONS_PATH,
    request,
    spaceId,
    version: AGENT_BUILDER_API_VERSION,
  });

  return { status };
};
