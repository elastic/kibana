/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { NO_CHANGE, STAT_DIFFERENCE } from '../detection_response/soc_trends/translations';
import { getPercChange } from '../detection_response/soc_trends/helpers';

interface Props {
  currentCount: number;
  previousCount: number;
  previousCost: string;
}
export const CostComparePercentage = ({ currentCount, previousCount, previousCost }: Props) => {
  const percentageChange = getPercChange(currentCount, previousCount) ?? '0.0%';

  const isNegative = percentageChange.charAt(0) === '-';
  const isZero = percentageChange === '0.0%';

  const percentInfo = {
    percent: isNegative || isZero ? percentageChange : `+${percentageChange}`,
    color: isZero ? 'hollow' : isNegative ? 'danger' : 'success',
    note: isZero
      ? NO_CHANGE('cost savings')
      : STAT_DIFFERENCE({
          upOrDown: isNegative ? 'down' : 'up',
          percentageChange: isNegative ? percentageChange.substring(1) : percentageChange,
          stat: previousCost,
          statType: 'cost savings',
        }),
  };
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, zIndex: 9999 }}>
      <EuiToolTip content={percentInfo.note}>
        <EuiBadge color={percentInfo.color}>
          {percentInfo.percent != null ? percentInfo.percent : '-'}
        </EuiBadge>
      </EuiToolTip>
      <EuiText size="xs" color="subdued">
        <p>{'over the last 30 days'}</p>
      </EuiText>
    </span>
  );
};
