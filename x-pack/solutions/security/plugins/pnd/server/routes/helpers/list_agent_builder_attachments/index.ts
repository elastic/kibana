/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import type { VersionedAttachment } from '@kbn/agent-builder-common';

import { scopedSelfGet } from '../../get/conversations/helpers/scoped_self_get';
import { AGENT_BUILDER_API_VERSION, buildAgentBuilderAttachmentsPath } from '../agent_builder_api';

/** Agent Builder's `ListAttachmentsResponse`, narrowed to the half PND projects. */
interface AgentBuilderListAttachmentsResponse {
  results: VersionedAttachment[];
  total_token_estimate: number;
}

/** The conversation's attachments, and the status that answered. */
export interface ListAgentBuilderAttachmentsResult {
  /**
   * Agent Builder's own `results`, in its own order. `undefined` when the conversation was not
   * readable, and also when a 2xx carried no `results` array — the self-client fetch is unvalidated,
   * so the documented shape is a claim rather than a guarantee.
   */
  attachments: VersionedAttachment[] | undefined;
  /**
   * `true` only for a 2xx. A `404` — which Agent Builder also returns for a conversation that exists
   * but the caller may not read — is `false`, deliberately: from PND's side those two are the same
   * answer, and keeping them the same is what makes existence non-observable.
   */
  exists: boolean;
  /** HTTP status returned by Agent Builder. */
  status: number;
}

export interface ListAgentBuilderAttachmentsParams {
  /** The Agent Builder conversation id. Callers must S11-guard it before getting here. */
  conversationId: string;
  http: HttpServiceStart;
  /** The incoming request, so the read runs as the calling user (D7). */
  request: KibanaRequest;
  /** Space resolved from the request (security finding S9). */
  spaceId: string;
}

/**
 * List one Agent Builder conversation's attachments **as the calling user**, via
 * `GET /api/agent_builder/conversations/{id}/attachments`.
 *
 * The read half of D10: PND creates three `type: 'text'` attachments on a thread when `_ensure`
 * materialises it, and the lifecycle flyout's Attachments tab lists them back through this hop.
 *
 * **Access control is inherited, not re-implemented.** Agent Builder's list handler `client.get`s
 * the conversation before touching its attachments, so a conversation the caller may not read
 * answers `404` there rather than here — the same control `getAgentBuilderConversation` documents.
 * PND gets it for free precisely because it goes over HTTP as the caller instead of using an
 * internal client, and `rawResponse: true` inside {@link scopedSelfGet} turns that `404` into a
 * status this helper reports rather than an exception the route has to catch.
 *
 * **`include_deleted` is never sent**, so soft-deleted attachments stay out of the response. The
 * Attachments tab shows what is on the thread now; a restored-attachment view is not in this epic.
 */
export const listAgentBuilderAttachments = async ({
  conversationId,
  http,
  request,
  spaceId,
}: ListAgentBuilderAttachmentsParams): Promise<ListAgentBuilderAttachmentsResult> => {
  const { body, status } = await scopedSelfGet<AgentBuilderListAttachmentsResponse>({
    http,
    path: buildAgentBuilderAttachmentsPath(conversationId),
    request,
    spaceId,
    version: AGENT_BUILDER_API_VERSION,
  });

  return {
    attachments: Array.isArray(body?.results) ? body.results : undefined,
    exists: status >= 200 && status < 300,
    status,
  };
};
