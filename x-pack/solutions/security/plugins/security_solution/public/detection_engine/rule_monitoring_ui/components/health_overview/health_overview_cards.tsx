/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { Chart, LayoutDirection, Metric } from '@elastic/charts';
import type { HealthData } from './types';
import * as i18n from './translations';

export const HealthOverviewCards = memo(function HealthOverviewCards({
  health,
}: {
  health: HealthData;
}) {
  const { euiTheme } = useEuiTheme();

  const { number_of_rules } = health.state_at_the_moment;
  const stats = health.stats_over_interval;

  const totalRules = number_of_rules.all.total;
  const enabledRules = number_of_rules.all.enabled;
  const totalExec = stats.number_of_executions.total;
  const failures = stats.number_of_executions.by_outcome?.failed ?? 0;
  const warnings = stats.number_of_executions.by_outcome?.warning ?? 0;
  const scheduleDelayP95 = stats.schedule_delay_ms.percentiles['95.0'] ?? 0;
  const searchDurationP95 = stats.search_duration_ms.percentiles['95.0'] ?? 0;

  const gaps = stats.number_of_detected_gaps.total;

  return (
    <Chart size={['100%', 150]}>
      <Metric
        id="kpi-overview"
        data={[
          [
            {
              color: euiTheme.colors.vis.euiColorVis0,
              title: i18n.TOTAL_RULES,
              value: totalRules,
              valueFormatter: (v) => `${v}`,
            },
            {
              color:
                enabledRules > 0
                  ? euiTheme.colors.vis.euiColorVisSuccess0
                  : euiTheme.colors.vis.euiColorVisDanger0,
              title: i18n.ENABLED_RULES,
              value: enabledRules,
              domainMax: totalRules || 1,
              valueFormatter: (v) => `${v} (${((v / (totalRules || 1)) * 100).toFixed(1)}%)`,
              progressBarDirection: LayoutDirection.Vertical,
            },
            {
              color: euiTheme.colors.vis.euiColorVisSuccess0,
              title: i18n.TOTAL_EXECUTIONS,
              value: totalExec,
              valueFormatter: (v) => `${v}`,
            },
            {
              color:
                failures > 0
                  ? euiTheme.colors.vis.euiColorVisDanger0
                  : euiTheme.colors.vis.euiColorVisSuccess0,
              title: i18n.FAILURES,
              value: failures,
              valueFormatter: (v) => `${v}`,
            },
          ],
          [
            {
              color:
                scheduleDelayP95 > 5000
                  ? euiTheme.colors.vis.euiColorVisDanger0
                  : scheduleDelayP95 > 1000
                  ? euiTheme.colors.vis.euiColorVisWarning0
                  : euiTheme.colors.vis.euiColorVisSuccess0,
              title: i18n.SCHEDULE_DELAY_P95,
              value: scheduleDelayP95,
              valueFormatter: (v) => humanizeMs(Math.round(v)),
            },
            {
              color:
                searchDurationP95 > 5000
                  ? euiTheme.colors.vis.euiColorVisDanger0
                  : searchDurationP95 > 1000
                  ? euiTheme.colors.vis.euiColorVisWarning0
                  : euiTheme.colors.vis.euiColorVisSuccess0,
              title: i18n.SEARCH_DURATION_P95,
              value: searchDurationP95,
              valueFormatter: (v) => humanizeMs(Math.round(v)),
            },
            {
              color:
                gaps > 0
                  ? euiTheme.colors.vis.euiColorVisDanger0
                  : euiTheme.colors.vis.euiColorVisSuccess0,
              title: i18n.DETECTED_GAPS,
              value: gaps,
              valueFormatter: (v) => `${v}`,
            },

            {
              color:
                warnings > 0
                  ? euiTheme.colors.vis.euiColorVisWarning0
                  : euiTheme.colors.vis.euiColorVisSuccess0,
              title: i18n.WARNINGS,
              value: warnings,
              valueFormatter: (v) => `${v}`,
            },
          ],
        ]}
      />
    </Chart>
  );
});

function humanizeMs(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`;
  }

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
