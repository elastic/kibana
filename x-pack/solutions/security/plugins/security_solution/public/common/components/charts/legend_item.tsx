/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';

import { EMPTY_VALUE_LABEL } from './translation';
import { hasValueToDisplay } from '../../utils/validators';

export interface LegendItem {
  color?: string;
  field: string;
  value: string | number;
}

const LegendText = styled.span`
  font-size: 10.5px;
`;

/**
 * Renders the value or a placeholder in case the value is empty
 */
const ValueWrapper = React.memo<{ value: LegendItem['value'] }>(({ value }) =>
  hasValueToDisplay(value) ? (
    <LegendText>{value}</LegendText>
  ) : (
    <LegendText data-test-subj="value-wrapper-empty">{EMPTY_VALUE_LABEL}</LegendText>
  )
);

ValueWrapper.displayName = 'ValueWrapper';

const LegendItemComponent: React.FC<{
  legendItem: LegendItem;
}> = ({ legendItem }) => {
  const { color, value } = legendItem;

  return (
    <EuiText size="xs">
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
        {color != null && (
          <EuiFlexItem grow={false}>
            <EuiHealth data-test-subj="legend-color" color={color} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <ValueWrapper value={value} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};

LegendItemComponent.displayName = 'LegendItemComponent';

export const LegendItem = React.memo(LegendItemComponent);
