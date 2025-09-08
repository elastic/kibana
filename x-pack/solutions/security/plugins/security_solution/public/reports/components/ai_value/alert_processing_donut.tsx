/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { useEuiTheme } from '@elastic/eui';
import { type ValueMetrics } from './metrics';
import { DonutChart } from '../../../common/components/charts/donutchart';

interface Props {
  valueMetrics: ValueMetrics;
}

/**
 * Renders a donut chart visualization showing the proportion of escalated alerts versus AI-filtered alerts.
 */
export const AlertProcessingDonut: React.FC<Props> = ({ valueMetrics }) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const data = useMemo(
    () => [
      {
        label: 'Escalated',
        key: 'escalated',
        value: valueMetrics.totalAlerts - valueMetrics.filteredAlerts,
      },
      {
        label: 'AI Filtered',
        key: 'filtered',
        value: valueMetrics.filteredAlerts,
      },
    ],
    [valueMetrics.filteredAlerts, valueMetrics.totalAlerts]
  );

  const fillColor = useCallback(
    (label: string) =>
      label.toLowerCase() === 'escalated' ? colors.vis.euiColorVis9 : colors.vis.euiColorVis0,
    [colors]
  );
  return (
    <DonutChart
      data={data}
      fillColor={fillColor}
      height={160}
      label={''}
      title={null}
      totalCount={valueMetrics.totalAlerts}
    />
  );
};
