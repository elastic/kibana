/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import {
  getActionTypeTitle,
  getGenAiConfig,
} from '@kbn/elastic-assistant/impl/connectorland/helpers';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import type { AIConnector } from './types';
import * as i18n from './translations';

interface ConnectorSelectorPanelProps {
  connectors: AIConnector[];
  selectedConnectorId?: string;
  onConnectorSelected: (connector: AIConnector) => void;
}

export const ConnectorSelectorPanel = React.memo<ConnectorSelectorPanelProps>(
  ({ connectors, selectedConnectorId, onConnectorSelected }) => {
    const { actionTypeRegistry } = useKibana().services.triggersActionsUi;

    const selectedConnector = useMemo(
      () => connectors.find((connector) => connector.id === selectedConnectorId),
      [connectors, selectedConnectorId]
    );

    useEffect(() => {
      if (connectors.length === 1) {
        onConnectorSelected(connectors[0]);
      }
    }, [connectors, onConnectorSelected]);

    const connectorOptions = useMemo(
      () =>
        connectors.map((connector) => {
          let description: string;
          if (connector.isPreconfigured) {
            description = i18n.PRECONFIGURED_CONNECTOR;
          } else {
            description =
              getGenAiConfig(connector)?.apiProvider ??
              getActionTypeTitle(actionTypeRegistry.get(connector.actionTypeId));
          }
          return { id: connector.id, name: connector.name, description };
        }),
      [actionTypeRegistry, connectors]
    );

    const onConnectorSelectionChange = useCallback(
      (connectorId: string) => {
        const connector = connectors.find((c) => c.id === connectorId);
        if (connector) {
          onConnectorSelected(connector);
        }
      },
      [connectors, onConnectorSelected]
    );

    return (
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup
          css={css`
            height: 100%;
          `}
          alignItems="center"
          justifyContent="center"
          direction="column"
          gutterSize="s"
        >
          <EuiFlexItem grow={false} justifyContent="center">
            <EuiText>{i18n.SELECTED_PROVIDER}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem justifyContent="center">
            <EuiFlexGroup
              alignItems="center"
              css={css`
                height: 32px;
              `}
              direction="column"
              justifyContent="center"
              responsive={false}
              gutterSize="xs"
            >
              {selectedConnector && (
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    size="xxl"
                    color="text"
                    type={actionTypeRegistry.get(selectedConnector.actionTypeId).iconClass}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <ConnectorSelector
                  connectors={connectorOptions}
                  selectedId={selectedConnectorId}
                  onChange={onConnectorSelectionChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
ConnectorSelectorPanel.displayName = 'ConnectorSelectorPanel';
