/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, buildConversationAttachmentsUrl } from '@kbn/pnd-common';
import type { GetConversationAttachmentsResponse } from '@kbn/pnd-common';

import { queryKeys } from '../../query_keys';
import { classifyQueryError } from '../../states';
import { retryOnTransientError } from '../retry_on_transient_error';

/** What a thread with nothing on it returns, and what a 404 is read as. */
const NO_ATTACHMENTS: GetConversationAttachmentsResponse = { attachments: [], total: 0 };

export interface UseConversationAttachmentsParams {
  /** Required by the route: the S11 guard asserts the conversation derives from this discovery. */
  correlationId: string;
  /** The thread id already on the proposal row / conversation list — never re-derived in the browser. */
  conversationId: string;
  /** `false` while the caller has nothing to read attachments for. */
  enabled?: boolean;
}

/**
 * `GET /internal/pnd/conversations/{conversationId}/attachments` — the Agent Builder attachments on
 * one PND thread, projected into PND's own shape (D10).
 *
 * **A 404 is resolved as an empty list, not raised as an error**, and that is the whole reason this
 * hook exists rather than a bare `useQuery`. The route answers 404 for every refusal on purpose and
 * they are indistinguishable by design (S11 rejection, a discovery this user cannot read, an absent
 * conversation, an unreadable one) — so the only honest thing an analyst can be told is "there is
 * nothing to show for this proposal". A 500 is a real failure and still surfaces as one.
 *
 * Its own cache key (D15). It must never be registered under `queryKeys.proposals.list()` or
 * `queryKeys.executions.detail()`: react-query caches by key rather than by hook, so a second
 * `queryFn` under an existing key silently hands one of the two surfaces a body it cannot parse,
 * depending only on mount order.
 *
 * Disabled without both ids rather than throwing: a thread that has not been materialised yet is the
 * ordinary state of a proposal, and a failed request is not how that should read.
 */
export const useConversationAttachments = ({
  correlationId,
  conversationId,
  enabled = true,
}: UseConversationAttachmentsParams): UseQueryResult<GetConversationAttachmentsResponse> => {
  const { services } = useKibana();

  return useQuery({
    enabled: enabled && correlationId !== '' && conversationId !== '',
    queryFn: async (): Promise<GetConversationAttachmentsResponse> => {
      try {
        const body = await services.http!.get<GetConversationAttachmentsResponse>(
          buildConversationAttachmentsUrl(conversationId),
          {
            query: { correlationId },
            version: API_VERSIONS.internal.v1,
          }
        );

        return body ?? NO_ATTACHMENTS;
      } catch (error) {
        if (classifyQueryError(error) === 'notFound') {
          return NO_ATTACHMENTS;
        }

        throw error;
      }
    },
    queryKey: queryKeys.attachments.list({ correlationId, conversationId }),
    retry: retryOnTransientError,
  });
};
