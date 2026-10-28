/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { checkActionTypeEnabled } from '@kbn/alerts-ui-shared/src/check_action_type_enabled';
import { useKibana } from '../hooks/use_kibana';
import { useFetchSandboxConnectorTypes } from './use_fetch_sandbox_connector_types';
import { useRefreshSandboxConnectors } from './use_fetch_sandbox_connectors';
import { useAgentConnectors } from './use_agent_connectors';
import { SandboxConnectorsError } from './sandbox_connectors_error';
import { SourceCard } from './source_card';
import { getSourceCardItem } from './source_card_item';
import { sourceGridStyles } from './source_grid_styles';

const noPermissionReason = i18n.translate('xpack.nightshift.connectSources.noPermission', {
  defaultMessage: 'You need permission to create connectors and to edit the investigation agent.',
});

const typesLoadErrorTitle = i18n.translate('xpack.nightshift.connectSources.loadError', {
  defaultMessage: 'Could not load the connector types.',
});

const connectLabel = i18n.translate('xpack.nightshift.connectSources.connectButton', {
  defaultMessage: 'Connect',
});

export function ConnectSourcesGrid({
  onConnected,
}: {
  onConnected?: () => void;
}): React.ReactElement | null {
  const { application, triggersActionsUi } = useKibana().services;
  const { data: types, isLoading, error, refetch } = useFetchSandboxConnectorTypes();
  const agent = useAgentConnectors();
  const refresh = useRefreshSandboxConnectors();
  const [connectingTypeId, setConnectingTypeId] = useState<string | undefined>();

  const { assign } = agent;
  const flyout = useMemo(() => {
    if (!connectingTypeId || !triggersActionsUi) return null;
    return triggersActionsUi.getAddConnectorFlyout({
      initialConnector: { actionTypeId: connectingTypeId },
      onClose: () => setConnectingTypeId(undefined),
      onConnectorCreated: (connector) => {
        assign(connector);
        refresh();
        onConnected?.();
      },
    });
  }, [assign, connectingTypeId, onConnected, refresh, triggersActionsUi]);

  if (isLoading || agent.isLoading) return <EuiLoadingSpinner size="m" />;
  if (error) {
    return (
      <SandboxConnectorsError
        title={typesLoadErrorTitle}
        onRetry={() => refetch()}
        data-test-subj="nightshiftConnectSourcesError"
      />
    );
  }
  if (!types || types.length === 0 || !triggersActionsUi) return null;
  const canConnect = application.capabilities.actions?.save === true && agent.canEditAgent;
  const connectDisabledReason = canConnect ? undefined : noPermissionReason;

  return (
    <>
      <div
        css={sourceGridStyles}
        role="list"
        aria-label={i18n.translate('xpack.nightshift.connectSources.gridLabel', {
          defaultMessage: 'Connector types the investigation agent can use',
        })}
        data-test-subj="nightshiftConnectSourcesGrid"
      >
        {types.map((actionType) => {
          const item = getSourceCardItem({
            actionType,
            actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
          });
          const enabledCheck = checkActionTypeEnabled(actionType);
          const disabledReason =
            connectDisabledReason ?? (enabledCheck.isEnabled ? undefined : enabledCheck.message);
          return (
            <SourceCard
              key={actionType.id}
              icon={item.iconClass}
              title={item.name}
              description={item.description}
              data-test-subj={`${actionType.id}-card`}
              action={{
                label: connectLabel,
                icon: 'plugs',
                disabledReason,
                onClick: () => setConnectingTypeId(actionType.id),
                'data-test-subj': `${actionType.id}-connect`,
              }}
            />
          );
        })}
      </div>
      {flyout}
    </>
  );
}
