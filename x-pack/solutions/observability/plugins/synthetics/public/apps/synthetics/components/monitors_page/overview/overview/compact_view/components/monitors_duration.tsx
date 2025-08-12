/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { EuiText } from '@elastic/eui';
import { formatDuration } from '../../../../../../utils/formatting';
import { selectOverviewTrends } from '../../../../../../state';
import { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';

export const MonitorsDuration = ({
  monitor,
  onClickDuration,
}: {
  monitor: OverviewStatusMetaData;
  onClickDuration: () => void;
}) => {
  const trendData = useSelector(selectOverviewTrends)[monitor.configId + monitor.locationId];
  const duration = trendData === 'loading' || !trendData?.median ? 0 : trendData.median;
  return (
    <EuiText size="s" onClick={onClickDuration}>
      {formatDuration(duration)}
    </EuiText>
  );
};
