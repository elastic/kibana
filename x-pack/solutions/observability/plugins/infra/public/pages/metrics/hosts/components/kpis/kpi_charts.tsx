/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hosts page KPI strip — four headline tiles (CPU Usage, Normalized Load,
// Memory Usage, Disk Usage) rendered from a single client-side ES|QL `STATS`
// query issued over the data plugin (`useHostsKpisEsql`), one variant per
// schema. The query fires in parallel with the `/host` table fetch (both
// gated on `useHostsPageReady`), so KPI latency is `max(/host, kpis)` rather
// than `/host + kpis`. Tiles use the lightweight `<MetricChartWrapper>`
// (plain Elastic Charts `Metric`) instead of Lens, trading the per-tile
// sparkline for collapsing four bucketed `date_histogram` round-trips into
// one un-bucketed `STATS`.

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import {
  findInventoryModel,
  CPU_USAGE_LABEL,
  MEMORY_USAGE_LABEL,
  NORMALIZED_LOAD_LABEL,
  DISK_USAGE_LABEL,
} from '@kbn/metrics-data-access-plugin/common';
import { KPI_CHART_HEIGHT, METRICS_TOOLTIP } from '../../../../../common/visualizations';
import { TooltipContent } from '../../../../../components/lens';
import { useHostsKpisEsql } from '../../hooks/use_hosts_kpis_esql';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostCountContext } from '../../hooks/use_host_count';
import { MetricChartWrapper } from '../chart/metric_chart_wrapper';

type KpiKey = 'cpuUsage' | 'normalizedLoad1m' | 'memoryUsage' | 'diskUsage';

const TILE_DEFS: ReadonlyArray<{
  key: KpiKey;
  id: string;
  title: string;
  tooltipKey: keyof typeof METRICS_TOOLTIP;
}> = [
  {
    key: 'cpuUsage',
    id: 'hostsViewKPI-cpuUsage',
    title: CPU_USAGE_LABEL,
    tooltipKey: 'cpuUsage',
  },
  {
    key: 'normalizedLoad1m',
    id: 'hostsViewKPI-normalizedLoad1m',
    title: NORMALIZED_LOAD_LABEL,
    tooltipKey: 'normalizedLoad1m',
  },
  {
    key: 'memoryUsage',
    id: 'hostsViewKPI-memoryUsage',
    title: MEMORY_USAGE_LABEL,
    tooltipKey: 'memoryUsage',
  },
  {
    key: 'diskUsage',
    id: 'hostsViewKPI-diskUsage',
    title: DISK_USAGE_LABEL,
    tooltipKey: 'diskUsage',
  },
] as const;

const KPI_DECIMALS = 1;

const buildFormatter = (format: 'percent' | 'number' | undefined): ((value: number) => string) => {
  if (format === 'number') {
    return (value: number) => value.toFixed(KPI_DECIMALS);
  }
  return (value: number) => `${(value * 100).toFixed(KPI_DECIMALS)}%`;
};

export const KpiCharts = () => {
  const { euiTheme } = useEuiTheme();
  const { searchCriteria } = useUnifiedSearchContext();
  const { count: hostCount } = useHostCountContext();
  const { kpis, loading, error } = useHostsKpisEsql();

  const inventoryModel = findInventoryModel('host');
  const schema = searchCriteria?.preferredSchema;
  const { value: formulas } = useAsync(
    () => inventoryModel.metrics.getFormulas(schema ? { schema } : undefined),
    [schema, inventoryModel.metrics]
  );

  // On a failed KPI query, surface a distinct subtitle so the "–" tiles read
  // as an error rather than as "no data". Otherwise: "Average (of N hosts)"
  // pegged to `min(hostCount, limit)` — the genuine fleet size when below the
  // limit, otherwise the user-selected `limit` (the host set the query
  // averages over and the table renders).
  const subtitle = useMemo(() => {
    if (error) {
      return i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.error', {
        defaultMessage: 'Unable to load',
      });
    }
    const visibleHosts = Math.min(hostCount, searchCriteria.limit);
    return i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average', {
      defaultMessage: 'Average (of {hosts} hosts)',
      values: { hosts: visibleHosts },
    });
  }, [error, hostCount, searchCriteria.limit]);

  return (
    <>
      {TILE_DEFS.map((tile) => {
        const formula = formulas?.get(tile.key);
        const formatter = buildFormatter(formula?.format as 'percent' | 'number' | undefined);
        return (
          <EuiFlexItem key={tile.id}>
            <MetricChartWrapper
              id={tile.id}
              title={tile.title}
              color={euiTheme.colors.lightestShade}
              value={kpis[tile.key]}
              valueFormatter={formatter}
              subtitle={subtitle}
              loading={loading}
              style={{ height: KPI_CHART_HEIGHT }}
              toolTip={
                <TooltipContent
                  formula={formulas?.get(tile.key)?.value}
                  description={METRICS_TOOLTIP[tile.tooltipKey]}
                />
              }
            />
          </EuiFlexItem>
        );
      })}
    </>
  );
};
