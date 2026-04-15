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
import { CHART_HEIGHT, getRuleTypeName } from './constants';
import * as i18n from './translations';

export const RulesByTypeBar = memo(function RulesByTypeBar({ health }: { health: HealthData }) {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const { by_type } = health.state_at_the_moment.number_of_rules;

  const data = useMemo(
    () =>
      Object.entries(by_type)
        .map(([key, val]) => ({ type: getRuleTypeName(key), count: val.total }))
        .sort((a, b) => b.count - a.count),
    [by_type]
  );

  if (data.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visBarVertical"
        title={<h4>{i18n.NO_RULE_TYPES_TITLE}</h4>}
        body={<p>{i18n.NO_RULE_TYPES_BODY}</p>}
      />
    );
  }

  return (
    <Chart size={{ height: Math.max(CHART_HEIGHT, data.length * 36 + 40) }}>
      <Settings baseTheme={baseTheme} showLegend={false} rotation={90} />
      <BarSeries
        id="rulesByType"
        name={i18n.RULES_SERIES_NAME}
        data={data}
        xAccessor="type"
        yAccessors={['count']}
        xScaleType={ScaleType.Ordinal}
        yScaleType={ScaleType.Linear}
        color={euiTheme.colors.vis.euiColorVis1}
      />
      <Axis id="left" position={Position.Left} />
      <Axis id="bottom" position={Position.Bottom} />
    </Chart>
  );
});
