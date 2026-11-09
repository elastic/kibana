/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { APPLICATION_SOURCE } from '../../../../common/application_source';
import { NO_WEB_VITALS } from '../../../../common/core_web_vitals';
import { toggleFilterValue } from '../../../../common/filter_values';
import type {
  OverviewFilterName,
  OverviewFilters,
  OverviewPercentile,
  OverviewPercentileParam,
  OverviewSearchParams,
} from '../../../../common/overview_filters';
import { PAGE_FILTER_NAMES } from '../../../../common/overview_filters';
import type {
  ApplicationOverview,
  ApplicationOverviewResponse,
} from '../../../../common/types/overview';
import type { ApplicationUsageResponse } from '../../../../common/types/usage';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { APPLICATION_OVERVIEW_EBT_ELEMENTS, ERRORS_EBT_ELEMENTS } from '../../../ebt_constants';
import type { ApplicationData, ApplicationRequest } from '../../../hooks/use_application_data';
import { useApplicationData } from '../../../hooks/use_application_data';
import { useApplicationLinks } from '../../../hooks/use_application_links';
import { useFormatters } from '../../../hooks/use_formatters';
import { useOverviewFilters } from '../../../hooks/use_overview_filters';
import { useOverviewPercentile, useOverviewSearchParams } from '../../../hooks/use_overview_search';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { TimeRangeSelect } from '../../../utils/brush_time_range';
import { withOverviewFilters } from '../../../utils/with_overview_filters';
import { JsErrorsPanel } from '../../errors/components/js_errors_panel';
import { ERRORS_FETCH_ERROR_TITLE } from '../../errors/errors_tab';
import type { ApplicationErrors } from '../../errors/hooks/use_application_errors';
import { useApplicationErrors } from '../../errors/hooks/use_application_errors';
import { AllFiltersFlyout } from './components/all_filters_flyout';
import { BreakdownsPanel } from './components/breakdowns_panel';
import { CoreWebVitalsPanel } from './components/core_web_vitals_panel';
import { OverviewFilterPills } from './components/overview_filters';
import { OverviewKpis } from './components/overview_kpis';
import { OverviewToolbar } from './components/overview_toolbar';
import { OverviewTrends } from './components/overview_trends';
import { TopClicksPanel } from './components/top_clicks_panel';
import { TopPagesPanel } from './components/top_pages_panel';
import { usePickerOptions } from './hooks/use_picker_options';

const PAGE_FILTER_NOTE = i18n.translate('xpack.digitalExperience.overview.filters.pageNote', {
  defaultMessage:
    'The page filters apply to page loads only, with their load time, trend, pages and breakdowns: web vitals, JS errors, clicks and HTTP requests carry no page URL yet.',
});

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

/** The request for the Overview narrowed by `searchParams`; a change of them is a new request. */
const overviewRequestOf = (
  searchParams: OverviewSearchParams,
  percentile: OverviewPercentileParam | undefined
): ApplicationRequest<ApplicationOverviewResponse> => {
  return (apiClient, options) => {
    return apiClient.fetch(
      'GET /internal/digital_experience/applications/{serviceName}/overview',
      withOverviewFilters(options, searchParams, { percentile })
    );
  };
};

/** The request for the pages, breakdowns and clicks narrowed by `searchParams`. */
const usageRequestOf = (
  searchParams: OverviewSearchParams
): ApplicationRequest<ApplicationUsageResponse> => {
  return (apiClient, options) => {
    return apiClient.fetch(
      'GET /internal/digital_experience/applications/{serviceName}/usage',
      withOverviewFilters(options, searchParams)
    );
  };
};

/** Shown while loading: no metric is a measured zero. */
const emptyOverview = (
  serviceName: string,
  percentile: OverviewPercentile
): ApplicationOverview => ({
  serviceName,
  percentile,
  pageLoads: { count: 0 },
  loadTime: { percentileMs: null, sampleCount: 0 },
  jsErrors: { count: 0 },
  httpRequests: { count: 0, failedCount: 0, failedRatio: null },
  webVitals: NO_WEB_VITALS,
  trend: [],
});

/** The KPIs, Core Web Vitals and trends of one Overview, empty while it loads. */
function OverviewPanels({
  overview,
  percentile,
  onPercentileChange,
  isLoading,
  onTimeRangeSelect,
}: {
  overview: ApplicationOverview;
  /** The percentile asked for, which the panels name before its response arrives. */
  percentile: OverviewPercentile;
  onPercentileChange: (percentile: OverviewPercentile) => void;
  isLoading: boolean;
  onTimeRangeSelect: TimeRangeSelect;
}) {
  return (
    <>
      <OverviewKpis overview={overview} percentile={percentile} isLoading={isLoading} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="stretch">
        <EuiFlexItem grow={2}>
          <CoreWebVitalsPanel webVitals={overview.webVitals} isLoading={isLoading} />
        </EuiFlexItem>
        <EuiFlexItem grow={5}>
          <OverviewTrends
            points={overview.trend}
            pageLoads={overview.pageLoads.count}
            loadTimePercentileMs={overview.loadTime.percentileMs}
            percentile={percentile}
            onPercentileChange={onPercentileChange}
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
  filters,
  onSelectFilter,
}: {
  serviceName: string;
  usage: ApplicationData<ApplicationUsageResponse>;
  topErrors: ApplicationErrors;
  /** The Overview's filters, to show which rows are selected. */
  filters: OverviewFilters;
  /** Includes the value in a filter, or takes it off when it is included already. */
  onSelectFilter: (name: OverviewFilterName, value: string) => void;
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
            <TopPagesPanel
              pages={topPages}
              isLoading={isLoading}
              selectedUrls={(filters.pageUrl ?? [])
                .filter(({ exclude }) => !exclude)
                .map(({ value }) => value)}
              onSelectPage={(url) => onSelectFilter('pageUrl', url)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <BreakdownsPanel
              breakdowns={breakdowns}
              isLoading={isLoading}
              sessionsHref={sessionsHref}
              filters={filters}
              onSelectFilter={onSelectFilter}
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
 * users load and do and their top errors, over the selected environment, filters and time range.
 */
export function OtelOverview({ serviceName }: { serviceName: string }) {
  const { euiTheme } = useEuiTheme();
  const { setTimeRange } = useTimeRange();
  const { filters, setFilter, setFilters, clearFilters } = useOverviewFilters();
  const { percentile, percentileParam, setPercentile } = useOverviewPercentile();
  const searchParams = useOverviewSearchParams();
  const formatters = useFormatters();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  // Separate requests, so the KPIs never wait on the panels below and a failure replaces only its own.
  const overviewRequest = useMemo(
    () => overviewRequestOf(searchParams, percentileParam),
    [searchParams, percentileParam]
  );
  const usageRequest = useMemo(() => usageRequestOf(searchParams), [searchParams]);
  const overview = useApplicationData(serviceName, overviewRequest);
  const usage = useApplicationData(serviceName, usageRequest);
  const topErrors = useApplicationErrors(serviceName);
  // The pickers swap their lists for a spinner while loading, so they only load until they have one.
  const pickerOptions = usePickerOptions(serviceName, overview.response);

  const selectFilterValue = (name: OverviewFilterName, value: string) =>
    setFilter(name, toggleFilterValue(filters[name] ?? [], value, false));

  const refreshAll = () => {
    overview.refresh();
    usage.refresh();
    topErrors.refresh();
  };

  return (
    <>
      <EuiSpacer size="m" />
      {/* The query, the filters and the date picker share a row, each as tall as the others. */}
      <OverviewToolbar
        environments={pickerOptions?.environments}
        filterOptions={pickerOptions?.filters}
        filters={filters}
        setFilter={setFilter}
        onOpenAllFilters={() => setIsFlyoutOpen(true)}
        isLoading={overview.isLoading}
        onRefresh={refreshAll}
        formatters={formatters}
      />
      {/* As tall as a row of pills even with none, so picking the first value moves nothing below. */}
      <div css={{ marginBlockStart: euiTheme.size.s, minBlockSize: euiTheme.size.l }}>
        <OverviewFilterPills filters={filters} setFilter={setFilter} onClear={clearFilters} />
      </div>
      {isFlyoutOpen && (
        <AllFiltersFlyout
          options={pickerOptions?.filters}
          filters={filters}
          formatters={formatters}
          onApply={setFilters}
          onClose={() => setIsFlyoutOpen(false)}
        />
      )}
      {PAGE_FILTER_NAMES.some((name) => (filters[name] ?? []).length > 0) && (
        <>
          <EuiSpacer size="s" />
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="digitalExperienceOverviewPageFilterNote"
          >
            {PAGE_FILTER_NOTE}
          </EuiText>
        </>
      )}
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
          overview={overview.response?.overview ?? emptyOverview(serviceName, percentile)}
          percentile={percentile}
          onPercentileChange={setPercentile}
          isLoading={overview.isLoading}
          onTimeRangeSelect={setTimeRange}
        />
      )}
      <EuiSpacer size="m" />
      <UsageAndErrorsPanels
        serviceName={serviceName}
        usage={usage}
        topErrors={topErrors}
        filters={filters}
        onSelectFilter={selectFilterValue}
      />
    </>
  );
}
