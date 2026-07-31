/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import { useKibana } from '../use_kibana';

export const useConversations = () => {
  const {
    services: { agentBuilder, http },
  } = useKibana();

  const isAvailable = !!agentBuilder;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fetchConversations'],
    retry: false,
    queryFn: async () => {
      const response = await http.get<{ results: ConversationWithoutRounds[] }>(
        '/api/agent_builder/conversations'
      );
      return response.results;
    },
    enabled: isAvailable,
  });

  return {
    conversations: data ?? [],
    isLoading,
    isError,
  };
};
