/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { getPercentInfo } from './utils';
import * as i18n from './translations';

interface Props {
  currentCount: number;
  previousCount: number;
  stat: string;
  statType: string;
  timeRange: string;
  positionForLens?: boolean; // Optional prop for positioning in Lens Metric
}
export const ComparePercentage = ({
  currentCount,
  previousCount,
  stat,
  statType,
  timeRange,
  positionForLens = false,
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
    <span
      data-test-subj="comparePercentage"
      css={css`
        display: flex;
        flex-direction: column;
        z-index: 9999;
        position: relative;
        // positioning hack for Lens Metric
        top: ${positionForLens ? '-55px' : 'initial'};
        left: ${positionForLens ? '20px' : 'initial'};
        width: ${positionForLens ? '90%' : 'auto'};
      `}
    >
      <EuiText size="s" color="subdued">
        {percentInfo.note}
        {` `}
        {i18n.TIME_RANGE(timeRange)}
        {`.`}
      </EuiText>
    </span>
  );
};
