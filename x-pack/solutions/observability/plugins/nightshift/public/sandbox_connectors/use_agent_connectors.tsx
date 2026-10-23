/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { AgentWithPermissions } from '@kbn/agent-builder-browser';
import { AgentBuilderConnectorFeatureId } from '@kbn/actions-plugin/common';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';
import { useRefreshSandboxConnectors } from './use_fetch_sandbox_connectors';
import { ConnectorLibraryFlyout } from './connector_library_flyout';

const INVESTIGATION_AGENT_QUERY_KEY = ['nightshift.investigationAgent'] as const;

export const noAgentPermissionReason = i18n.translate(
  'xpack.nightshift.agentConnectors.noPermission',
  { defaultMessage: 'You need permission to edit the investigation agent.' }
);

interface ConnectorRef {
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
  isUpdating: boolean;
  assign: (connector: ConnectorRef) => void;
  unassign: (connector: ConnectorRef) => void;
  openLibrary: () => void;
  openCreate: () => void;
  flyouts: React.ReactNode;
} {
  const { agentBuilder, application, notifications, triggersActionsUi } = useKibana().services;
  const agents = agentBuilder?.agents;
  const queryClient = useQueryClient();
  const refresh = useRefreshSandboxConnectors();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // The agent exists once Nightshift is enabled in the space, the first onboarding step.
  const agent = useQuery<AgentWithPermissions, Error>({
    queryKey: INVESTIGATION_AGENT_QUERY_KEY,
    enabled: agents != null,
    queryFn: () => {
      if (!agents) throw new Error('Agent Builder is unavailable');
      return agents.get(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
    },
    retry: (failureCount, err) => !isHttpClientError(err) && failureCount < 3,
  });

  const assignedIds = useMemo(() => agent.data?.configuration.connector_ids ?? [], [agent.data]);
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

  const createFlyout = useMemo(
    () =>
      isCreating && triggersActionsUi
        ? triggersActionsUi.getAddConnectorFlyout({
            onClose: () => {
              setIsCreating(false);
              refresh();
            },
            onConnectorCreated: assign,
            featureId: AgentBuilderConnectorFeatureId,
          })
        : null,
    [assign, isCreating, refresh, triggersActionsUi]
  );

  return {
    assignedIds,
    isLoading: agents != null && agent.isLoading,
    error: agent.error ?? null,
    refetch: () => void agent.refetch(),
    canEditAgent,
    hasConnectorsAllPrivileges,
    isUpdating: update.isLoading,
    assign,
    unassign,
    openLibrary: () => setIsLibraryOpen(true),
    openCreate: () => setIsCreating(true),
    flyouts: (
      <>
        {isLibraryOpen && <ConnectorLibraryFlyout onClose={() => setIsLibraryOpen(false)} />}
        {createFlyout}
      </>
    ),
  };
}
