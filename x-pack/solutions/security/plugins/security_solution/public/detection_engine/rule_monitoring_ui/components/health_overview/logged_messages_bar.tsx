/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { HealthData } from './types';
import { CHART_HEIGHT, LOG_LEVELS } from './constants';
import * as i18n from './translations';

export const LoggedMessagesBar = memo(function LoggedMessagesBar({
  health,
}: {
  health: HealthData;
}) {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const { number_of_logged_messages } = health.stats_over_interval;

  const levelColors = useMemo(
    () => [
      euiTheme.colors.vis.euiColorVisDanger0, // error
      euiTheme.colors.vis.euiColorVisWarning0, // warn
      euiTheme.colors.vis.euiColorVisNeutral0, // info
      euiTheme.colors.vis.euiColorVis0, // debug
      euiTheme.colors.vis.euiColorVis3, // trace
    ],
    [euiTheme]
  );

  const data = useMemo(
    () =>
      LOG_LEVELS.map((level) => ({
        category: i18n.LOG_MESSAGES_CATEGORY,
        level: level.charAt(0).toUpperCase() + level.slice(1),
        count: number_of_logged_messages.by_level?.[level] ?? 0,
      })),
    [number_of_logged_messages.by_level]
  );

  if (number_of_logged_messages.total === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visBarVertical"
        title={<h4>{i18n.NO_LOGGED_MESSAGES_TITLE}</h4>}
        body={<p>{i18n.NO_LOGGED_MESSAGES_BODY}</p>}
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
