/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

interface MetricStatProps {
  label: string;
  value: string;
}

const containerStyles = css`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const MetricStat = ({ label, value }: MetricStatProps) => (
  <div css={containerStyles}>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiText size="m">
      <strong>{value}</strong>
    </EuiText>
  </div>
);
