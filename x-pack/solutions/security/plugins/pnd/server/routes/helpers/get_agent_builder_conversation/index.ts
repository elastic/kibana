/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import type { Conversation } from '@kbn/agent-builder-common';

import { scopedSelfGet } from '../../get/conversations/helpers/scoped_self_get';
import { AGENT_BUILDER_API_VERSION, buildAgentBuilderConversationPath } from '../agent_builder_api';

/** Whether the conversation is readable by the caller, and the status that said so. */
export interface GetAgentBuilderConversationResult {
  /** The conversation, when the caller could read it. */
  conversation: Conversation | undefined;
  /**
   * `true` only for a 2xx. A `404` — which Agent Builder also returns for a conversation that
   * exists but the caller may not read — is `false`, deliberately: from PND's side those two are
   * the same answer, and keeping them the same is what makes existence non-observable.
   */
  exists: boolean;
  /** HTTP status returned by Agent Builder. */
  status: number;
}

export interface GetAgentBuilderConversationParams {
  /** The Agent Builder conversation id. Callers must S11-guard it before getting here. */
  conversationId: string;
  http: HttpServiceStart;
  /** The incoming request, so the read runs as the calling user (D7). */
  request: KibanaRequest;
  /** Space resolved from the request (security finding S9). */
  spaceId: string;
}

/**
 * Read one Agent Builder conversation **as the calling user**, via
 * `GET /api/agent_builder/conversations/{id}`.
 *
 * This is `_ensure`'s D6 pre-read and its post-failure re-read, and the read `.8`'s
 * `GET /internal/pnd/conversations/{conversationId}` is built on.
 *
 * **The strongest IDOR control here is inherited, not implemented.** Agent Builder's
 * `client.exists()` is space-filtered but *not* access-filtered, and `getConversation` then `get()`s
 * with `access: 'converse'` — so an id that exists but the caller cannot read answers `404` rather
 * than being treated as absent-and-creatable. PND gets that for free precisely because it goes over
 * HTTP as the caller instead of using an internal client. Do not "improve" this into a
 * `client.exists()` check.
 */
export const getAgentBuilderConversation = async ({
  conversationId,
  http,
  request,
  spaceId,
}: GetAgentBuilderConversationParams): Promise<GetAgentBuilderConversationResult> => {
  const { body, status } = await scopedSelfGet<Conversation>({
    http,
    path: buildAgentBuilderConversationPath(conversationId),
    request,
    spaceId,
    version: AGENT_BUILDER_API_VERSION,
  });

  return { conversation: body, exists: status >= 200 && status < 300, status };
};
