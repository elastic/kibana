/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import * as i18n from './translations';
import { getPercChange } from '../detection_response/soc_trends/helpers';

interface Props {
  currentCount: number;
  description?: string;
  previousCount: number;
  stat: string;
  statType: string;
  timeRange?: string;
  positionForLens?: boolean; // Optional prop for positioning in Lens Metric
}
export const ComparePercentage = ({
  currentCount,
  description,
  previousCount,
  stat,
  statType,
  timeRange,
  positionForLens = false,
}: Props) => {
  const percentageChange = getPercChange(currentCount, previousCount) ?? '0.0%';

  const isNegative = percentageChange.charAt(0) === '-';
  const isZero = percentageChange === '0.0%';

  const percentInfo = {
    percent: isNegative || isZero ? percentageChange : `+${percentageChange}`,
    color: isZero ? 'hollow' : isNegative ? 'danger' : 'success',
    note: isZero
      ? i18n.NO_CHANGE('cost savings')
      : i18n.STAT_DIFFERENCE({
          upOrDown: isNegative ? i18n.DOWN : i18n.UP,
          percentageChange: isNegative ? percentageChange.substring(1) : percentageChange,
          stat,
          statType,
        }),
  };
  return (
    <span
      css={css`
        display: flex;
        flex-direction: column;
        z-index: 9999;
        position: relative;
        // positioning hack for Lens Metric
        top: ${positionForLens ? '-55px' : 'initial'};
        left: ${positionForLens ? '20px' : 'initial'};
      `}
    >
      <span
        css={css`
          display: flex;
          align-items: center;
          gap: 8px;
        `}
      >
        <EuiToolTip content={percentInfo.note}>
          <EuiBadge color={percentInfo.color}>{percentInfo.percent}</EuiBadge>
        </EuiToolTip>
        {timeRange && (
          <EuiText size="xs" color="subdued">
            <p>{i18n.TIME_RANGE(timeRange)}</p>
          </EuiText>
        )}
      </span>
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
