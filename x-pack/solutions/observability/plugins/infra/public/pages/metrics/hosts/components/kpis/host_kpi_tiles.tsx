/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P15b — renders the four headline KPI tiles (CPU Usage, Normalized Load,
// Memory Usage, Disk Usage) from a single ES|QL `STATS` request instead of
// four separate Lens charts. Previously these were `<Kpi>` components
// wrapping `<LensChart>`; the visual contract (header / value / subtitle /
// tooltip) is preserved, only the data path changes.

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import {
  CPU_USAGE_LABEL,
  DISK_USAGE_LABEL,
  MEMORY_USAGE_LABEL,
  NORMALIZED_LOAD_LABEL,
} from '@kbn/metrics-data-access-plugin/common/inventory_models/shared/charts/constants';
import { KPI_CHART_HEIGHT, METRICS_TOOLTIP } from '../../../../../common/visualizations';
import { TooltipContent } from '../../../../../components/lens';
import { useHostsKpis } from '../../hooks/use_hosts_kpis';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostCountContext } from '../../hooks/use_host_count';
import { MetricChartWrapper } from '../chart/metric_chart_wrapper';

type KpiKey = 'cpuUsage' | 'normalizedLoad1m' | 'memoryUsage' | 'diskUsage';

const TILE_DEFS: ReadonlyArray<{
  key: KpiKey;
  id: string;
  title: string;
  tooltipKey: keyof typeof METRICS_TOOLTIP;
  // `normalizedLoad1m` is displayed as a raw multiplier on the legacy Lens
  // chart (`1.5×` style); the rest are percentages. Encode that here so the
  // formatter stays a pure function of the tile.
  format: 'percent' | 'ratio';
}> = [
  {
    key: 'cpuUsage',
    id: 'hostsViewKPI-cpuUsage',
    title: CPU_USAGE_LABEL,
    tooltipKey: 'cpuUsage',
    format: 'percent',
  },
  {
    key: 'normalizedLoad1m',
    id: 'hostsViewKPI-normalizedLoad1m',
    title: NORMALIZED_LOAD_LABEL,
    tooltipKey: 'normalizedLoad1m',
    format: 'percent',
  },
  {
    key: 'memoryUsage',
    id: 'hostsViewKPI-memoryUsage',
    title: MEMORY_USAGE_LABEL,
    tooltipKey: 'memoryUsage',
    format: 'percent',
  },
  {
    key: 'diskUsage',
    id: 'hostsViewKPI-diskUsage',
    title: DISK_USAGE_LABEL,
    tooltipKey: 'diskUsage',
    format: 'percent',
  },
] as const;

const percentFormatter = (value: number) => `${(value * 100).toFixed(1)}%`;
const ratioFormatter = (value: number) => value.toFixed(2);

export const HostKpiTiles = () => {
  const { euiTheme } = useEuiTheme();
  const { searchCriteria } = useUnifiedSearchContext();
  const { count: hostCount } = useHostCountContext();
  const { kpis, loading } = useHostsKpis();

  const inventoryModel = findInventoryModel('host');
  const schema = searchCriteria?.preferredSchema;
  const { value: formulas } = useAsync(
    () => inventoryModel.metrics.getFormulas(schema ? { schema } : undefined),
    [schema, inventoryModel.metrics]
  );

  // "Average (of {limit} hosts)" when the user-selected `limit` is below the
  // total matching host count; otherwise the plain "Average" subtitle.
  // Matches the wording the legacy `getSubtitle` used so the tile copy
  // doesn't shift under users.
  const subtitle = useMemo(() => {
    const { limit } = searchCriteria;
    return limit < hostCount
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: { limit },
        })
      : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average', {
          defaultMessage: 'Average',
        });
  }, [searchCriteria, hostCount]);

  return (
    <>
      {TILE_DEFS.map((tile) => {
        const formatter = tile.format === 'percent' ? percentFormatter : ratioFormatter;
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
