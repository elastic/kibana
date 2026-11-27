/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
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
import type {
  ApplicationOverview,
  ApplicationOverviewKpisResponse,
  ApplicationOverviewResponse,
} from '../../../../common/types/overview';
import type { HistogramBuckets } from '../../../../common/types/applications';
import type { ApplicationUsageResponse } from '../../../../common/types/usage';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { APPLICATION_OVERVIEW_EBT_ELEMENTS, ERRORS_EBT_ELEMENTS } from '../../../ebt_constants';
import type { ApplicationData, ApplicationRequest } from '../../../hooks/use_application_data';
import { useApplicationData } from '../../../hooks/use_application_data';
import { useApplicationLinks } from '../../../hooks/use_application_links';
import { useFormatters } from '../../../hooks/use_formatters';
import { useOverviewFilters } from '../../../hooks/use_overview_filters';
import { useOverviewPercentile, useOverviewSearchParams } from '../../../hooks/use_overview_search';
import { useQueryParam } from '../../../hooks/use_query_param';
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
import { FrustrationPanel } from './components/frustration_panel';
import { OverviewFilterPills } from './components/overview_filters';
import { OverviewKpis } from './components/overview_kpis';
import { OverviewToolbar } from './components/overview_toolbar';
import { OverviewTrends } from './components/overview_trends';
import { TopClicksPanel } from './components/top_clicks_panel';
import { TopPagesPanel } from './components/top_pages_panel';
import { VitalsTrendPanel } from './components/vitals_trend_panel';
import { usePickerOptions } from './hooks/use_picker_options';
import { EMPTY_USAGE, usageRequestOf } from './utils/usage_request';

const FETCH_ERROR_TITLE = i18n.translate('xpack.digitalExperience.overview.fetchErrorTitle', {
  defaultMessage: 'Could not load the Overview',
});

const KPIS_FETCH_ERROR_TITLE = i18n.translate(
  'xpack.digitalExperience.overview.kpisFetchErrorTitle',
  { defaultMessage: 'Could not load the KPIs' }
);

const USAGE_FETCH_ERROR_TITLE = i18n.translate(
  'xpack.digitalExperience.overview.usageFetchErrorTitle',
  { defaultMessage: 'Could not load the pages, browsers and clicks' }
);

/**
 * The least width of the panels that share a row, which then stack: measured in the page, not in
 * the window, so a flyout beside the page does not leave them overflowing.
 */
const SIDE_PANEL_CSS = { minInlineSize: 320 };
const WIDE_PANEL_CSS = { minInlineSize: 400 };

/** The most frequent error groups on the Overview; the Errors tab lists the rest. */
const TOP_ERRORS_ROWS = 5;

/** The request for the Overview narrowed by `searchParams`; a change of them is a new request. */
const overviewRequestOf = (
  searchParams: OverviewSearchParams,
  percentile: OverviewPercentileParam | undefined,
  timeZone: string
): ApplicationRequest<ApplicationOverviewResponse> => {
  return (apiClient, options) => {
    return apiClient.fetch(
      'GET /internal/digital_experience/applications/{serviceName}/overview',
      withOverviewFilters(options, searchParams, { percentile, timeZone })
    );
  };
};

/** The request for the KPI row, against the previous period, narrowed by `searchParams`. */
const kpisRequestOf = (
  searchParams: OverviewSearchParams,
  percentile: OverviewPercentileParam | undefined
): ApplicationRequest<ApplicationOverviewKpisResponse> => {
  return (apiClient, options) => {
    return apiClient.fetch(
      'GET /internal/digital_experience/applications/{serviceName}/overview/kpis',
      withOverviewFilters(options, searchParams, { percentile })
    );
  };
};

/** Shown while loading: no metric is a measured zero. */
const emptyOverview = (
  serviceName: string,
  percentile: OverviewPercentile
): Omit<ApplicationOverview, 'trendHistogram'> => ({
  serviceName,
  percentile,
  pageLoads: { count: 0 },
  loadTime: { percentileMs: null },
  webVitals: NO_WEB_VITALS,
  trend: [],
});

/** The Core Web Vitals and trends of one Overview, empty while it loads. */
function OverviewPanels({
  overview,
  trendHistogram,
  percentile,
  onPercentileChange,
  isLoading,
  onTimeRangeSelect,
}: {
  overview: Omit<ApplicationOverview, 'trendHistogram'>;
  /** `undefined` until the first response. */
  trendHistogram: HistogramBuckets | undefined;
  /** The percentile asked for, which the panels name before its response arrives. */
  percentile: OverviewPercentile;
  onPercentileChange: (percentile: OverviewPercentile) => void;
  isLoading: boolean;
  onTimeRangeSelect: TimeRangeSelect;
}) {
  return (
    <>
      {/* Side by side while the page is wide enough, whatever the window: a flyout beside it narrows it. */}
      <EuiFlexGroup gutterSize="m" alignItems="stretch" wrap>
        <EuiFlexItem grow={2} css={SIDE_PANEL_CSS}>
          <CoreWebVitalsPanel webVitals={overview.webVitals} isLoading={isLoading} />
        </EuiFlexItem>
        <EuiFlexItem grow={5} css={WIDE_PANEL_CSS}>
          <OverviewTrends
            points={overview.trend}
            histogram={trendHistogram}
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
  const { errorsHref, frustrationHref, sessionsHref } = useApplicationLinks(
    serviceName,
    APPLICATION_SOURCE.otel
  );
  const {
    topPages,
    breakdowns,
    topClicks,
    totalClicks,
    frustration,
    frustratedElements,
    frustratedPages,
  } = response ?? EMPTY_USAGE;

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
        // Full width each: the pages have a column per metric, and the breakdowns one per list.
        <>
          <TopPagesPanel
            pages={topPages}
            isLoading={isLoading}
            selectedUrls={(filters.pageUrl ?? [])
              .filter(({ exclude }) => !exclude)
              .map(({ value }) => value)}
            onSelectPage={(url) => onSelectFilter('pageUrl', url)}
          />
          <EuiSpacer size="m" />
          <BreakdownsPanel
            breakdowns={breakdowns}
            isLoading={isLoading}
            sessionsHref={sessionsHref}
            filters={filters}
            onSelectFilter={onSelectFilter}
          />
        </>
      )}
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="stretch" wrap>
        <EuiFlexItem grow={3} css={WIDE_PANEL_CSS}>
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
          <EuiFlexItem grow={2} css={SIDE_PANEL_CSS}>
            <TopClicksPanel clicks={topClicks} totalClicks={totalClicks} isLoading={isLoading} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {!error && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" alignItems="stretch">
            <EuiFlexItem css={{ minInlineSize: 0 }}>
              <FrustrationPanel
                frustration={frustration}
                frustratedElements={frustratedElements}
                frustratedPages={frustratedPages}
                isLoading={isLoading}
                sessionsHref={sessionsHref}
                dashboardHref={frustrationHref}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
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
  // Refresh reloads the Lens chart through this, as its range doesn't change for a relative one.
  const [lastReloadRequestTime, setLastReloadRequestTime] = useState<number>();
  // In the URL, so a reload or Share keeps it; the application page's header toggles it.
  const { value: compare } = useQueryParam('compare');
  // Separate requests, so the KPIs never wait on the panels below and a failure replaces only its own.
  const overviewRequest = useMemo(
    () => overviewRequestOf(searchParams, percentileParam, formatters.timeZone),
    [searchParams, percentileParam, formatters.timeZone]
  );
  const kpisRequest = useMemo(
    () => kpisRequestOf(searchParams, percentileParam),
    [searchParams, percentileParam]
  );
  const usageRequest = useMemo(() => usageRequestOf(searchParams), [searchParams]);
  const overview = useApplicationData(serviceName, overviewRequest);
  const kpis = useApplicationData(serviceName, kpisRequest);
  const usage = useApplicationData(serviceName, usageRequest);
  const topErrors = useApplicationErrors(serviceName);
  // The pickers swap their lists for a spinner while loading, so they only load until they have one.
  const pickerOptions = usePickerOptions(serviceName, overview.response);

  const selectFilterValue = (name: OverviewFilterName, value: string) =>
    setFilter(name, toggleFilterValue(filters[name] ?? [], value, false));

  const refreshAll = () => {
    setLastReloadRequestTime(Date.now());
    overview.refresh();
    kpis.refresh();
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
      {/* With no pills it leaves as much room below the toolbar as there is above it. */}
      <div css={{ marginBlockStart: euiTheme.size.s, minBlockSize: euiTheme.size.s }}>
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
      <EuiSpacer size="m" />
      {/* Its own request, so a failure replaces only the row and the panels below keep loading. */}
      {kpis.error ? (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceOverviewKpisError"
          retryDataTestSubj="digitalExperienceOverviewKpisRetry"
          retryEbtElement={APPLICATION_OVERVIEW_EBT_ELEMENTS.KPIS_RETRY}
          title={KPIS_FETCH_ERROR_TITLE}
          error={kpis.error}
          onRetry={kpis.refresh}
        />
      ) : (
        <OverviewKpis
          kpis={kpis.isLoading ? undefined : kpis.response}
          percentile={percentile}
          isComparing={compare === 'true'}
          isLoading={kpis.isLoading}
        />
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
          trendHistogram={overview.response?.overview.trendHistogram}
          percentile={percentile}
          onPercentileChange={setPercentile}
          isLoading={overview.isLoading}
          onTimeRangeSelect={setTimeRange}
        />
      )}
      {/* Its own Lens query, so it loads, fails and refreshes apart from the Overview's request. */}
      <VitalsTrendPanel serviceName={serviceName} lastReloadRequestTime={lastReloadRequestTime} />
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
