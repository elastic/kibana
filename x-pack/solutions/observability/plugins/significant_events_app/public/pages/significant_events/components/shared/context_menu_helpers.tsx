/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { InferenceConnector } from '@kbn/inference-common';
import React from 'react';
import { ConnectorIcon } from '../../../../components/connector_icon';
import { ConnectorSubPanel } from './connector_sub_panel';
import {
  MISSING_DEFAULT_MODEL_LABEL,
  MISSING_SELECTED_MODEL_LABEL,
  MODEL_SELECTION_PANEL_TITLE,
  SELECT_MODEL_LABEL,
} from './translations';

export function buildConnectorSelectionPanel({
  connectors,
  resolvedConnectorId,
  selectedConnectorId,
  defaultConnectorOnly,
  onSelect,
}: {
  connectors: InferenceConnector[];
  resolvedConnectorId: string | undefined;
  selectedConnectorId: string | undefined;
  defaultConnectorOnly: boolean;
  onSelect: (connectorId: string) => void;
}) {
  return {
    title: MODEL_SELECTION_PANEL_TITLE,
    width: 300,
    content: (
      <ConnectorSubPanel
        connectors={connectors}
        resolvedConnectorId={resolvedConnectorId}
        selectedConnectorId={selectedConnectorId}
        defaultConnectorOnly={defaultConnectorOnly}
        onSelect={onSelect}
      />
    ),
  };
}

export function buildConnectorMenuItem({
  connector,
  selectedConnectorId,
  resolvedConnectorId,
  panelId,
}: {
  connector: InferenceConnector | undefined;
  selectedConnectorId: string | undefined;
  resolvedConnectorId: string | undefined;
  panelId: number;
}): { name: React.ReactNode; panel: number } {
  const connectorName =
    connector?.name ??
    (selectedConnectorId === undefined
      ? SELECT_MODEL_LABEL
      : selectedConnectorId === resolvedConnectorId
      ? MISSING_DEFAULT_MODEL_LABEL
      : MISSING_SELECTED_MODEL_LABEL);

  return {
    name: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <ConnectorIcon connectorName={connector?.name} />
        </EuiFlexItem>
        <EuiFlexItem className="eui-textTruncate" css={{ minWidth: 0 }}>
          {connectorName}
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    panel: panelId,
  };
}
