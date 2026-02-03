/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

export const useAgentCount = () => {
  const {
    services: { agentBuilder },
  } = useKibana();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fetchAgentCount'],
    queryFn: async () => {
      const [agents, tools] = await Promise.all([
        agentBuilder?.agents.list(),
        agentBuilder?.tools.list(),
      ]);
      return {
        agents: agents?.length ?? 0,
        tools: tools?.length ?? 0,
      };
    },
  });

  return { tools: data?.tools ?? 0, agents: data?.agents ?? 0, isLoading, isError };
};
