/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiProgress, EuiFlexItem, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const ChartLoadingProgress = ({ hasTopMargin = false }: { hasTopMargin?: boolean }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiProgress
      size="xs"
      color="accent"
      position="absolute"
      css={css`
        top: ${hasTopMargin ? euiTheme.size.l : 0};
        z-index: ${Number(euiTheme.levels.header) - 1};
      `}
    />
  );
};

export const ChartPlaceholder = ({ style }: { style?: React.CSSProperties }) => {
  return (
    <>
      <ChartLoadingProgress hasTopMargin={false} />
      <EuiFlexGroup style={style} justifyContent="center" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingChart mono size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
