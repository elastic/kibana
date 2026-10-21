/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ConnectorTypeCard,
  getConnectorTypeCardItem,
} from '@kbn/alerts-ui-shared/src/connector_type_card';
import { useKibana } from '../hooks/use_kibana';
import { useFetchSandboxConnectorTypes } from './use_fetch_sandbox_connector_types';
import { useRefreshSandboxConnectors } from './use_fetch_sandbox_connectors';
import { SandboxConnectorsError } from './sandbox_connectors_error';

const noPermissionReason = i18n.translate('xpack.nightshift.connectSources.noPermission', {
  defaultMessage: 'You need permission to create connectors.',
});

const typesLoadErrorTitle = i18n.translate('xpack.nightshift.connectSources.loadError', {
  defaultMessage: 'Could not load the connector types.',
});

export function ConnectSourcesGrid({
  onConnected,
}: {
  onConnected?: () => void;
}): React.ReactElement | null {
  const { application, triggersActionsUi } = useKibana().services;
  const { data: types, isLoading, error, refetch } = useFetchSandboxConnectorTypes();
  const refresh = useRefreshSandboxConnectors();
  const [connectingTypeId, setConnectingTypeId] = useState<string | undefined>();

  const flyout = useMemo(() => {
    if (!connectingTypeId || !triggersActionsUi) return null;
    return triggersActionsUi.getAddConnectorFlyout({
      initialConnector: { actionTypeId: connectingTypeId },
      onClose: () => setConnectingTypeId(undefined),
      onConnectorCreated: () => {
        refresh();
        onConnected?.();
      },
    });
  }, [connectingTypeId, onConnected, refresh, triggersActionsUi]);

  if (isLoading) return <EuiLoadingSpinner size="m" />;
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
  const canConnect = application.capabilities.actions?.save === true;

  return (
    <>
      <EuiFlexGrid
        columns={2}
        gutterSize="m"
        role="list"
        aria-label={i18n.translate('xpack.nightshift.connectSources.gridLabel', {
          defaultMessage: 'Connector types the investigation agent can use',
        })}
        data-test-subj="nightshiftConnectSourcesGrid"
      >
        {types.map((actionType) => (
          <EuiFlexItem key={actionType.id}>
            <ConnectorTypeCard
              item={getConnectorTypeCardItem({
                actionType,
                actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
              })}
              disabledReason={canConnect ? undefined : noPermissionReason}
              size="s"
              onClick={() => setConnectingTypeId(actionType.id)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      {flyout}
    </>
  );
}
