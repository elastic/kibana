/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { AgentWithPermissions } from '@kbn/agent-builder-browser';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import { getHttpErrorStatus, isHttpClientError, isHttpNotFoundError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';

export const INVESTIGATION_AGENT_QUERY_KEY = ['nightshift.investigationAgent'] as const;

/** Agent Builder 404s missing agents and 400s when the profile exists but is unavailable. */
const isMissingInvestigationAgent = (error: unknown): boolean => {
  if (isHttpNotFoundError(error)) return true;
  if (getHttpErrorStatus(error) !== 400) return false;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('is not available');
};

export const noAgentPermissionReason = i18n.translate(
  'xpack.nightshift.agentConnectors.noPermission',
  { defaultMessage: 'You need permission to edit the investigation agent.' }
);

export interface ConnectorRef {
  id: string;
  name: string;
}

/**
 * The connectors assigned to the investigation agent
 */
export function useAgentConnectors(): {
  assignedIds: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  canEditAgent: boolean;
  hasConnectorsAllPrivileges: boolean;
  updatingId: string | undefined;
  assign: (connector: ConnectorRef) => void;
  unassign: (connector: ConnectorRef) => void;
} {
  const { agentBuilder, application, notifications } = useKibana().services;
  const agents = agentBuilder?.agents;
  const queryClient = useQueryClient();

  // The agent exists once Nightshift is enabled in the space, the first onboarding step.
  // Before that (or after disable), Agent Builder 404s — treat as "no agent yet", not a load failure.
  const agent = useQuery<AgentWithPermissions | null, Error>({
    queryKey: INVESTIGATION_AGENT_QUERY_KEY,
    enabled: agents != null,
    queryFn: async () => {
      if (!agents) throw new Error('Agent Builder is unavailable');
      try {
        return await agents.get(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
      } catch (error) {
        if (isMissingInvestigationAgent(error)) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, err) => !isHttpClientError(err) && failureCount < 3,
  });

  const assignedIds = useMemo(
    () => agent.data?.configuration.connector_ids ?? [],
    [agent.data]
  );
  const { actions } = application.capabilities;
  const canEditAgent =
    (agent.data?.permissions?.update_agent ?? false) &&
    application.capabilities.agentBuilder?.manageAgents === true;
  const hasConnectorsAllPrivileges =
    actions?.show === true &&
    actions?.execute === true &&
    actions?.delete === true &&
    actions?.save === true;

  const update = useMutation<unknown, Error, { connector: ConnectorRef; add: boolean }>({
    mutationFn: ({ connector, add }) => {
      if (!agents) throw new Error('Agent Builder is unavailable');
      const params = { agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID, connectorId: connector.id };
      return add ? agents.addConnectorToAgent(params) : agents.removeConnectorFromAgent(params);
    },
    onSuccess: (_result, { connector, add }) => {
      notifications.toasts.addSuccess({
        title: add
          ? i18n.translate('xpack.nightshift.agentConnectors.assignedToast', {
              defaultMessage: '{name} added',
              values: { name: connector.name },
            })
          : i18n.translate('xpack.nightshift.agentConnectors.unassignedToast', {
              defaultMessage: '{name} removed',
              values: { name: connector.name },
            }),
      });
    },
    onError: (err) => {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.nightshift.agentConnectors.updateError', {
          defaultMessage: 'Could not update the investigation agent',
        }),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: INVESTIGATION_AGENT_QUERY_KEY });
    },
  });
  const { mutate } = update;
  const assign = useCallback(
    (connector: ConnectorRef) => mutate({ connector, add: true }),
    [mutate]
  );
  const unassign = useCallback(
    (connector: ConnectorRef) => mutate({ connector, add: false }),
    [mutate]
  );

  return {
    assignedIds,
    isLoading: agents != null && agent.isLoading,
    error: agent.error ?? null,
    refetch: () => void agent.refetch(),
    canEditAgent,
    hasConnectorsAllPrivileges,
    updatingId: update.isLoading ? update.variables?.connector.id : undefined,
    assign,
    unassign,
  };
}
