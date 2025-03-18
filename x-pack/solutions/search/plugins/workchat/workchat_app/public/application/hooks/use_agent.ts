/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useWorkChatServices } from './use_workchat_service';

export const useAgent = ({ agentId }: { agentId: string }) => {
  const { agentService } = useWorkChatServices();

  const { data: agent, isLoading } = useQuery({
    queryKey: ['workchat.agents', { id: agentId }],
    queryFn: async () => {
      return agentService.get(agentId);
    },
  });

  return {
    agent,
    isLoading,
  };
};
