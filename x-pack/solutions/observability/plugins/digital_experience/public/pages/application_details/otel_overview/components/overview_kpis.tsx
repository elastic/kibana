/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OverviewPercentile } from '../../../../../common/overview_filters';
import type { ApplicationOverviewKpisResponse } from '../../../../../common/types/overview';
import type { OverviewDiscoverHrefs } from '../hooks/use_overview_discover_hrefs';
import {
  ComparedKpiPanel,
  type ComparedKpiPanelProps,
} from '../../../../components/compared_kpi_panel';
import { useFormatters } from '../../../../hooks/use_formatters';
import { loadTimeLabel, PAGE_LOADS_LABEL, SESSIONS_LABEL } from '../../../../labels';
import { formatDurationMs } from '../../../../utils/format_duration';

type Kpi = Exclude<keyof ApplicationOverviewKpisResponse, 'percentile' | 'counts' | 'discover'>;

type KpiCounts = ApplicationOverviewKpisResponse['counts'];

const NO_COUNTS: KpiCounts = {
  sessionsWithErrors: 0,
  loadTimeSamples: 0,
  httpRequests: 0,
  failedHttpRequests: 0,
};

const loadTimeHint = (sampleCount: number) =>
  i18n.translate('xpack.digitalExperience.overview.kpis.loadTimeTooltip', {
    defaultMessage:
      '75th percentile of the load event end of {sampleCount, plural, one {# page load} other {# page loads}}. Page loads that reported no load event are counted as page loads but do not contribute to it.',
    values: { sampleCount },
  });

const failedHttpHint = (failedCount: number, count: number) =>
  i18n.translate('xpack.digitalExperience.overview.kpis.failedHttpTooltip', {
    defaultMessage:
      '{failedCount} of {count, plural, one {# request} other {# requests}} returned an error status or never received a response.',
    values: { failedCount, count },
  });

const errorFreeSessionsHint = (sessionsWithErrors: number) =>
  i18n.translate('xpack.digitalExperience.overview.kpis.errorFreeSessionsTooltip', {
    defaultMessage:
      'The share of the sessions without a JS error or a failed HTTP request. {sessionsWithErrors, plural, one {# session} other {# sessions}} had one.',
    values: { sessionsWithErrors },
  });

type KpiPanel = Pick<
  ComparedKpiPanelProps,
  'title' | 'tooltip' | 'formatValue' | 'changeUnit' | 'higherIsBetter' | 'data-test-subj'
> & { kpi: Kpi };

/** The KPI row, in order: the traffic and stability first, then the speed and failures. */
const kpiPanels = ({
  percentile,
  counts,
  formatNumber,
  formatKpiPercent,
}: {
  percentile: OverviewPercentile;
  counts: KpiCounts;
  formatNumber: (value: number) => string;
  formatKpiPercent: (share: number) => string;
}): KpiPanel[] => [
  {
    kpi: 'sessions',
    'data-test-subj': 'digitalExperienceOverviewSessions',
    title: SESSIONS_LABEL,
    tooltip: i18n.translate('xpack.digitalExperience.overview.kpis.sessionsTooltip', {
      defaultMessage:
        'Distinct session.id values of the events in the time range. Counts above a few thousand are approximate.',
    }),
    formatValue: formatNumber,
    changeUnit: 'relative',
  },
  {
    kpi: 'errorFreeSessions',
    'data-test-subj': 'digitalExperienceOverviewErrorFreeSessions',
    title: i18n.translate('xpack.digitalExperience.overview.kpis.errorFreeSessionsLabel', {
      defaultMessage: 'Error-free sessions',
    }),
    tooltip: errorFreeSessionsHint(counts.sessionsWithErrors),
    formatValue: formatKpiPercent,
    changeUnit: 'percentagePoints',
    higherIsBetter: true,
  },
  {
    kpi: 'pageLoads',
    'data-test-subj': 'digitalExperienceOverviewPageLoads',
    title: PAGE_LOADS_LABEL,
    tooltip: i18n.translate('xpack.digitalExperience.overview.kpis.pageLoadsTooltip', {
      defaultMessage: 'Full page loads in the time range; in-app navigations are not counted.',
    }),
    formatValue: formatNumber,
    changeUnit: 'relative',
  },
  {
    kpi: 'loadTime',
    'data-test-subj': 'digitalExperienceOverviewLoadTime',
    title: loadTimeLabel(percentile),
    tooltip: loadTimeHint(counts.loadTimeSamples),
    formatValue: formatDurationMs,
    changeUnit: 'relative',
    higherIsBetter: false,
  },
  {
    kpi: 'jsErrors',
    'data-test-subj': 'digitalExperienceOverviewJsErrors',
    title: i18n.translate('xpack.digitalExperience.overview.kpis.jsErrorsLabel', {
      defaultMessage: 'JS errors',
    }),
    tooltip: i18n.translate('xpack.digitalExperience.overview.kpis.jsErrorsTooltip', {
      defaultMessage: 'JS exceptions reported in the time range.',
    }),
    formatValue: formatNumber,
    changeUnit: 'relative',
    higherIsBetter: false,
  },
  {
    kpi: 'failedHttpRequests',
    'data-test-subj': 'digitalExperienceOverviewFailedHttp',
    title: i18n.translate('xpack.digitalExperience.overview.kpis.failedHttpLabel', {
      defaultMessage: 'Failed HTTP requests',
    }),
    tooltip: failedHttpHint(counts.failedHttpRequests, counts.httpRequests),
    formatValue: formatKpiPercent,
    changeUnit: 'percentagePoints',
    higherIsBetter: false,
  },
  {
    kpi: 'requestLatency',
    'data-test-subj': 'digitalExperienceOverviewRequestLatency',
    title: i18n.translate('xpack.digitalExperience.overview.kpis.requestLatencyLabel', {
      defaultMessage: 'Avg request latency',
    }),
    tooltip: i18n.translate('xpack.digitalExperience.overview.kpis.requestLatencyTooltip', {
      defaultMessage: 'The average duration of the fetch and XHR requests in the time range.',
    }),
    formatValue: formatDurationMs,
    changeUnit: 'relative',
    higherIsBetter: false,
  },
];

/**
 * The Overview's headline metrics. With Compare on, each shows its change against the period of
 * equal length before the time range, colored by whether it went the better way.
 */
export function OverviewKpis({
  kpis,
  percentile,
  discoverHrefs,
  isComparing,
  isLoading,
}: {
  /** `undefined` while loading. */
  kpis: ApplicationOverviewKpisResponse | undefined;
  /** The percentile the load time is at, named in its label before its response arrives. */
  percentile: OverviewPercentile;
  /** Where each tile opens its events in Discover. */
  discoverHrefs: OverviewDiscoverHrefs;
  isComparing: boolean;
  isLoading: boolean;
}) {
  const { formatNumber, formatKpiPercent } = useFormatters();
  const panels = kpiPanels({
    percentile,
    counts: kpis?.counts ?? NO_COUNTS,
    formatNumber,
    formatKpiPercent,
  });

  return (
    <EuiFlexGroup gutterSize="m" wrap data-test-subj="digitalExperienceOverviewKpis">
      {panels.map(({ kpi, ...panel }) => (
        <ComparedKpiPanel
          key={kpi}
          {...panel}
          value={kpis?.[kpi]}
          discoverHref={discoverHrefs[kpi]}
          isComparing={isComparing}
          isLoading={isLoading}
        />
      ))}
    </EuiFlexGroup>
  );
}
