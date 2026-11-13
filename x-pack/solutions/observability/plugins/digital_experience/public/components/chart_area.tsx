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
  /** The height of the chart, or its least height when it `grow`s. */
  height: number;
  /**
   * Takes the room left in a flex column, down to `height`; the parent has to be a flex column.
   * The chart fills the area, so it has to size itself to its container.
   */
  grow?: boolean;
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
}: Omit<ChartAreaProps, 'height' | 'grow'>): ReactNode => {
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
export function ChartArea({ height, grow = false, ...content }: ChartAreaProps) {
  if (!grow) {
    return <div css={{ blockSize: height }}>{chartAreaContent(content)}</div>;
  }
  // The content is laid over the area, so that what it measures is the area's height, which is
  // what the flex column gives it, and not the height of the content.
  return (
    <div css={{ flex: '1 1 0', minBlockSize: height, position: 'relative' }}>
      <div css={{ position: 'absolute', inset: 0 }}>{chartAreaContent(content)}</div>
    </div>
  );
}
