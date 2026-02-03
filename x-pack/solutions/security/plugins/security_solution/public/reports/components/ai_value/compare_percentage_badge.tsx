/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { getPercentInfo } from './utils';
import * as i18n from './translations';

interface Props {
  colorFamily?: 'default' | 'bright';
  currentCount: number;
  description?: string;
  previousCount: number;
  stat: string;
  statType: string;
  timeRange?: string;
  positionForLens?: boolean; // Optional prop for positioning in Lens Metric
}

export const ComparePercentageBadge = ({
  colorFamily = 'default',
  currentCount,
  description,
  previousCount,
  stat,
  statType,
  timeRange,
  positionForLens = false,
}: Props) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const percentInfo = useMemo(() => {
    return getPercentInfo({
      colors,
      colorFamily,
      currentCount,
      previousCount,
      stat,
      statType,
    });
  }, [colorFamily, colors, currentCount, previousCount, stat, statType]);
  const statUI = useMemo(() => {
    if (previousCount === 0 || currentCount === 0) {
      // do not display percentage change if either count is zero
      return null;
    }
    return (
      <span
        css={css`
          display: flex;
          align-items: center;
          gap: 8px;
        `}
      >
        <EuiToolTip content={percentInfo.note}>
          <EuiBadge color={percentInfo.color} tabIndex={0}>
            {percentInfo.percent}
          </EuiBadge>
        </EuiToolTip>
        {timeRange && (
          <EuiText size="xs" color="subdued">
            <p>{i18n.TIME_RANGE(timeRange)}</p>
          </EuiText>
        )}
      </span>
    );
  }, [
    currentCount,
    percentInfo.color,
    percentInfo.note,
    percentInfo.percent,
    previousCount,
    timeRange,
  ]);
  return (
    <span
      data-test-subj="comparePercentageBadge"
      css={css`
        display: flex;
        flex-direction: column;
        z-index: 9999;
        position: relative;
        // positioning hack for Lens Metric
        top: ${positionForLens ? '-40px' : 'initial'};
        left: ${positionForLens ? '20px' : 'initial'};
      `}
    >
      {statUI}
      {description && (
        <span
          css={css`
            margin-top: 5px;
          `}
        >
          <EuiText size="xs" color="subdued">
            <p>{description}</p>
          </EuiText>
        </span>
      )}
    </span>
  );
};
