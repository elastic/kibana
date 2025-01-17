/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiFlexItem, useEuiTheme, type UseEuiTheme } from '@elastic/eui';

const StatsContainerStyle = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
`;

const StatsItemStyle = (euiTheme: UseEuiTheme['euiTheme']) => css`
  border: ${euiTheme.border.thin};
`;

export const QuickStatsContainer = ({ children }: { children: React.ReactNode[] }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={StatsContainerStyle}>
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
