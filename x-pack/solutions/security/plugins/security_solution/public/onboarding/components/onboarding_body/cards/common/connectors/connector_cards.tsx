/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { ConnectorsMissingPrivilegesCallOut } from './missing_privileges';
import type { AIConnector } from './types';
import { ConnectorSetup } from './connector_setup';
import { ConnectorSelectorPanel } from './connector_selector_panel';

interface ConnectorCardsProps {
  onNewConnectorSaved: (connectorId: string) => void;
  canCreateConnectors?: boolean;
  connectors?: AIConnector[]; // make connectors optional to handle loading state
  selectedConnectorId?: string | null;
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
    const onNewConnectorStoredSave = useCallback(
      (newConnector: AIConnector) => {
        onNewConnectorSaved(newConnector.id);
        // default select the new connector created
        onConnectorSelected(newConnector);
      },
      [onConnectorSelected, onNewConnectorSaved]
    );

    if (!connectors) {
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
            <ConnectorSetup onConnectorSaved={onNewConnectorStoredSave} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);
ConnectorCards.displayName = 'ConnectorCards';
