/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { useLoadActionTypes } from '@kbn/elastic-assistant/impl/connectorland/use_load_action_types';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import { ConnectorsMissingPrivilegesCallOut } from './missing_privileges';
import type { AIConnector } from './types';
import { ConnectorSetup } from './connector_setup';
import { ConnectorSelectorPanel } from './connector_selector_panel';
import { AIActionTypeIds } from './constants';

interface ConnectorCardsProps {
  onNewConnectorSaved: (connectorId: string) => void;
  canCreateConnectors?: boolean;
  connectors?: AIConnector[]; // make connectors optional to handle loading state
  selectedConnectorId?: string;
  onConnectorSelected: (connector: AIConnector) => void;
}

export const ConnectorCards = React.memo<ConnectorCardsProps>(
  ({
    connectors,
    onNewConnectorSaved,
    canCreateConnectors,
    selectedConnectorId,
    onConnectorSelected,
  }) => {
    const { http, notifications } = useKibana().services;
    const { data } = useLoadActionTypes({ http, toasts: notifications.toasts });
    const actionTypes = useMemo(
      () => data?.filter(({ id }) => AIActionTypeIds.includes(id)),
      [data]
    );

    const onNewConnectorStoredSave = useCallback(
      (newConnector: AIConnector) => {
        onNewConnectorSaved(newConnector.id);
        // default select the new connector created
        onConnectorSelected(newConnector);
      },
      [onConnectorSelected, onNewConnectorSaved]
    );

    if (!connectors || !actionTypes) {
      return <EuiLoadingSpinner />;
    }

    const hasConnectors = connectors.length > 0;

    // show callout when user is missing actions.save privilege
    if (!hasConnectors && !canCreateConnectors) {
      return <ConnectorsMissingPrivilegesCallOut level="all" />;
    }

    return (
      <>
        <EuiFlexGroup
          css={css`
            height: 160px;
          `}
        >
          {hasConnectors && (
            <EuiFlexItem>
              <ConnectorSelectorPanel
                selectedConnectorId={selectedConnectorId}
                connectors={connectors}
                onConnectorSelected={onConnectorSelected}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <ConnectorSetup actionTypes={actionTypes} onConnectorSaved={onNewConnectorStoredSave} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);
ConnectorCards.displayName = 'ConnectorCards';
