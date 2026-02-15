/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import React, { memo, useMemo } from 'react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { HealthData } from './constants';
import { CHART_HEIGHT, LOG_LEVELS } from './constants';

export const LoggedMessagesBar = memo<{ health: HealthData }>(({ health }) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const { number_of_logged_messages } = health.stats_over_interval;

  const levelColors = useMemo(
    () => [
      euiTheme.colors.vis.euiColorVis9, // error – red
      euiTheme.colors.vis.euiColorVis5, // warn  – orange
      euiTheme.colors.vis.euiColorVis0, // info  – green
      euiTheme.colors.vis.euiColorVis1, // debug – blue
      euiTheme.colors.vis.euiColorVis3, // trace – teal
    ],
    [euiTheme]
  );

  const data = useMemo(
    () =>
      LOG_LEVELS.map((level) => ({
        category: 'Log Messages',
        level: level.charAt(0).toUpperCase() + level.slice(1),
        count: number_of_logged_messages.by_level?.[level] ?? 0,
      })),
    [number_of_logged_messages.by_level]
  );

  if (number_of_logged_messages.total === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visBarVertical"
        title={<h4>{'No logged messages'}</h4>}
        body={<p>{'No logged messages in the selected interval.'}</p>}
      />
    );
  }

  return (
    <Chart size={{ height: CHART_HEIGHT }}>
      <Settings baseTheme={baseTheme} showLegend legendPosition="right" rotation={90} />
      <BarSeries
        id="loggedMessages"
        data={data}
        xAccessor="category"
        yAccessors={['count']}
        splitSeriesAccessors={['level']}
        stackAccessors={['category']}
        xScaleType={ScaleType.Ordinal}
        yScaleType={ScaleType.Linear}
        color={levelColors}
      />
      <Axis id="bottom" position={Position.Bottom} />
    </Chart>
  );
});
LoggedMessagesBar.displayName = 'LoggedMessagesBar';
