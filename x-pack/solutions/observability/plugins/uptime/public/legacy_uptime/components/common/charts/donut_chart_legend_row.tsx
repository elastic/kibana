/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

const EuiFlexItemReducedMargin = styled(EuiFlexItem)`
  && {
    margin-left: 0px;
    margin-right: 0px;
  }
`;

const EuiFlexItemAlignRight = styled(EuiFlexItem)`
  text-align: right;
`;

interface Props {
  color: string;
  message: string;
  content: string | number;
  'data-test-subj': string;
}

export const DonutChartLegendRow = ({ color, content, message, 'data-test-subj': dts }: Props) => (
  <EuiFlexGroup gutterSize="l" responsive={false}>
    <EuiFlexItemReducedMargin component="span" grow={false}>
      <EuiHealth color={color} />
    </EuiFlexItemReducedMargin>
    <EuiFlexItemReducedMargin component="span" grow={false} data-test-subj={`${dts}.label`}>
      {message}
    </EuiFlexItemReducedMargin>
    <EuiFlexItemAlignRight component="span" data-test-subj={dts}>
      {content}
    </EuiFlexItemAlignRight>
  </EuiFlexGroup>
);
