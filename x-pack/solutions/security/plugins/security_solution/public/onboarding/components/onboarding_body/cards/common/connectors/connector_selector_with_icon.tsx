/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import {
  getActionTypeTitle,
  getGenAiConfig,
} from '@kbn/elastic-assistant/impl/connectorland/helpers';
import type { AIConnector } from './types';
import { useFilteredActionTypes } from './hooks/use_load_action_types';
import * as i18n from './translations';
import { useConnectorSelectorWithIconStyles } from './connector_selector_with_icon.styles';

interface Props {
  isDisabled?: boolean;
  selectedConnectorId?: string;
  connectors: AIConnector[];
  onConnectorSaved?: () => void;
  onConnectorSelected: (connector: AIConnector) => void;
  onRefetchConnectors: () => void;
}

/**
 * A compact wrapper of the ConnectorSelector with a Selected Icon
 */
export const ConnectorSelectorWithIcon = React.memo<Props>(
  ({
    isDisabled = false,
    selectedConnectorId,
    connectors,
    onConnectorSaved,
    onConnectorSelected,
    onRefetchConnectors,
  }) => {
    const { actionTypeRegistry, http, assistantAvailability, toasts } = useAssistantContext();
    const { euiTheme } = useEuiTheme();
    const { inputContainerClassName, inputDisplayClassName } = useConnectorSelectorWithIconStyles();

    const actionTypes = useFilteredActionTypes(http, toasts);
    const [isOpen, setIsOpen] = useState(false);

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
    // const connectorOptions = useMemo(
    //   () =>
    //     (connectors ?? []).map((connector) => {
    //       const connectorTypeTitle =
    //         getGenAiConfig(connector)?.apiProvider ??
    //         getActionTypeTitle(actionTypeRegistry.get(connector.actionTypeId));
    //       const connectorDetails = connector.isPreconfigured
    //         ? i18n.PRECONFIGURED_CONNECTOR
    //         : connectorTypeTitle;

    //       return {
    //         value: connector.id,
    //         'data-test-subj': connector.id,
    //         inputDisplay: (
    //           <EuiText className={inputDisplayClassName} size="s" color={euiTheme.colors.primary}>
    //             {connector.name}
    //           </EuiText>
    //         ),
    //         dropdownDisplay: (
    //           <React.Fragment key={connector.id}>
    //             <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
    //               <EuiFlexItem grow={false} data-test-subj={`connector-${connector.name}`}>
    //                 <strong>{connector.name}</strong>
    //                 {connectorDetails && (
    //                   <EuiText size="xs" color="subdued">
    //                     <p>{connectorDetails}</p>
    //                   </EuiText>
    //                 )}
    //               </EuiFlexItem>
    //             </EuiFlexGroup>
    //           </React.Fragment>
    //         ),
    //       };
    //     }),
    //   [actionTypeRegistry, connectors, euiTheme.colors.primary, inputDisplayClassName]
    // );

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
        className={inputContainerClassName}
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
            isDisabled={localIsDisabled}
            selectedId={selectedConnectorId}
            onChange={onConnectorSelectionChange}
            onNewConnectorClicked={onRefetchConnectors}
          />
        </EuiFlexItem>
        {isConnectorModalVisible && (
          // Crashing management app otherwise
          <Suspense fallback>
            <AddConnectorModal
              actionTypeRegistry={actionTypeRegistry}
              actionTypes={actionTypes}
              onClose={() => setIsConnectorModalVisible(false)}
              onSaveConnector={onSaveConnector}
              onSelectActionType={(actionType: ActionType) => setSelectedActionType(actionType)}
              selectedActionType={selectedActionType}
            />
          </Suspense>
        )}
      </EuiFlexGroup>
    );
  }
);

ConnectorSelectorWithIcon.displayName = 'ConnectorSelectorWithIcon';
