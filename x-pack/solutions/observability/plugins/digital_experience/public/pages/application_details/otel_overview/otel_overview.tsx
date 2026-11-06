/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { APPLICATION_SOURCE } from '../../../../common/application_source';
import { NO_WEB_VITALS } from '../../../../common/core_web_vitals';
import type {
  ApplicationOverview,
  ApplicationOverviewResponse,
} from '../../../../common/types/overview';
import type { ApplicationUsageResponse } from '../../../../common/types/usage';
import { ApplicationTabToolbar } from '../../../components/application_tab_toolbar';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { APPLICATION_OVERVIEW_EBT_ELEMENTS, ERRORS_EBT_ELEMENTS } from '../../../ebt_constants';
import type { ApplicationData, ApplicationRequest } from '../../../hooks/use_application_data';
import { useApplicationData } from '../../../hooks/use_application_data';
import { useApplicationLinks } from '../../../hooks/use_application_links';
import { useLastEnvironments } from '../../../hooks/use_last_environments';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { TimeRangeSelect } from '../../../utils/brush_time_range';
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

const overviewRequest: ApplicationRequest<ApplicationOverviewResponse> = (apiClient, options) => {
  return apiClient.fetch(
    'GET /internal/digital_experience/applications/{serviceName}/overview',
    options
  );
};

const usageRequest: ApplicationRequest<ApplicationUsageResponse> = (apiClient, options) => {
  return apiClient.fetch(
    'GET /internal/digital_experience/applications/{serviceName}/usage',
    options
  );
};

/** Shown while loading: no metric is a measured zero. */
const emptyOverview = (serviceName: string): ApplicationOverview => {
  return {
    serviceName,
    pageLoads: { count: 0 },
    loadTime: { p75Ms: null, sampleCount: 0 },
    jsErrors: { count: 0 },
    httpRequests: { count: 0, failedCount: 0, failedRatio: null },
    webVitals: NO_WEB_VITALS,
    trend: [],
  };
};

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

/** The panels below the trends, where a failed request replaces only its own panels. */
function UsageAndErrorsPanels({
  serviceName,
  usage: { response, isLoading, error, refresh },
  topErrors,
}: {
  serviceName: string;
  usage: ApplicationData<ApplicationUsageResponse>;
  topErrors: ApplicationErrors;
}) {
  const { errorsHref, sessionsHref } = useApplicationLinks(serviceName, APPLICATION_SOURCE.otel);
  const { topPages, breakdowns, topClicks, totalClicks } = response ?? EMPTY_USAGE;

  return (
    <>
      {error ? (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceOverviewUsageError"
          retryDataTestSubj="digitalExperienceOverviewUsageRetry"
          retryEbtElement={APPLICATION_OVERVIEW_EBT_ELEMENTS.USAGE_RETRY}
          title={USAGE_FETCH_ERROR_TITLE}
          error={error}
          onRetry={refresh}
        />
      ) : (
        <EuiFlexGroup gutterSize="m" alignItems="stretch">
          <EuiFlexItem grow={3}>
            <TopPagesPanel pages={topPages} isLoading={isLoading} />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <BreakdownsPanel
              breakdowns={breakdowns}
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
              maxRows={TOP_ERRORS_ROWS}
              viewAllHref={errorsHref}
            />
          )}
        </EuiFlexItem>
        {!error && (
          <EuiFlexItem grow={2}>
            <TopClicksPanel clicks={topClicks} totalClicks={totalClicks} isLoading={isLoading} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
}

/**
 * The Overview of one EDOT Browser application: its KPIs, Core Web Vitals and trends, then what
 * users load and do and their top errors, over the selected environment and time range.
 */
export function OtelOverview({ serviceName }: { serviceName: string }) {
  const { setTimeRange } = useTimeRange();
  // Separate requests, so the KPIs never wait on the panels below and a failure replaces only its own.
  const overview = useApplicationData(serviceName, overviewRequest);
  const usage = useApplicationData(serviceName, usageRequest);
  const topErrors = useApplicationErrors(serviceName);

  const overviewEnvironments = useMemo(() => {
    return (
      overview.response && {
        serviceName: overview.response.overview.serviceName,
        environments: overview.response.environments,
      }
    );
  }, [overview.response]);
  const environments = useLastEnvironments(serviceName, overviewEnvironments);

  const refreshAll = () => {
    overview.refresh();
    usage.refresh();
    topErrors.refresh();
  };

  return (
    <>
      <EuiSpacer size="m" />
      <ApplicationTabToolbar
        environments={environments}
        isLoading={overview.isLoading}
        onRefresh={refreshAll}
      />
      <EuiSpacer size="m" />
      {overview.error ? (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceOverviewError"
          retryDataTestSubj="digitalExperienceOverviewRetry"
          retryEbtElement={APPLICATION_OVERVIEW_EBT_ELEMENTS.RETRY}
          title={FETCH_ERROR_TITLE}
          error={overview.error}
          onRetry={overview.refresh}
        />
      ) : (
        <OverviewPanels
          overview={overview.response?.overview ?? emptyOverview(serviceName)}
          isLoading={overview.isLoading}
          onTimeRangeSelect={setTimeRange}
        />
      )}
      <EuiSpacer size="m" />
      <UsageAndErrorsPanels serviceName={serviceName} usage={usage} topErrors={topErrors} />
    </>
  );
}
