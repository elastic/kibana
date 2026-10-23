/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { DetectionRule } from '../../../data/rules/use_detection_rules';
import { useChartThemes } from '../../../hooks/use_chart_themes';
import { buildRuleMatchSeries, getTotalMatches } from './rule_match_series';

const TITLE = i18n.translate('xpack.nightshift.detectionPage.rules.chartTitle', {
  defaultMessage: 'Rule matches over time',
});
const NO_MATCHES = i18n.translate('xpack.nightshift.detectionPage.rules.noMatches', {
  defaultMessage: 'No rule matches in this time range.',
});

export const RuleMatchesChart = ({
  rules,
  loading,
}: {
  rules: DetectionRule[];
  loading: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const { baseTheme } = useChartThemes();
  const series = useMemo(() => buildRuleMatchSeries(rules), [rules]);
  const total = getTotalMatches(rules);
  const extent = series[0]?.data;
  const formatTime = niceTimeFormatter([extent?.[0]?.x, extent?.[extent.length - 1]?.x]);
  const formatCount = new Intl.NumberFormat(i18n.getLocale(), { notation: 'compact' });
  const colors = [
    euiTheme.colors.vis.euiColorVis0,
    euiTheme.colors.vis.euiColorVis1,
    euiTheme.colors.vis.euiColorVis2,
    euiTheme.colors.vis.euiColorVis3,
    euiTheme.colors.vis.euiColorVis4,
  ];
  return (
    <EuiPanel hasBorder data-test-subj="nightshiftRuleMatchesChart">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>{TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.nightshift.detectionPage.rules.chartTotal', {
              defaultMessage: '{count, plural, one {# match} other {# matches}}',
              values: { count: total },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div css={{ height: 200, display: 'grid', placeItems: 'center' }}>
        {loading ? (
          <EuiLoadingChart size="m" />
        ) : total === 0 ? (
          <EuiText size="s" color="subdued">
            {NO_MATCHES}
          </EuiText>
        ) : (
          <Chart size={{ height: 200 }}>
            <Settings baseTheme={baseTheme} showLegend={false} locale={i18n.getLocale()} />
            <Axis
              id="left"
              position={Position.Left}
              tickFormat={(value) => formatCount.format(value)}
            />
            <Axis id="bottom" position={Position.Bottom} tickFormat={formatTime} />
            {series.map(({ id, name, data }, index) => (
              <AreaSeries
                key={id}
                id={id}
                name={name}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                stackAccessors={['x']}
                data={data}
                color={id === 'other-rules' ? euiTheme.colors.vis.euiColorVisGrey0 : colors[index]}
              />
            ))}
          </Chart>
        )}
      </div>
    </EuiPanel>
  );
};
