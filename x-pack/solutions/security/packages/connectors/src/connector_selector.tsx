/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';

import { euiThemeVars } from '@kbn/ui-theme';
import { some } from 'lodash';
import * as i18n from './translations';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';

const placeholderCss = css`
  .euiSuperSelectControl__placeholder {
    color: ${euiThemeVars.euiColorPrimary};
    margin-right: ${euiThemeVars.euiSizeXS};
  }
`;

export interface ConnectorDetails {
  id: string;
  name: string;
  description: string;
}

export interface ConnectorSelectorProps {
  connectors: ConnectorDetails[];
  onChange: (connectorId: string) => void;
  selectedId?: string;
  onNewConnectorClicked?: () => void;
  isDisabled?: boolean;
}

export const ConnectorSelector = React.memo<ConnectorSelectorProps>(
  ({ connectors, onChange, selectedId, onNewConnectorClicked, isDisabled }) => {
    const { euiTheme } = useEuiTheme();

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
      () => some(connectors, ['id', selectedId]),
      [connectors, selectedId]
    );

    const connectorOptionMapped = connectors.map((connector) => ({
      value: connector.id,
      'data-test-subj': connector.id,
      inputDisplay: (
        <EuiText
          css={css`
            margin-right: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
          size="s"
          color={euiTheme.colors.primary}
        >
          {connector.name}
        </EuiText>
      ),
      dropdownDisplay: (
        <React.Fragment key={connector.id}>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false} data-test-subj={`connector-${connector.name}`}>
              <strong>{connector.name}</strong>
              <EuiText size="xs" color="subdued">
                <p>{connector.description}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </React.Fragment>
      ),
    }));

    const allConnectorOptions = useMemo(
      () =>
        onNewConnectorClicked
          ? [...connectorOptionMapped, addNewConnectorOption]
          : [...connectorOptionMapped],
      [onNewConnectorClicked, connectorOptionMapped, addNewConnectorOption]
    );

    const onChangeConnector = useCallback(
      (connectorId: string) => {
        if (connectorId === ADD_NEW_CONNECTOR) {
          onNewConnectorClicked?.();
          return;
        }
        onChange(connectorId);
      },
      [onChange, onNewConnectorClicked]
    );

    return (
      <>
        {!connectorExists && !connectors.length ? (
          <EuiButtonEmpty
            data-test-subj="addNewConnectorButton"
            iconType="plusInCircle"
            isDisabled={localIsDisabled}
            size="xs"
            onClick={() => onNewConnectorClicked?.()}
          >
            {i18n.ADD_CONNECTOR}
          </EuiButtonEmpty>
        ) : (
          <EuiSuperSelect
            aria-label={i18n.CONNECTOR_SELECTOR_TITLE}
            css={placeholderCss}
            compressed={true}
            data-test-subj="connector-selector"
            disabled={localIsDisabled}
            hasDividers={true}
            // isOpen={modalForceOpen}
            onChange={onChangeConnector}
            options={allConnectorOptions}
            valueOfSelected={selectedId}
            placeholder={i18n.CONNECTOR_SELECTOR_PLACEHOLDER}
            popoverProps={{ panelMinWidth: 400, anchorPosition: 'downRight' }}
          />
        )}
        {/* {isConnectorModalVisible && (
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
        )} */}
      </>
    );
  }
);

ConnectorSelector.displayName = 'ConnectorSelector';
