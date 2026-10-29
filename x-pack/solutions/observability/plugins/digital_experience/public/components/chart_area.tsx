/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiLoadingChart, EuiText } from '@elastic/eui';

const fillCss = css({ blockSize: '100%' });

interface ChartAreaProps {
  height: number;
  isLoading: boolean;
  hasData: boolean;
  emptyMessage: string;
  children: ReactNode;
}

const centered = (content: ReactNode) => (
  <EuiFlexGroup css={fillCss} alignItems="center" justifyContent="center">
    {content}
  </EuiFlexGroup>
);

const chartAreaContent = ({
  isLoading,
  hasData,
  emptyMessage,
  children,
}: Omit<ChartAreaProps, 'height'>): ReactNode => {
  if (isLoading) {
    return centered(<EuiLoadingChart size="l" />);
  }
  if (!hasData) {
    return centered(
      <EuiText size="s" color="subdued">
        {emptyMessage}
      </EuiText>
    );
  }
  return children;
};

/** A chart that keeps its height while loading or without data, so the panel does not jump. */
export function ChartArea({ height, ...content }: ChartAreaProps) {
  return <div css={{ blockSize: height }}>{chartAreaContent(content)}</div>;
}
