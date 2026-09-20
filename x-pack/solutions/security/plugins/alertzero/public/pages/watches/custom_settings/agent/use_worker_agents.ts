/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';

const WORKER_AGENTS_QUERY_KEY = ['alertZero', 'workerAgents'] as const;

export interface WorkerAgentOption {
  id: string;
  name: string;
}

/**
 * Lists the Agent Builder agents selectable as a Worker's agent. Only the default agent and
 * user-created (custom) agents are returned; platform built-in agents (`readonly`) are excluded
 * because they are not meant to be picked here.
 *
 * Worker-agnostic: the set of selectable agents does not depend on which Worker is asking, so
 * every Watch team's agent control shares this one query and its cache.
 */
export const useWorkerAgents = (
  enabled: boolean
): { agents: WorkerAgentOption[]; isLoading: boolean } => {
  const {
    services: { agentBuilder },
  } = useKibana<{ agentBuilder?: AgentBuilderPluginStart }>();

  const { data, isLoading } = useQuery({
    queryKey: WORKER_AGENTS_QUERY_KEY,
    enabled: enabled && Boolean(agentBuilder),
    queryFn: async () => {
      const allAgents = (await agentBuilder?.agents.list()) ?? [];
      return allAgents
        .filter((agent) => !agent.readonly)
        .map((agent) => ({ id: agent.id, name: agent.name }));
    },
  });

  return useMemo(
    () => ({
      agents: data ?? [],
      // react-query v4 keeps `isLoading` true for a disabled query, which would otherwise leave the
      // agent selector spinning forever when Agent Builder is unavailable. Gate it on the same
      // condition as the query's `enabled`.
      isLoading: isLoading && enabled && Boolean(agentBuilder),
    }),
    [data, isLoading, enabled, agentBuilder]
  );
};
