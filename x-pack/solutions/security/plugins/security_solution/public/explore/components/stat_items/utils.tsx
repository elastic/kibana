/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';

export const ChartHeight = 120;

export const FlexGroup = styled(EuiFlexGroup)`
  .no-margin {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
`;
export const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
  position: relative;
`;

FlexItem.displayName = 'FlexItem';

export const MetricItem = styled(EuiFlexItem)`
  &.euiFlexItem {
    flex-basis: 0;
    flex-grow: 0;
    min-width: 100px;
  }
`;
MetricItem.displayName = 'MetricItem';

export const StatValue = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

StatValue.displayName = 'StatValue';

export const StyledTitle = styled.h6`
  line-height: 200%;
`;
