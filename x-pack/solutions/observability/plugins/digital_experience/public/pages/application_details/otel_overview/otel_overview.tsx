/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { APPLICATION_SOURCE } from '../../../../common/application_source';
import { NO_WEB_VITALS } from '../../../../common/core_web_vitals';
import type { ApplicationOverview } from '../../../../common/types/overview';
import type { ApplicationUsageResponse } from '../../../../common/types/usage';
import { EnvironmentFilter } from '../../../components/environment_filter';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { TimeRangePicker } from '../../../components/time_range_picker';
import { APPLICATION_OVERVIEW_EBT_ELEMENTS, ERRORS_EBT_ELEMENTS } from '../../../ebt_constants';
import { useApiClient } from '../../../hooks/use_api_client';
import { useApplicationLinks } from '../../../hooks/use_application_links';
import { useEnvironment } from '../../../hooks/use_environment';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { TimeRangeSelect } from '../../../utils/brush_time_range';
import { toTimeRangeQuery } from '../../../utils/time_range_query';
import { JsErrorsPanel } from '../../errors/components/js_errors_panel';
import { ERRORS_FETCH_ERROR_TITLE } from '../../errors/errors_tab';
import type { ApplicationErrors } from '../../errors/hooks/use_application_errors';
import { useApplicationErrors } from '../../errors/hooks/use_application_errors';
import { BreakdownsPanel } from './components/breakdowns_panel';
import { CoreWebVitalsPanel } from './components/core_web_vitals_panel';
import { OverviewKpis } from './components/overview_kpis';
import { OverviewTrends } from './components/overview_trends';
import { TopClicksPanel } from './components/top_clicks_panel';
import { TopPagesPanel } from './components/top_pages_panel';
import { usePickerEnvironments } from './hooks/use_picker_environments';

const FETCH_ERROR_TITLE = i18n.translate('xpack.digitalExperience.overview.fetchErrorTitle', {
  defaultMessage: 'Could not load the Overview',
});

const USAGE_FETCH_ERROR_TITLE = i18n.translate(
  'xpack.digitalExperience.overview.usageFetchErrorTitle',
  { defaultMessage: 'Could not load the pages, browsers and clicks' }
);

const EMPTY_USAGE: ApplicationUsageResponse = {
  topPages: [],
  breakdowns: { pageLoads: 0, browsers: [], operatingSystems: [], devices: [] },
  topClicks: [],
  totalClicks: 0,
};

/** The most frequent error groups on the Overview; the Errors tab lists the rest. */
const TOP_ERRORS_ROWS = 5;

/** The panels below the trends, where a failed request replaces only its own panels. */
function UsageAndErrorsPanels({
  serviceName,
  usage,
  isLoading,
  usageError,
  onUsageRetry,
  topErrors,
}: {
  serviceName: string;
  usage: ApplicationUsageResponse;
  isLoading: boolean;
  usageError: Error | undefined;
  onUsageRetry: () => void;
  topErrors: ApplicationErrors;
}) {
  const { errorsHref, sessionsHref } = useApplicationLinks(serviceName, APPLICATION_SOURCE.otel);

  return (
    <>
      {usageError ? (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceOverviewUsageError"
          retryDataTestSubj="digitalExperienceOverviewUsageRetry"
          retryEbtElement={APPLICATION_OVERVIEW_EBT_ELEMENTS.USAGE_RETRY}
          title={USAGE_FETCH_ERROR_TITLE}
          error={usageError}
          onRetry={onUsageRetry}
        />
      ) : (
        <EuiFlexGroup gutterSize="m" alignItems="stretch">
          <EuiFlexItem grow={3}>
            <TopPagesPanel pages={usage.topPages} isLoading={isLoading} />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <BreakdownsPanel
              breakdowns={usage.breakdowns}
              isLoading={isLoading}
              sessionsHref={sessionsHref}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="stretch">
        <EuiFlexItem grow={3}>
          {topErrors.error ? (
            <LoadErrorPrompt
              data-test-subj="digitalExperienceOverviewTopErrorsError"
              retryDataTestSubj="digitalExperienceOverviewTopErrorsRetry"
              retryEbtElement={ERRORS_EBT_ELEMENTS.RETRY}
              title={ERRORS_FETCH_ERROR_TITLE}
              error={topErrors.error}
              onRetry={topErrors.refresh}
            />
          ) : (
            <JsErrorsPanel
              errors={topErrors.response?.errors ?? []}
              isLoading={topErrors.isLoading}
              sessionsWithErrorsHref={sessionsHref({ hasErrors: true })}
              maxRows={TOP_ERRORS_ROWS}
              viewAllHref={errorsHref}
            />
          )}
        </EuiFlexItem>
        {!usageError && (
          <EuiFlexItem grow={2}>
            <TopClicksPanel
              clicks={usage.topClicks}
              totalClicks={usage.totalClicks}
              isLoading={isLoading}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
}

/** Shown while loading: no metric is a measured zero. */
const emptyOverview = (serviceName: string): ApplicationOverview => ({
  serviceName,
  pageLoads: { count: 0 },
  loadTime: { p75Ms: null, sampleCount: 0 },
  jsErrors: { count: 0 },
  httpRequests: { count: 0, failedCount: 0, failedRatio: null },
  webVitals: NO_WEB_VITALS,
  trend: [],
});

/** The KPIs, Core Web Vitals and trends of one Overview, empty while it loads. */
function OverviewPanels({
  overview,
  isLoading,
  onTimeRangeSelect,
}: {
  overview: ApplicationOverview;
  isLoading: boolean;
  onTimeRangeSelect: TimeRangeSelect;
}) {
  return (
    <>
      <OverviewKpis overview={overview} isLoading={isLoading} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="stretch">
        <EuiFlexItem grow={2}>
          <CoreWebVitalsPanel webVitals={overview.webVitals} isLoading={isLoading} />
        </EuiFlexItem>
        <EuiFlexItem grow={5}>
          <OverviewTrends
            points={overview.trend}
            pageLoads={overview.pageLoads.count}
            loadTimeP75Ms={overview.loadTime.p75Ms}
            isLoading={isLoading}
            onTimeRangeSelect={onTimeRangeSelect}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

/**
 * The Overview of one EDOT Browser application: its KPIs, Core Web Vitals and trends over the
 * selected environment and time range.
 */
export function OtelOverview({ serviceName }: { serviceName: string }) {
  const apiClient = useApiClient();
  const { timeRange, setTimeRange } = useTimeRange();
  const { environment, setEnvironment } = useEnvironment();

  const {
    value: response,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) =>
      apiClient.fetch('GET /internal/digital_experience/applications/{serviceName}/overview', {
        signal,
        params: { path: { serviceName }, query: toTimeRangeQuery(timeRange, environment) },
      }),
    [apiClient, serviceName, timeRange, environment],
    // The results of another application, environment or time range are never shown as current.
    { clearValueOnNext: true, unsetValueOnError: true }
  );
  // Nothing has been fetched before the first request starts.
  const isLoading = loading || (!response && !error);

  // Its own request, so the KPIs never wait on it and its failure only replaces its panels.
  const {
    value: usageResponse,
    loading: usageLoading,
    error: usageError,
    refresh: refreshUsage,
  } = useAbortableAsync(
    async ({ signal }) => {
      return apiClient.fetch('GET /internal/digital_experience/applications/{serviceName}/usage', {
        signal,
        params: { path: { serviceName }, query: toTimeRangeQuery(timeRange, environment) },
      });
    },
    [apiClient, serviceName, timeRange, environment],
    { clearValueOnNext: true, unsetValueOnError: true }
  );
  const isUsageLoading = usageLoading || (!usageResponse && !usageError);

  const topErrors = useApplicationErrors(serviceName);

  const refreshAll = () => {
    refresh();
    refreshUsage();
    topErrors.refresh();
  };
  // The picker swaps its list for a spinner while loading, so it only loads until it has a list.
  const environments = usePickerEnvironments(serviceName, response);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EnvironmentFilter
              environments={environments ?? []}
              selected={environment}
              onChange={setEnvironment}
              isLoading={isLoading && !environments}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <TimeRangePicker onRefresh={refreshAll} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {error ? (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceOverviewError"
          retryDataTestSubj="digitalExperienceOverviewRetry"
          retryEbtElement={APPLICATION_OVERVIEW_EBT_ELEMENTS.RETRY}
          title={FETCH_ERROR_TITLE}
          error={error}
          onRetry={refresh}
        />
      ) : (
        <OverviewPanels
          overview={response?.overview ?? emptyOverview(serviceName)}
          isLoading={isLoading}
          onTimeRangeSelect={setTimeRange}
        />
      )}
      <EuiSpacer size="m" />
      <UsageAndErrorsPanels
        serviceName={serviceName}
        usage={usageResponse ?? EMPTY_USAGE}
        isLoading={isUsageLoading}
        usageError={usageError}
        onUsageRetry={refreshUsage}
        topErrors={topErrors}
      />
    </>
  );
}
