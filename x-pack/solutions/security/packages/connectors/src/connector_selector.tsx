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
  EuiSuperSelectProps,
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

const popoverProps: EuiSuperSelectProps['popoverProps'] = {
  panelMinWidth: 400,
  anchorPosition: 'downRight',
};

export interface ConnectorSelectorProps
  extends Partial<Pick<EuiSuperSelectProps<string>, 'isLoading' | 'isInvalid'>> {
  connectors: ConnectorDetails[];
  onChange: (connectorId: string) => void;
  selectedId?: string;
  onNewConnectorClicked?: () => void;
  isDisabled?: boolean;
  mode?: 'combobox' | 'default';
}

export const ConnectorSelector = React.memo<ConnectorSelectorProps>(
  ({
    connectors,
    onChange,
    selectedId,
    onNewConnectorClicked,
    isDisabled,
    mode = 'default',
    isLoading,
    isInvalid,
  }) => {
    const styles = useConnectorSelectorStyles(mode);
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
              <div css={styles?.offset} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    }, [isDisabled, styles?.offset]);

    const connectorExists = useMemo(
      () => some(connectors, ['id', selectedId]),
      [connectors, selectedId]
    );

    const mappedConnectorOptions = connectors.map((connector) => ({
      value: connector.id,
      'data-test-subj': `connector-option-${connector.name}`,
      inputDisplay: (
        <EuiText
          css={styles?.optionDisplay}
          size="s"
          color={mode === 'default' ? euiTheme.colors.primary : undefined}
        >
          {connector.name}
        </EuiText>
      ),
      dropdownDisplay: (
        <React.Fragment key={connector.id}>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
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
          <EuiSuperSelect
            aria-label={i18n.CONNECTOR_SELECTOR_TITLE}
            css={styles?.placeholder}
            compressed={true}
            data-test-subj="connector-selector"
            disabled={isDisabled}
            hasDividers={true}
            onChange={onChangeConnector}
            options={allConnectorOptions}
            valueOfSelected={selectedId}
            placeholder={i18n.CONNECTOR_SELECTOR_PLACEHOLDER}
            popoverProps={popoverProps}
            isLoading={isLoading}
            isInvalid={isInvalid}
          />
        )}
      </div>
    );
  }
);

ConnectorSelector.displayName = 'ConnectorSelector';
