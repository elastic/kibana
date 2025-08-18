/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { getPercentInfo } from './utils';
import * as i18n from './translations';

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
  const percentInfo = useMemo(() => {
    return getPercentInfo({
      currentCount,
      previousCount,
      stat,
      statType,
    });
  }, [currentCount, previousCount, stat, statType]);

  if (previousCount === 0 || currentCount === 0) {
    // do not display percentage change if either count is zero
    return null;
  }
  return (
    <span data-test-subj="comparePercentage">
      {percentInfo.note}
      {` `}
      {i18n.TIME_RANGE(timeRange)}
      {`.`}
    </span>
  );
};
