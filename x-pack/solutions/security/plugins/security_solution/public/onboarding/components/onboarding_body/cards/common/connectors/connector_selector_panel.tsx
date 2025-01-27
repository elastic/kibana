/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { ConnectorSelectorWithIcon } from './connector_selector_with_icon';
import * as i18n from './translations';
import type { AIConnector } from './types';

interface ConnectorSelectorPanelProps {
  connectors: AIConnector[];
  selectedConnectorId?: string | null;
  onConnectorSelected: (connector: AIConnector) => void;
}

export const ConnectorSelectorPanel = React.memo<ConnectorSelectorPanelProps>(
  ({ connectors, selectedConnectorId, onConnectorSelected }) => {
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
            <ConnectorSelectorWithIcon
              selectedConnectorId={selectedConnectorId}
              connectors={connectors}
              onConnectorSelected={onConnectorSelected}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

ConnectorSelectorPanel.displayName = 'ConnectorSelectorPanel';
