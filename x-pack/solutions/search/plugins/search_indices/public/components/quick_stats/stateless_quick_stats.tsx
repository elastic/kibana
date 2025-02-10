/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import { StatsItemStyle } from './styles';

export interface StatelessQuickStatsProps {
  children: React.ReactNode[];
}

export const StatelessQuickStats = ({ children }: StatelessQuickStatsProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="none" wrap>
      {children.map((stat, i) => (
        <EuiFlexItem key={`stat.${i}`} css={StatsItemStyle(euiTheme)}>
          {stat}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
