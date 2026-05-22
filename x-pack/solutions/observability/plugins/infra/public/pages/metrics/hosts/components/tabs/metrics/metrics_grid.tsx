/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, EuiFlexItem, EuiText, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { HostMetricsExplanationContent } from '../../../../../../components/lens';
import { Chart } from './chart';
import { HostMetricsChart } from './host_metrics_chart';
import { Popover } from '../../../../../../components/popover';
import { useMetricsDataViewContext } from '../../../../../../containers/metrics_source';
import { useMetricsCharts } from '../../../hooks/use_metrics_charts';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useHostsMetricsTimeseries } from '../../../hooks/use_hosts_metrics_timeseries';
import { usePocSettingsContext } from '../../../hooks/use_poc_settings';
import type { HostsTimeseriesMetric } from '../../../../../../../common/http_api';

// P16 — order matches the legacy `useMetricsCharts()` array so the two-column
// grid renders the same chart in the same slot regardless of which path is
// active. Titles are sourced from i18n directly here (small enough catalogue
// that wiring back through `findInventoryModel('host').metrics.getCharts({})`
// is not worth the round-trip on every render).
const POC_METRICS: ReadonlyArray<{ metric: HostsTimeseriesMetric; title: string }> = [
  {
    metric: 'cpuUsage',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.cpuUsage', {
      defaultMessage: 'CPU Usage',
    }),
  },
  {
    metric: 'normalizedLoad1m',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.normalizedLoad1m', {
      defaultMessage: 'Normalized Load',
    }),
  },
  {
    metric: 'memoryUsage',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.memoryUsage', {
      defaultMessage: 'Memory Usage',
    }),
  },
  {
    metric: 'memoryFree',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.memoryFree', {
      defaultMessage: 'Memory Free',
    }),
  },
  {
    metric: 'diskSpaceAvailable',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.diskSpaceAvailable', {
      defaultMessage: 'Disk Space Available',
    }),
  },
  {
    metric: 'diskIORead',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.diskIORead', {
      defaultMessage: 'Disk Read IOPS',
    }),
  },
  {
    metric: 'diskIOWrite',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.diskIOWrite', {
      defaultMessage: 'Disk Write IOPS',
    }),
  },
  {
    metric: 'diskReadThroughput',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.diskReadThroughput', {
      defaultMessage: 'Disk Read Throughput',
    }),
  },
  {
    metric: 'diskWriteThroughput',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.diskWriteThroughput', {
      defaultMessage: 'Disk Write Throughput',
    }),
  },
  {
    metric: 'rx',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.rx', {
      defaultMessage: 'Network Inbound (RX)',
    }),
  },
  {
    metric: 'tx',
    title: i18n.translate('xpack.infra.hostsView.metricsTab.tx', {
      defaultMessage: 'Network Outbound (TX)',
    }),
  },
];

export const MetricsGrid = () => {
  const { useMetricsTimeseriesEndpoint } = usePocSettingsContext();

  // P16 — the new path uses the visible table page (`currentPage`) as its
  // host scope. Both the legacy and the new table expose a `currentPage`, so
  // we don't need to gate the new charts on `useTwoPhaseFetch` — flipping
  // the metrics-tab toggle alone is enough to switch which endpoint backs
  // the eleven charts.
  if (useMetricsTimeseriesEndpoint) {
    return <PocMetricsGrid />;
  }

  return <LegacyMetricsGrid />;
};

const PocMetricsGrid = () => {
  const { seriesByMetric, loading, bucketSpan } = useHostsMetricsTimeseries();

  return (
    <>
      <MetricsGridHeader />
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="hostsView-metricChart">
        {POC_METRICS.map(({ metric, title }) => (
          <EuiFlexItem key={metric} grow={false}>
            <HostMetricsChart
              metric={metric}
              title={title}
              series={seriesByMetric.get(metric) ?? []}
              loading={loading}
              bucketSpan={bucketSpan}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
};

const LegacyMetricsGrid = () => {
  const { metricsView } = useMetricsDataViewContext();
  const { searchCriteria } = useUnifiedSearchContext();
  const charts = useMetricsCharts({
    indexPattern: metricsView?.dataViewReference.getIndexPattern(),
    schema: searchCriteria.preferredSchema,
  });

  return (
    <>
      <MetricsGridHeader />
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="hostsView-metricChart">
        {charts.map((chartProp, index) => (
          <EuiFlexItem key={index} grow={false}>
            <Chart {...chartProp} dataView={metricsView?.dataViewReference} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
};

const MetricsGridHeader = () => (
  <EuiFlexGroup gutterSize="xs" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiText size="xs">
        {i18n.translate('xpack.infra.metricsGrid.learnMoreAboutMetricsTextLabel', {
          defaultMessage: 'Learn more about metrics',
        })}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <Popover>
        <HostMetricsExplanationContent />
      </Popover>
    </EuiFlexItem>
  </EuiFlexGroup>
);
