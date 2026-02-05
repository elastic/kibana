/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { GET_AGENTS_ROUTE } from '../../../common/routes';
import { useKibana } from './use_kibana';

interface ListAgentResponse {
  results: AgentDefinition[];
}

export const useAgents = (): UseQueryResult<AgentDefinition[]> => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['workplace_ai', 'agents'],
    queryFn: async () => {
      const response = await http.get<ListAgentResponse>(GET_AGENTS_ROUTE);
      return response.results;
    },
  });
};
