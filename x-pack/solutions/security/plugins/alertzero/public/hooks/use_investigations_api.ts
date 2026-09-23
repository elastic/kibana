/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { retryOnTransientError } from '@kbn/agentic-investigations-plugin/public';
import { ALERTZERO_THIN_AGENT_ID } from '@kbn/alertzero-common';

/**
 * Minimal shape we need from the Agent Builder conversations list response.
 * The full type lives in agent_builder's internal common; we only read `pagination.total`.
 */
interface ConversationsCountResponse {
  pagination: { total: number };
}

// TODO: replace this direct HTTP path with a typed helper from agent_builder's start contract
// once one is exported. Tracked in <follow-up issue>.
const AGENT_BUILDER_CONVERSATIONS_PATH = '/api/agent_builder/conversations';

/** Count of AlertZero investigations (conversations owned by the AlertZero thin agent). */
export const useInvestigationsCount = (enabled: boolean): UseQueryResult<number> => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['alertzero', 'investigations', 'count'] as const,
    queryFn: async (): Promise<number> => {
      const response = await services.http!.get<ConversationsCountResponse>(
        AGENT_BUILDER_CONVERSATIONS_PATH,
        { query: { agent_id: ALERTZERO_THIN_AGENT_ID, per_page: 1 } }
      );
      return response.pagination.total;
    },
    enabled,
    retry: retryOnTransientError,
  });
};
