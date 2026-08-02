/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_CONVERSATIONS_URL } from '@kbn/pnd-common';
import type { ListConversationsResponse, PndConversation } from '@kbn/pnd-common';

import { queryKeys } from '../../query_keys';
import { retryOnTransientError } from '../retry_on_transient_error';

/**
 * `GET /internal/pnd/conversations` — the PND-derived Agent Builder conversations in this space.
 *
 * The lifecycle view uses it to decide whether an "Open conversation" action is honest: conversation
 * ids are derived **unconditionally** from the discovery id, so a derived id proves nothing about
 * whether the thread exists. A run parked at gate 1 never opened the incident conversation, and a
 * blind link would 404. Gating the action on this list makes it appear exactly when the thread is
 * really there.
 *
 * The chat page pages each kind independently via `kind` / `page` / `perPage`. Lifecycle and the
 * queue omit those params so they still receive the whole projection.
 */
export interface UsePndConversationsOptions {
  /** `false` while the caller has nothing to match against, e.g. a lifecycle with no discovery id. */
  enabled?: boolean;
  kind?: PndConversation['kind'];
  page?: number;
  perPage?: number;
}

export const usePndConversations = ({
  enabled = true,
  kind,
  page,
  perPage,
}: UsePndConversationsOptions = {}): UseQueryResult<ListConversationsResponse> => {
  const { services } = useKibana();

  return useQuery({
    enabled,
    keepPreviousData: true,
    queryFn: async (): Promise<ListConversationsResponse> =>
      services.http!.get<ListConversationsResponse>(PND_CONVERSATIONS_URL, {
        query: {
          ...(kind != null ? { kind } : {}),
          ...(page != null ? { page } : {}),
          ...(perPage != null ? { perPage } : {}),
        },
        version: API_VERSIONS.internal.v1,
      }),
    queryKey: queryKeys.conversations.list({ kind, page, perPage }),
    retry: retryOnTransientError,
  });
};
