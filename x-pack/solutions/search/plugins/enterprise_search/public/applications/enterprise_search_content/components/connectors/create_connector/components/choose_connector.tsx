/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { css } from '@emotion/react';
import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiFlexItem,
  EuiIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiText,
  useEuiTheme,
  EuiTextTruncate,
  EuiBadgeGroup,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { EuiIconPlugs } from '@kbn/search-shared-ui';

import {
  BETA_LABEL,
  TECH_PREVIEW_LABEL,
  CONNECTOR_CLIENT_LABEL,
} from '../../../../../shared/constants';
import { KibanaLogic } from '../../../../../shared/kibana';
import { NewConnectorLogic } from '../../../new_index/method_connector/new_connector_logic';
import { SelfManagePreference } from '../create_connector';

interface ChooseConnectorSelectableProps {
  selfManaged: SelfManagePreference;
  disabled?: boolean;
}
interface OptionData {
  secondaryContent?: string;
}

export const ChooseConnector: React.FC<ChooseConnectorSelectableProps> = ({
  selfManaged,
  disabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedOption, setSelectedOption] = useState<Array<EuiComboBoxOptionOption<OptionData>>>(
    []
  );
  const renderOption = (
    option: EuiComboBoxOptionOption<OptionData>,
    searchValue: string,
    contentClassName: string
  ) => {
    const { _append, key, label, _prepend } = option as EuiComboBoxOptionOption<OptionData> & {
      _append: JSX.Element[];
      _prepend: JSX.Element;
    };
    return (
      <EuiFlexGroup
        className={contentClassName}
        key={key + '-span'}
        gutterSize="m"
        responsive={false}
        direction="row"
      >
        <EuiFlexItem grow={false}>{_prepend}</EuiFlexItem>
        <EuiFlexItem
          css={css`
            overflow: auto;
          `}
          grow
        >
          <EuiText textAlign="left" size="s">
            <EuiTextTruncate text={label} truncation="end" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadgeGroup gutterSize="xs">{_append}</EuiBadgeGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };
  const [selectableOptions, selectableSetOptions] = useState<
    Array<EuiComboBoxOptionOption<OptionData>>
  >([]);
  const { connectorTypes } = useValues(KibanaLogic);
  const allConnectors = useMemo(
    () => connectorTypes.sort((a, b) => a.name.localeCompare(b.name)),
    [connectorTypes]
  );
  const { selectedConnector } = useValues(NewConnectorLogic);
  const { setSelectedConnector } = useActions(NewConnectorLogic);

  const getInitialOptions = () => {
    return allConnectors.map((connector, key) => {
      const _append: JSX.Element[] = [];
      let _ariaLabelAppend = '';
      if (connector.isTechPreview) {
        _append.push(
          <EuiBadge
            aria-label={TECH_PREVIEW_LABEL}
            key={key + '-preview'}
            iconType="beaker"
            color="hollow"
          >
            {TECH_PREVIEW_LABEL}
          </EuiBadge>
        );
        _ariaLabelAppend += `, ${TECH_PREVIEW_LABEL}`;
      }
      if (connector.isBeta) {
        _append.push(
          <EuiBadge aria-label={BETA_LABEL} key={key + '-beta'} iconType={'beta'} color="hollow">
            {BETA_LABEL}
          </EuiBadge>
        );
        _ariaLabelAppend += `, ${BETA_LABEL}`;
      }
      if (selfManaged === 'native' && !connector.isNative) {
        _append.push(
          <EuiBadge key={key + '-self'} iconType={'warning'} color="warning">
            {CONNECTOR_CLIENT_LABEL}
          </EuiBadge>
        );
      }
      return {
        _append,
        _prepend: <EuiIcon size="l" type={connector.iconPath} />,
        'aria-label': connector.name + _ariaLabelAppend,
        key: key.toString(),
        label: connector.name,
      };
    });
  };

  const initialOptions = getInitialOptions();

  useEffect(() => {
    selectableSetOptions(initialOptions);
  }, [selfManaged]);

  return (
    <EuiComboBox
      isDisabled={disabled}
      aria-label={i18n.translate(
        'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.euiComboBox.accessibleScreenReaderLabelLabel',
        { defaultMessage: 'Select a data source for your connector to use.' }
      )}
      prepend={<EuiIcon type={selectedConnector?.iconPath ?? EuiIconPlugs} size="l" />}
      singleSelection
      fullWidth
      placeholder={i18n.translate(
        'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.placeholder.text',
        { defaultMessage: 'Choose a data source' }
      )}
      options={selectableOptions}
      selectedOptions={selectedOption}
      onChange={(selectedItem) => {
        setSelectedOption(selectedItem);
        if (selectedItem.length === 0) {
          setSelectedConnector(null);
          return;
        }
        const keySelected = Number(selectedItem[0].key);
        setSelectedConnector(allConnectors[keySelected]);
      }}
      renderOption={renderOption}
      rowHeight={(euiTheme.base / 2) * 5}
    />
  );
};
