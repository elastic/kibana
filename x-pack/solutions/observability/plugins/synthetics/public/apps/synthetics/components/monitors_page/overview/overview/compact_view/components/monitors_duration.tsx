/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { EuiSkeletonText, EuiText } from '@elastic/eui';
import type { OverviewTrend } from '../../../../../../../../../common/types';
import { formatDuration } from '../../../../../../utils/formatting';
import { selectOverviewTrends } from '../../../../../../state';
import type { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';

const getDurationToDisplay = (trendData: OverviewTrend | 'loading' | null | undefined) => {
  if (trendData === 'loading') {
    return (
      <EuiSkeletonText
        lines={1}
        ariaWrapperProps={{
          style: {
            height: '16px',
            width: '50px',
          },
        }}
      />
    );
  }

  if (!trendData || (!trendData.median && trendData.median !== 0)) {
    return '--';
  }

  return formatDuration(trendData.median);
};

export const MonitorsDuration = ({
  monitor,
  onClickDuration,
}: {
  monitor: OverviewStatusMetaData;
  onClickDuration: () => void;
}) => {
  const trendData = useSelector(selectOverviewTrends)[monitor.configId + monitor.locationId];
  return (
    <EuiText size="s" onClick={onClickDuration}>
      {getDurationToDisplay(trendData)}
    </EuiText>
  );
};
