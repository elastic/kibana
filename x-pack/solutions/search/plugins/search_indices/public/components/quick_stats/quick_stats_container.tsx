/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { StatsGridContainerStyle, StatsItemStyle } from './styles';

export const QuickStatsContainer = ({ children }: { children: React.ReactNode[] }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={StatsGridContainerStyle}>
      {children.map((item, i) =>
        item ? (
          <EuiFlexItem key={`quickstat.${i}`} css={StatsItemStyle(euiTheme)}>
            {item}
          </EuiFlexItem>
        ) : null
      )}
    </div>
  );
};
