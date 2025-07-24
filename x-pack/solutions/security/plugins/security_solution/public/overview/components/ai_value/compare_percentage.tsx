/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as i18n from './translations';
import { getPercChange } from '../detection_response/soc_trends/helpers';

interface Props {
  currentCount: number;
  previousCount: number;
  stat: string;
  statType: string;
  timeRange: string;
}
export const ComparePercentage = ({
  currentCount,
  previousCount,
  stat,
  statType,
  timeRange,
}: Props) => {
  const percentageChange = getPercChange(currentCount, previousCount) ?? '0.0%';

  const isNegative = percentageChange.charAt(0) === '-';
  const isZero = percentageChange === '0.0%';

  const percentInfo = {
    percent: isNegative || isZero ? percentageChange : `+${percentageChange}`,
    color: isZero ? 'hollow' : isNegative ? 'danger' : 'success',
    note: isZero
      ? i18n.NO_CHANGE(statType)
      : i18n.STAT_DIFFERENCE({
          upOrDown: isNegative ? i18n.DOWN : i18n.UP,
          percentageChange: isNegative ? percentageChange.substring(1) : percentageChange,
          stat,
          statType,
        }),
  };
  return (
    <>
      {percentInfo.note}
      {` `}
      {i18n.TIME_RANGE(timeRange)}
      {`.`}
    </>
  );
};
