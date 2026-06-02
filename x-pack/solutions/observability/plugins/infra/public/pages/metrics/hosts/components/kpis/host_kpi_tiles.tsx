/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Renders the four headline KPI tiles (CPU Usage, Normalized Load, Memory
// Usage, Disk Usage) from a single client-side ES|QL `STATS` request issued
// over the data plugin (`useHostsKpisEsql`) instead of four parallel Lens
// charts. These used to be `<Kpi>` components wrapping `<LensChart>`; this
// path uses the lighter `<MetricChartWrapper>` (a plain Elastic Charts
// `Metric`). The visual contract (header / value / subtitle / tooltip) is
// preserved — only the data path changes.
//
// Trade-off: dropping Lens for the KPI strip also drops the per-tile
// sparkline trend line and the "Open in Lens" affordance. The headline
// number is the only thing the tile rendered, so the loss is the faint
// near-flat line behind it; the win is collapsing four bucketed
// `date_histogram` round-trips into one un-bucketed `STATS`.

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { KPI_CHART_HEIGHT, METRICS_TOOLTIP } from '../../../../../common/visualizations';

// The Lens KPI path imports these labels from
// `@kbn/metrics-data-access-plugin/common/inventory_models/shared/charts/constants`,
// but that file is a private subpath of the plugin and the optimised
// build forbids subpath imports outside `[public, common]`. Inline the
// `i18n.translate` calls with the same translation IDs so the strings
// stay in sync with the shared constants without crossing the module
// boundary.
const CPU_USAGE_LABEL = i18n.translate('xpack.infra.assetDetails.metrics.label.cpuUsage', {
  defaultMessage: 'CPU Usage',
});
const MEMORY_USAGE_LABEL = i18n.translate('xpack.infra.assetDetails.metrics.label.memoryUsage', {
  defaultMessage: 'Memory Usage',
});
const NORMALIZED_LOAD_LABEL = i18n.translate(
  'xpack.infra.assetDetails.metrics.label.normalizedLoad',
  { defaultMessage: 'Normalized Load' }
);
const DISK_USAGE_LABEL = i18n.translate('xpack.infra.assetDetails.metrics.label.diskUsage', {
  defaultMessage: 'Disk Usage',
});
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

// One decimal place across the KPI strip — uniform with how CPU and
// memory render on the legacy Lens path, and one extra digit of precision
// over the legacy `decimals: 0` setting for `diskUsage` /
// `normalizedLoad1m` (deliberate — the headline number reads better with
// one significant fractional digit at fleet scale, where deltas between
// reloads are typically sub-percentage).
//
// We still respect the formula's `format` so a future tile that lands as
// `format: 'number'` renders without a `%` suffix.
const KPI_DECIMALS = 1;

const buildFormatter = (format: 'percent' | 'number' | undefined): ((value: number) => string) => {
  if (format === 'number') {
    return (value: number) => value.toFixed(KPI_DECIMALS);
  }
  return (value: number) => `${(value * 100).toFixed(KPI_DECIMALS)}%`;
};

export const HostKpiTiles = () => {
  const { euiTheme } = useEuiTheme();
  const { searchCriteria } = useUnifiedSearchContext();
  const { count: hostCount } = useHostCountContext();
  const { kpis, loading } = useHostsKpisEsql();

  const inventoryModel = findInventoryModel('host');
  const schema = searchCriteria?.preferredSchema;
  const { value: formulas } = useAsync(
    () => inventoryModel.metrics.getFormulas(schema ? { schema } : undefined),
    [schema, inventoryModel.metrics]
  );

  // "Average (of N hosts)" where N is `min(hostCount, limit)`:
  //   - when `hostCount < limit` we show the genuine fleet size,
  //   - when `hostCount > limit` we show the user-selected `limit` so the
  //     KPI subtitle matches the host count displayed in the table even
  //     though the KPI itself is computed over the entire filtered fleet.
  // Endpoint always returns `hostCount` so we never fall back to a bare
  // "Average" string.
  const subtitle = useMemo(() => {
    const visibleHosts = Math.min(hostCount, searchCriteria.limit);
    return i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average', {
      defaultMessage: 'Average (of {hosts} hosts)',
      values: { hosts: visibleHosts },
    });
  }, [hostCount, searchCriteria.limit]);

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
