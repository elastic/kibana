/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import React, { useMemo, useEffect, useCallback } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import {
  getActionTypeTitle,
  getGenAiConfig,
} from '@kbn/elastic-assistant/impl/connectorland/helpers';
import { css } from '@emotion/react';
import type { AIConnector } from './types';
import { useFilteredActionTypes } from './hooks/use_load_action_types';
import * as i18n from './translations';

interface Props {
  isDisabled?: boolean;
  selectedConnectorId?: string | null;
  connectors: AIConnector[];
  onConnectorSelected: (connector: AIConnector) => void;
}

/**
 * A compact wrapper of the ConnectorSelector with a Selected Icon
 */
export const ConnectorSelectorWithIcon = React.memo<Props>(
  ({ isDisabled = false, selectedConnectorId, connectors, onConnectorSelected }) => {
    const { actionTypeRegistry, assistantAvailability } = useAssistantContext();

    const actionTypes = useFilteredActionTypes();

    const selectedConnector = useMemo(
      () => connectors.find((connector) => connector.id === selectedConnectorId),
      [connectors, selectedConnectorId]
    );

    useEffect(() => {
      if (connectors.length === 1) {
        onConnectorSelected(connectors[0]);
      }
    }, [connectors, onConnectorSelected]);

    const localIsDisabled = isDisabled || !assistantAvailability.hasConnectorsReadPrivilege;

    const connectorOptions = useMemo(
      () =>
        (connectors ?? []).map((connector) => {
          const connectorTypeTitle =
            getGenAiConfig(connector)?.apiProvider ??
            getActionTypeTitle(actionTypeRegistry.get(connector.actionTypeId));
          const connectorDetails = connector.isPreconfigured
            ? i18n.PRECONFIGURED_CONNECTOR
            : connectorTypeTitle;

          return {
            id: connector.id,
            name: connector.name,
            description: connectorDetails,
          };
        }),
      [actionTypeRegistry, connectors]
    );

    const onConnectorSelectionChange = useCallback(
      (connectorId: string) => {
        const connector = (connectors ?? []).find((c) => c.id === connectorId);
        if (connector) {
          onConnectorSelected(connector);
        }
      },
      [connectors, onConnectorSelected]
    );

    if (!actionTypes) {
      return <EuiLoadingSpinner />;
    }

    return (
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
        {selectedConnectorId && (
          <EuiFlexItem grow={false}>
            <ConnectorSelector
              connectors={connectorOptions}
              isDisabled={localIsDisabled}
              selectedId={selectedConnectorId}
              onChange={onConnectorSelectionChange}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

ConnectorSelectorWithIcon.displayName = 'ConnectorSelectorWithIcon';
