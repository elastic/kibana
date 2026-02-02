/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { OverviewTrend } from '../../../../../common/types';

export const getTrendDuration = <T,>({
  onLoading,
  onNoData,
  onData,
  trendData,
}: {
  onLoading: (onLoadingComponent: React.JSX.Element) => T;
  onNoData: (onNoDataComponent: React.JSX.Element) => T;
  onData: (data: OverviewTrend & { median: number }) => T;
  trendData: OverviewTrend | 'loading' | null | undefined;
}): T => {
  if (trendData === 'loading') {
    return onLoading(
      <EuiSkeletonText lines={1} ariaWrapperProps={{ style: { height: '16px', width: '50px' } }} />
    );
  } else if (!trendData || trendData.median === null) {
    return onNoData(
      <FormattedMessage
        id="xpack.synthetics.overview.metricItem.noDataAvailableMessage"
        defaultMessage="--"
      />
    );
  } else {
    const median = trendData.median;
    return onData({ ...trendData, median });
  }
};
