/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, LayoutDirection, Metric } from '@elastic/charts';
import React, { memo } from 'react';
import type { HealthData } from './constants';
import { getP } from './constants';
import * as i18n from './translations';

export const HealthOverviewCards = memo(function HealthOverviewCards({
  health,
}: {
  health: HealthData;
}) {
  const { number_of_rules } = health.state_at_the_moment;
  const stats = health.stats_over_interval;

  const totalRules = number_of_rules.all.total;
  const enabledRules = number_of_rules.all.enabled;
  const disabledRules = number_of_rules.all.disabled;
  const enabledPct = totalRules > 0 ? (enabledRules / totalRules) * 100 : 0;
  const totalExec = stats.number_of_executions.total;
  const failures = stats.number_of_executions.by_outcome?.failed ?? 0;
  const gaps = stats.number_of_detected_gaps.total;
  const p95Delay = getP(stats.schedule_delay_ms.percentiles, 'p95', '95.0');

  return (
    <Chart size={['100%', 150]}>
      <Metric
        id="kpi-overview"
        data={[
          [
            {
              color: '#6092C0',
              title: i18n.TOTAL_RULES,
              value: totalRules,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: enabledRules > 0 ? '#00BFB3' : '#E7664C',
              title: i18n.ENABLED_RULES,
              value: enabledRules,
              domainMax: totalRules || 1,
              valueFormatter: (v) => `${v}`,
              progressBarDirection: LayoutDirection.Vertical,
            },
            {
              color: '#D6BF57',
              title: i18n.DISABLED_RULES,
              value: disabledRules,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: enabledPct >= 50 ? '#00BFB3' : enabledPct > 0 ? '#D6BF57' : '#E7664C',
              title: i18n.ENABLED_PERCENTAGE,
              value: enabledPct,
              domainMax: 100,
              valueFormatter: (v) => `${v.toFixed(1)}%`,
              progressBarDirection: LayoutDirection.Vertical,
            },
          ],
          [
            {
              color: '#6092C0',
              title: i18n.TOTAL_EXECUTIONS,
              value: totalExec,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: failures > 0 ? '#E7664C' : '#00BFB3',
              title: i18n.FAILURES,
              value: failures,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: gaps > 0 ? '#E7664C' : '#00BFB3',
              title: i18n.DETECTED_GAPS,
              value: gaps,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: p95Delay > 5000 ? '#E7664C' : p95Delay > 1000 ? '#D6BF57' : '#00BFB3',
              title: i18n.P95_SCHEDULE_DELAY,
              value: p95Delay,
              valueFormatter: (v) => `${Math.round(v)} ms`,
            },
          ],
        ]}
      />
    </Chart>
  );
});
