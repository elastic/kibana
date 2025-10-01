/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { AgentPolicyInfo } from '../../../../common/types';
import { fetchLegacyAgentPolicy } from '../state/agent_policies/api';

export const useLegacyAgentPolicy = (agentPolicyId: string | null) => {
  const { data } = useQuery<AgentPolicyInfo | null>({
    queryKey: ['legacyAgentPolicy', agentPolicyId],
    queryFn: () => {
      return agentPolicyId ? fetchLegacyAgentPolicy(agentPolicyId) : null;
    },
    refetchOnWindowFocus: false,
    enabled: !!agentPolicyId,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  return {
    data,
    loading: false,
  };
};
