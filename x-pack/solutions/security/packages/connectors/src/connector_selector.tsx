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
import React, { useCallback, useMemo } from 'react';
import { some } from 'lodash';
import * as i18n from './translations';
import { useConnectorSelectorStyles } from './connector_selector.styles';
import { ADD_NEW_CONNECTOR } from './constants';

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
    const styles = useConnectorSelectorStyles();
    const { euiTheme } = useEuiTheme();

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
                isDisabled={isDisabled}
                iconType="plus"
                size="xs"
              >
                {i18n.ADD_NEW_CONNECTOR}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* Right offset to compensate for 'selected' icon of EuiSuperSelect since native footers aren't supported*/}
              <div css={styles.offset} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    }, [isDisabled, styles.offset]);

    const connectorExists = useMemo(
      () => some(connectors, ['id', selectedId]),
      [connectors, selectedId]
    );

    const mappedConnectorOptions = connectors.map((connector) => ({
      value: connector.id,
      'data-test-subj': connector.id,
      inputDisplay: (
        <EuiText css={styles.optionDisplay} size="s" color={euiTheme.colors.primary}>
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
          ? [...mappedConnectorOptions, addNewConnectorOption]
          : [...mappedConnectorOptions],
      [onNewConnectorClicked, mappedConnectorOptions, addNewConnectorOption]
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
      <div css={styles.inputContainer}>
        {!connectorExists && !connectors.length ? (
          <EuiButtonEmpty
            data-test-subj="addNewConnectorButton"
            iconType="plusInCircle"
            isDisabled={isDisabled}
            size="xs"
            onClick={() => onNewConnectorClicked?.()}
          >
            {i18n.ADD_CONNECTOR}
          </EuiButtonEmpty>
        ) : (
          <EuiSuperSelect
            aria-label={i18n.CONNECTOR_SELECTOR_TITLE}
            css={styles.placeholder}
            compressed={true}
            data-test-subj="connector-selector"
            disabled={isDisabled}
            hasDividers={true}
            onChange={onChangeConnector}
            options={allConnectorOptions}
            valueOfSelected={selectedId}
            placeholder={i18n.CONNECTOR_SELECTOR_PLACEHOLDER}
            popoverProps={{ panelMinWidth: 400, anchorPosition: 'downRight' }}
          />
        )}
      </div>
    );
  }
);

ConnectorSelector.displayName = 'ConnectorSelector';
