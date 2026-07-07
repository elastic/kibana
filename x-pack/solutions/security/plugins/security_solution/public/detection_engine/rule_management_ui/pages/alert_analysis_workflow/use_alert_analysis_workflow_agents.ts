/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../common/lib/kibana';

const ALERT_ANALYSIS_WORKFLOW_AGENTS_QUERY_KEY = [
  'alertAnalysisWorkflow',
  'alertAnalysisWorkflowAgents',
] as const;

export interface AlertAnalysisWorkflowAgentOption {
  id: string;
  name: string;
}

/**
 * Lists the Agent Builder agents selectable as the alert analysis workflow agent. Only the default
 * agent and user-created (custom) agents are returned; platform built-in agents (`readonly`) are
 * excluded because they are not meant to be picked here.
 */
export const useAlertAnalysisWorkflowAgents = (
  enabled: boolean
): { agents: AlertAnalysisWorkflowAgentOption[]; isLoading: boolean } => {
  const {
    services: { agentBuilder },
  } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: ALERT_ANALYSIS_WORKFLOW_AGENTS_QUERY_KEY,
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
      isLoading,
    }),
    [data, isLoading]
  );
};
