/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor, EuiSuperSelectProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiInputPopover,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { some } from 'lodash';
import * as i18n from './translations';
import { useConnectorSelectorStyles } from './connector_selector.styles';
import { ConnectorSelectable, ConnectorSelectableComponentProps } from '@kbn/ai-assistant-connector-selector-action';
import type { ActionConnector as AiConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { SettingsStart } from '@kbn/core/packages/ui-settings/browser';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
} from '@kbn/management-settings-ids';

export interface ConnectorSelectorProps
  extends Partial<Pick<EuiSuperSelectProps<string>, 'isLoading' | 'isInvalid'>> {
  connectors: AiConnector[];
  onChange: (connectorId: string) => void;
  selectedId?: string;
  onNewConnectorClicked?: () => void;
  isDisabled?: boolean;
  mode?: 'combobox' | 'default';
  settings: SettingsStart
}

export const ConnectorSelector = React.memo<ConnectorSelectorProps>(
  ({
    connectors,
    onChange,
    selectedId,
    onNewConnectorClicked,
    isDisabled,
    mode = 'default',
    settings
  }) => {
    const styles = useConnectorSelectorStyles(mode);
    const [modalOpen, setModalOpen] = useState(false);

    const connectorExists = useMemo(
      () => some(connectors, ['id', selectedId]),
      [connectors, selectedId]
    );

    const onChangeConnector = useCallback(
      (connectorId: string) => {
        onChange(connectorId);
        setModalOpen(false);
      },
      [onChange, onNewConnectorClicked]
    );

    const defaultConnectorId = settings.client.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);

    const { customConnectors, preConfiguredConnectors } = useMemo(() => (connectors ?? []).reduce<{
      customConnectors: ConnectorSelectableComponentProps['customConnectors']
      preConfiguredConnectors: ConnectorSelectableComponentProps['preConfiguredConnectors']
    }>((acc, connector) => {
      if (connector.isPreconfigured) {
        acc.preConfiguredConnectors.push({
          label: connector.name,
          value: connector.id,
        })
      } else {
        acc.customConnectors.push({
          label: connector.name,
          value: connector.id,
        })
      }
      return acc
    }, {
      customConnectors: [],
      preConfiguredConnectors: [],
    }), [connectors])

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        width: "100%",
        content: <ConnectorSelectable
          preConfiguredConnectors={preConfiguredConnectors}
          customConnectors={customConnectors}
          value={selectedId}
          onValueChange={(connectorId) => onChangeConnector(connectorId)}
          onAddConnectorClick={onNewConnectorClicked}
          defaultConnectorId={defaultConnectorId}
        />,
      },
    ];

    const defaultAIConnectorId = ""
    const selectedOrDefaultConnectorId = selectedId ?? defaultAIConnectorId
    const selectedOrDefaultConnector = connectors?.find((connector) => connector.id === selectedOrDefaultConnectorId)
    const buttonLabel = selectedOrDefaultConnector?.name ?? i18n.CONNECTOR_SELECTOR_PLACEHOLDER

    return (
      <div css={styles?.inputContainer}>
        {!connectorExists && !connectors.length && onNewConnectorClicked ? (
          <EuiButtonEmpty
            data-test-subj="addNewConnectorButton"
            iconType="plusInCircle"
            isDisabled={isDisabled}
            size="xs"
            onClick={onNewConnectorClicked}
          >
            {i18n.ADD_CONNECTOR}
          </EuiButtonEmpty>
        ) : (
          <EuiInputPopover
            input={
              <EuiButton iconType="arrowDown" iconSide="right" size="s" color="text" onClick={() => setModalOpen(true)} contentProps={{
                style: {
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }
              }}
              data-test-subj='connector-selector'
              isDisabled={isDisabled}
              >
                {buttonLabel}
              </EuiButton>
            }
            isOpen={modalOpen}
            closePopover={() => setModalOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downCenter"
            panelMinWidth={300}
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiInputPopover>
        )}
      </div>
    );
  }
);

ConnectorSelector.displayName = 'ConnectorSelector';
