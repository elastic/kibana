/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import type {
  ActionConnector,
  ActionType,
  ActionTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';

import { euiThemeVars } from '@kbn/ui-theme';
import { some } from 'lodash';
import { AddConnectorModal } from '@kbn/elastic-assistant/impl/connectorland/add_connector_modal';
import * as i18n from './translations';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';

const placeholderCss = css`
  .euiSuperSelectControl__placeholder {
    color: ${euiThemeVars.euiColorPrimary};
    margin-right: ${euiThemeVars.euiSizeXS};
  }
`;

interface ConnectorSelectorOption {
  value: string;
  'data-test-subj': string;
  inputDisplay: React.JSX.Element;
  dropdownDisplay: React.JSX.Element;
}
export interface ConnectorSelectorProps {
  isDisabled?: boolean;
  isOpen?: boolean;
  onConnectorSelectionChange: (connectorId: string) => void;
  onConnectorSaved?: () => void;
  selectedConnectorId?: string;
  setIsOpen?: (isOpen: boolean) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  actionTypes: ActionType[];
  onRefetchConnectors: () => void;
  connectorOptions: ConnectorSelectorOption[];
}

export const ConnectorSelector = React.memo<ConnectorSelectorProps>(
  ({
    isDisabled = false,
    isOpen = false,
    selectedConnectorId,
    onConnectorSelectionChange,
    setIsOpen,
    actionTypeRegistry,
    actionTypes,
    onConnectorSaved,
    onRefetchConnectors,
    connectorOptions,
  }) => {
    const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
    const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

    const localIsDisabled = isDisabled;

    const addNewConnectorOption = useMemo(() => {
      return {
        value: ADD_NEW_CONNECTOR,
        inputDisplay: i18n.ADD_NEW_CONNECTOR,
        dropdownDisplay: (
          <EuiFlexGroup gutterSize="none" key={ADD_NEW_CONNECTOR}>
            <EuiFlexItem grow={true}>
              <EuiButtonEmpty
                data-test-subj="addNewConnectorButton"
                href="#"
                isDisabled={localIsDisabled}
                iconType="plus"
                size="xs"
              >
                {i18n.ADD_NEW_CONNECTOR}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* Right offset to compensate for 'selected' icon of EuiSuperSelect since native footers aren't supported*/}
              <div style={{ width: '24px' }} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    }, [localIsDisabled]);

    const connectorExists = useMemo(
      () => some(connectorOptions, ['value', selectedConnectorId]),
      [connectorOptions, selectedConnectorId]
    );

    // Only include add new connector option if user has privilege
    const allConnectorOptions = useMemo(
      () =>
        onConnectorSaved ? [...connectorOptions, addNewConnectorOption] : [...connectorOptions],
      [onConnectorSaved, connectorOptions, addNewConnectorOption]
    );

    const cleanupAndCloseModal = useCallback(() => {
      setIsOpen?.(false);
      setIsConnectorModalVisible(false);
      setSelectedActionType(null);
    }, [setIsOpen]);

    const [modalForceOpen, setModalForceOpen] = useState(isOpen);

    const onChangeConnector = useCallback(
      (connectorId: string) => {
        if (connectorId === ADD_NEW_CONNECTOR) {
          setModalForceOpen(false);
          setIsConnectorModalVisible(true);
          return;
        }
        onConnectorSelectionChange(connectorId);
      },
      [onConnectorSelectionChange]
    );

    const onSaveConnector = useCallback(
      (connector: ActionConnector) => {
        onConnectorSelectionChange(connector.id);
        onRefetchConnectors?.();
        onConnectorSaved?.();
        cleanupAndCloseModal();
      },
      [cleanupAndCloseModal, onConnectorSelectionChange, onRefetchConnectors, onConnectorSaved]
    );

    return (
      <>
        {!connectorExists && !connectorOptions.length ? (
          <EuiButtonEmpty
            data-test-subj="addNewConnectorButton"
            iconType="plusInCircle"
            isDisabled={localIsDisabled}
            size="xs"
            onClick={() => setIsConnectorModalVisible(true)}
          >
            {i18n.ADD_CONNECTOR}
          </EuiButtonEmpty>
        ) : (
          <EuiSuperSelect
            aria-label={i18n.CONNECTOR_SELECTOR_TITLE}
            className={placeholderCss}
            compressed={true}
            data-test-subj="connector-selector"
            disabled={localIsDisabled}
            hasDividers={true}
            isOpen={modalForceOpen}
            onChange={onChangeConnector}
            options={allConnectorOptions}
            valueOfSelected={selectedConnectorId}
            placeholder={i18n.CONNECTOR_SELECTOR_PLACEHOLDER}
            popoverProps={{ panelMinWidth: 400, anchorPosition: 'downRight' }}
          />
        )}
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
      </>
    );
  }
);

ConnectorSelector.displayName = 'ConnectorSelector';
