/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiStatProps,
  EuiText,
} from '@elastic/eui';

import { DESCRIPTION_LABEL, NAME_LABEL } from '../../../shared/constants';
import { isConnectorIndex } from '../../utils/indices';

import { ConnectorNameAndDescriptionFlyout } from './connector/connector_name_and_description/connector_name_and_description_flyout';
import { ConnectorNameAndDescriptionLogic } from './connector/connector_name_and_description/connector_name_and_description_logic';
import { OverviewLogic } from './overview.logic';

const EditDescription: React.FC<{
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
}> = ({ label, onClick }) => (
  <EuiFlexGroup justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty onClick={onClick}>Edit</EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const NameAndDescriptionStats: React.FC = () => {
  const { indexData, isError, isLoading } = useValues(OverviewLogic);
  const hideStats = isLoading || isError;
  const { setIsEditing: setIsFlyoutVisible } = useActions(ConnectorNameAndDescriptionLogic);

  if (!isConnectorIndex(indexData)) {
    return <></>;
  }

  const stats: EuiStatProps[] = [
    {
      description: <EditDescription label={NAME_LABEL} onClick={() => setIsFlyoutVisible(true)} />,
      isLoading: hideStats,
      title: indexData.connector.name,
      descriptionElement: 'div',
      titleElement: 'div',
    },
    {
      description: (
        <EditDescription label={DESCRIPTION_LABEL} onClick={() => setIsFlyoutVisible(true)} />
      ),
      descriptionElement: 'div',
      isLoading: hideStats,
      title: <EuiText size="s">{indexData.connector.description || ''}</EuiText>,
      titleElement: 'div',
    },
  ];

  return (
    <>
      <EuiFlexGroup direction="row">
        {stats.map((item, index) => (
          <EuiFlexItem key={index}>
            <EuiPanel color={'subdued'} hasShadow={false} paddingSize="l">
              <EuiStat titleSize="s" {...item} />
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <ConnectorNameAndDescriptionFlyout />
    </>
  );
};
