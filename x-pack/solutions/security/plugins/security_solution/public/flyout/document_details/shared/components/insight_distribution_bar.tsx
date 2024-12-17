/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  useEuiTheme,
  useEuiFontSize,
  type EuiFlexGroupProps,
} from '@elastic/eui';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';

export interface InsightDistributionBarProps {
  /**
   * Title of the insight
   */
  title: string | React.ReactNode;
  /**
   * Distribution stats to display
   */
  stats: Array<{ key: string; count: number; color: string; label?: React.ReactNode }>;
  /**
   * Count to be displayed in the badge
   */
  count: React.ReactNode;
  /**
   * Flex direction of the component
   */
  direction?: EuiFlexGroupProps['direction'];
  /**
   * Optional test id
   */
  ['data-test-subj']?: string;
}

// Displays a distribution bar with a count badge
export const InsightDistributionBar: React.FC<InsightDistributionBarProps> = ({
  title,
  stats,
  count,
  direction = 'row',
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const barComponent = useMemo(
    () => (
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <DistributionBar
            stats={stats}
            hideLastTooltip
            data-test-subj={`${dataTestSubj}-distribution-bar`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} data-test-subj={`${dataTestSubj}-badge`}>
          <EuiBadge color="hollow">{count}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [stats, count, dataTestSubj]
  );

  return (
    <EuiFlexGroup
      direction={direction}
      data-test-subj={dataTestSubj}
      responsive={false}
      gutterSize="s"
    >
      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            font-size: ${xsFontSize};
            font-weight: ${euiTheme.font.weight.bold};
            min-width: 115px;
          `}
        >
          {title}
        </EuiText>
      </EuiFlexItem>
      {direction === 'column' ? (
        <EuiFlexItem
          css={css`
            margin-top: -${euiTheme.size.base};
          `}
        >
          {barComponent}
        </EuiFlexItem>
      ) : (
        <EuiFlexItem>{barComponent}</EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

InsightDistributionBar.displayName = 'InsightDistributionBar';
