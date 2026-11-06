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
import type { IToasts } from '@kbn/core/public';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../../common/http_error';
import { useKibana } from '../../hooks/use_kibana';

export const INVESTIGATION_AGENT_QUERY_KEY = ['nightshift.investigationAgent'] as const;

export const noAgentPermissionReason = i18n.translate(
  'xpack.nightshift.agentConnectors.noPermission',
  { defaultMessage: 'You need permission to edit the investigation agent.' }
);

export interface ConnectorRef {
  id: string;
  name: string;
}

/** Toast when assigning: `added` for an existing connector, `connected` after create-and-assign. */
export type AssignToast = 'added' | 'connected';

export interface AssignOptions {
  toast?: AssignToast;
}

/**
 * Drops the Actions UI "Created 'name'" toast so create-and-assign can show one "connected" toast.
 * Matches the title from triggers_actions_ui `useCreateConnector`.
 */
function dismissCreatedConnectorToast(toasts: IToasts, connectorName: string): void {
  const createdTitle = i18n.translate(
    'xpack.triggersActionsUI.sections.addConnectorForm.updateSuccessNotificationText',
    {
      defaultMessage: "Created ''{connectorName}''",
      values: { connectorName },
    }
  );
  let subscription: { unsubscribe: () => void } | undefined;
  subscription = toasts.get$().subscribe((list) => {
    subscription?.unsubscribe();
    const match = [...list].reverse().find((toast) => toast.title === createdTitle);
    if (match) {
      toasts.remove(match);
    }
  });
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
  assign: (connector: ConnectorRef, options?: AssignOptions) => void;
  unassign: (connector: ConnectorRef) => void;
} {
  const { agentBuilder, application, notifications } = useKibana().services;
  const agents = agentBuilder?.agents;
  const queryClient = useQueryClient();

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

  const update = useMutation<
    unknown,
    Error,
    { connector: ConnectorRef; add: boolean; toast?: AssignToast }
  >({
    mutationFn: ({ connector, add }) => {
      if (!agents) throw new Error('Agent Builder is unavailable');
      const params = { agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID, connectorId: connector.id };
      return add ? agents.addConnectorToAgent(params) : agents.removeConnectorFromAgent(params);
    },
    onSuccess: (_result, { connector, add, toast = 'added' }) => {
      if (add && toast === 'connected') {
        dismissCreatedConnectorToast(notifications.toasts, connector.name);
      }
      notifications.toasts.addSuccess({
        title: !add
          ? i18n.translate('xpack.nightshift.agentConnectors.unassignedToast', {
              defaultMessage: '{name} removed',
              values: { name: connector.name },
            })
          : toast === 'connected'
          ? i18n.translate('xpack.nightshift.agentConnectors.connectedToast', {
              defaultMessage: '{name} connected',
              values: { name: connector.name },
            })
          : i18n.translate('xpack.nightshift.agentConnectors.assignedToast', {
              defaultMessage: '{name} added',
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
    (connector: ConnectorRef, options?: AssignOptions) =>
      mutate({ connector, add: true, toast: options?.toast }),
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
