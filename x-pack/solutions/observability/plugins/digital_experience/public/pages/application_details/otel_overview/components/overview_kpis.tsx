/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { KpiPanel } from '../../../../components/kpi_panel';
import type { OverviewPercentile } from '../../../../../common/overview_filters';
import type { ApplicationOverview } from '../../../../../common/types/overview';
import { useFormatters } from '../../../../hooks/use_formatters';
import { loadTimeLabel, PAGE_LOADS_LABEL } from '../../../../labels';
import { formatDurationMs } from '../../../../utils/format_duration';

const JS_ERRORS_LABEL = i18n.translate('xpack.digitalExperience.overview.kpis.jsErrorsLabel', {
  defaultMessage: 'JS errors',
});

const FAILED_HTTP_LABEL = i18n.translate('xpack.digitalExperience.overview.kpis.failedHttpLabel', {
  defaultMessage: 'Failed HTTP requests',
});

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

/** The four headline metrics of the Overview, each with its unit. */
export function OverviewKpis({
  overview,
  percentile,
  isLoading,
}: {
  overview: Omit<ApplicationOverview, 'trendHistogram'>;
  /** The percentile the load time is at, named in its label. */
  percentile: OverviewPercentile;
  isLoading: boolean;
}) {
  const { formatNumber, formatPercent } = useFormatters();
  const { pageLoads, loadTime, jsErrors, httpRequests } = overview;

  return (
    <EuiFlexGroup gutterSize="m" data-test-subj="digitalExperienceOverviewKpis">
      <KpiPanel
        data-test-subj="digitalExperienceOverviewPageLoads"
        label={PAGE_LOADS_LABEL}
        value={formatNumber(pageLoads.count)}
        isLoading={isLoading}
      />
      <KpiPanel
        data-test-subj="digitalExperienceOverviewLoadTime"
        label={loadTimeLabel(percentile)}
        hint={loadTimeHint(loadTime.sampleCount)}
        value={
          loadTime.percentileMs === null ? (
            <EmptyCellValue />
          ) : (
            formatDurationMs(loadTime.percentileMs)
          )
        }
        isLoading={isLoading}
      />
      <KpiPanel
        data-test-subj="digitalExperienceOverviewJsErrors"
        label={JS_ERRORS_LABEL}
        value={formatNumber(jsErrors.count)}
        isLoading={isLoading}
      />
      <KpiPanel
        data-test-subj="digitalExperienceOverviewFailedHttp"
        label={FAILED_HTTP_LABEL}
        hint={failedHttpHint(httpRequests.failedCount, httpRequests.count)}
        value={
          httpRequests.failedRatio === null ? (
            <EmptyCellValue />
          ) : (
            formatPercent(httpRequests.failedRatio)
          )
        }
        isLoading={isLoading}
      />
    </EuiFlexGroup>
  );
}
