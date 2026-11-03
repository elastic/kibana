/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHighlight,
  EuiInMemoryTable,
  EuiLink,
  EuiPageSection,
  EuiSpacer,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { useAbortableAsync } from '@kbn/react-hooks';
import { APPLICATION_SOURCE } from '../../../common/application_source';
import type {
  ApplicationSource,
  PageLoadsOverTime,
  VitalRatings,
} from '../../../common/types/applications';
import type { CoreWebVital, VitalRating } from '../../../common/core_web_vitals';
import { CORE_WEB_VITAL, getVitalRating } from '../../../common/core_web_vitals';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../../common/feature';
import { ApplicationsSummaryPanel } from './components/applications_summary_panel';
import { ColumnSelector } from './components/column_selector';
import { PageLoadsChart } from './components/page_loads_chart';
import { SourceFilter } from './components/source_filter';
import { EnvironmentFilter } from '../../components/environment_filter';
import { LoadErrorPrompt } from '../../components/load_error_prompt';
import { TimeRangePicker } from '../../components/time_range_picker';
import {
  APPLICATIONS_LIST_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../ebt_constants';
import { useApiClient } from '../../hooks/use_api_client';
import { useDigitalExperienceRouter } from '../../hooks/use_digital_experience_router';
import { useEnvironment } from '../../hooks/use_environment';
import { useListQuery } from '../../hooks/use_list_query';
import { useSourceFilter } from '../../hooks/use_source_filter';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import type { Formatters } from '../../hooks/use_formatters';
import { useFormatters } from '../../hooks/use_formatters';
import { useTimeRange } from '../../hooks/use_time_range';
import { useVisibleColumns } from './hooks/use_visible_columns';
import { APPLICATIONS_LABEL, SOURCE_LABELS } from '../../labels';
import type { ApplicationRow } from './utils/filter_applications';
import { applicationsMatching, filterApplications } from './utils/filter_applications';
import { pageLoadsOfSources, summarizeApplications } from './utils/summarize_applications';
import { formatDurationMs } from '../../utils/format_duration';
import { toTimeRangeQuery } from '../../utils/time_range_query';
import {
  applicationColumnPreset,
  metricColumnPreset,
  timeColumnPreset,
} from './utils/column_presets';

export const EDOT_BROWSER_DOCS_URL =
  'https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser';

// Long names shrink and truncate; the badges keep their size.
const nameCss = css({ minWidth: 0 });

const RATING_COLORS: Record<VitalRating, 'success' | 'warning' | 'danger'> = {
  good: 'success',
  needsImprovement: 'warning',
  poor: 'danger',
};

const VITAL_FORMATTERS: Record<CoreWebVital, (value: number) => string> = {
  lcp: formatDurationMs,
  inp: formatDurationMs,
  cls: (value) => value.toFixed(3),
  fcp: formatDurationMs,
  ttfb: formatDurationMs,
};

/** In display order. */
const VITAL_RATINGS: VitalRating[] = ['good', 'needsImprovement', 'poor'];

const RATING_LABELS: Record<VitalRating, string> = {
  good: i18n.translate('xpack.digitalExperience.applications.rating.good', {
    defaultMessage: 'Good',
  }),
  needsImprovement: i18n.translate('xpack.digitalExperience.applications.rating.needsImprovement', {
    defaultMessage: 'Needs improvement',
  }),
  poor: i18n.translate('xpack.digitalExperience.applications.rating.poor', {
    defaultMessage: 'Poor',
  }),
};

const vitalTooltip = (
  sampleCount: number,
  ratings: VitalRatings | null,
  { formatPercent }: Formatters
) => (
  <>
    <p>
      {i18n.translate('xpack.digitalExperience.applications.vitalSamples', {
        defaultMessage:
          '75th percentile of {sampleCount, plural, one {# sample} other {# samples}}',
        values: { sampleCount },
      })}
    </p>
    {ratings && (
      <EuiFlexGroup
        data-test-subj="digitalExperienceVitalRatings"
        direction="column"
        gutterSize="xs"
        responsive={false}
      >
        {VITAL_RATINGS.map((rating) => (
          <EuiFlexGroup
            key={rating}
            justifyContent="spaceBetween"
            gutterSize="l"
            responsive={false}
          >
            <EuiHealth color={RATING_COLORS[rating]}>{RATING_LABELS[rating]}</EuiHealth>
            <span>{formatPercent(ratings[rating])}</span>
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
    )}
  </>
);

const renderVital =
  (vital: CoreWebVital, formatters: Formatters) =>
  (value: number | null, { webVitals }: ApplicationRow) => {
    if (value === null) {
      return <EmptyCellValue />;
    }
    const { sampleCount, ratings } = webVitals[vital];
    const rating = getVitalRating(vital, value);
    return (
      <EuiToolTip content={vitalTooltip(sampleCount, ratings, formatters)}>
        <EuiTextColor
          tabIndex={0}
          data-test-subj={`digitalExperienceVital-${vital}`}
          data-rating={rating}
          data-sample-count={sampleCount}
          color={RATING_COLORS[rating]}
        >
          {VITAL_FORMATTERS[vital](value)}
        </EuiTextColor>
      </EuiToolTip>
    );
  };

const renderFailedHttp =
  ({ formatPercent }: Formatters) =>
  (ratio: number | null, { httpRequests }: ApplicationRow) => {
    if (ratio === null) {
      return <EmptyCellValue />;
    }
    const { failedCount, count } = httpRequests;
    return (
      <EuiToolTip
        content={i18n.translate('xpack.digitalExperience.applications.failedHttpRequests', {
          defaultMessage: '{failedCount} of {count, plural, one {# request} other {# requests}}',
          values: { failedCount, count },
        })}
      >
        <span tabIndex={0} data-test-subj="digitalExperienceFailedHttp">
          {formatPercent(ratio)}
        </span>
      </EuiToolTip>
    );
  };

const renderCount =
  ({ formatNumber }: Formatters) =>
  (count: number) =>
    formatNumber(count);

const renderErrorRate = (perPageLoad: number | null) =>
  perPageLoad === null ? <EmptyCellValue /> : perPageLoad.toFixed(2);

const renderLastSeen =
  ({ formatDate }: Formatters) =>
  (lastSeen: string | null) =>
    lastSeen === null ? (
      <EmptyCellValue />
    ) : (
      <EuiToolTip content={formatDate(lastSeen)}>
        <span tabIndex={0} data-test-subj="digitalExperienceLastSeen">
          <FormattedRelative value={new Date(lastSeen)} />
        </span>
      </EuiToolTip>
    );

const CLASSIC_DATA_BADGE = i18n.translate('xpack.digitalExperience.applications.classicDataBadge', {
  defaultMessage: '+ Classic RUM',
});

const CLASSIC_DATA_HINT = i18n.translate('xpack.digitalExperience.applications.classicDataHint', {
  defaultMessage: 'Classic RUM data also exists for this application. Select to show it.',
});

const getRowId = ({ serviceName, source }: ApplicationRow) => `${source}:${serviceName}`;

const APPLICATION_COLUMN = i18n.translate(
  'xpack.digitalExperience.applications.applicationColumn',
  { defaultMessage: 'Application' }
);

const PAGE_LOADS_COLUMN = i18n.translate('xpack.digitalExperience.applications.pageLoadsColumn', {
  defaultMessage: 'Page loads',
});

const LCP_COLUMN = i18n.translate('xpack.digitalExperience.applications.lcpColumn', {
  defaultMessage: 'LCP (p75)',
});

const INP_COLUMN = i18n.translate('xpack.digitalExperience.applications.inpColumn', {
  defaultMessage: 'INP (p75)',
});

const CLS_COLUMN = i18n.translate('xpack.digitalExperience.applications.clsColumn', {
  defaultMessage: 'CLS (p75)',
});

const FCP_COLUMN = i18n.translate('xpack.digitalExperience.applications.fcpColumn', {
  defaultMessage: 'FCP (p75)',
});

const TTFB_COLUMN = i18n.translate('xpack.digitalExperience.applications.ttfbColumn', {
  defaultMessage: 'TTFB (p75)',
});

const ERROR_RATE_COLUMN = i18n.translate('xpack.digitalExperience.applications.errorRateColumn', {
  defaultMessage: 'Error rate',
});

const ERROR_RATE_DESCRIPTION = i18n.translate(
  'xpack.digitalExperience.applications.errorRateDescription',
  { defaultMessage: 'JS errors per page load' }
);

const LAST_SEEN_COLUMN = i18n.translate('xpack.digitalExperience.applications.lastSeenColumn', {
  defaultMessage: 'Last seen',
});

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.digitalExperience.applications.searchPlaceholder',
  { defaultMessage: 'Search applications' }
);

const NO_MATCHES_MESSAGE = i18n.translate('xpack.digitalExperience.applications.noMatches', {
  defaultMessage: 'No applications match the search or the source.',
});

const JS_ERRORS_COLUMN = i18n.translate('xpack.digitalExperience.applications.jsErrorsColumn', {
  defaultMessage: 'JS errors',
});

const FAILED_HTTP_COLUMN = i18n.translate('xpack.digitalExperience.applications.failedHttpColumn', {
  defaultMessage: 'Failed HTTP',
});

const LOADING_MESSAGE = i18n.translate('xpack.digitalExperience.applications.loading', {
  defaultMessage: 'Loading applications…',
});

const noApplicationsPrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceApplicationsEmpty"
    iconType="package"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.applications.empty.title', {
          defaultMessage: 'No applications found',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.digitalExperience.applications.empty.body', {
          defaultMessage:
            'There are no monitored applications for the selected time range. Try a wider time range or instrument an application.',
        })}
      </p>
    }
    actions={
      <EuiLink
        data-test-subj="digitalExperienceApplicationsDocsLink"
        {...getEbtProps({
          action: EBT_CLICK_ACTIONS.ADD_DATA,
          element: APPLICATIONS_LIST_EBT_ELEMENTS.DOCS_LINK,
        })}
        href={EDOT_BROWSER_DOCS_URL}
        target="_blank"
        external
      >
        {i18n.translate('xpack.digitalExperience.applications.empty.docsLink', {
          defaultMessage: 'Instrument an application with EDOT Browser',
        })}
      </EuiLink>
    }
  />
);

const NoApplicationsInEnvironmentPrompt = ({
  onShowAllEnvironments,
}: {
  onShowAllEnvironments: () => void;
}) => (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceApplicationsEmptyInEnvironment"
    iconType="filter"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.applications.emptyInEnvironment.title', {
          defaultMessage: 'No applications in this environment',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.digitalExperience.applications.emptyInEnvironment.body', {
          defaultMessage:
            'There are no monitored applications in the selected environment for this time range.',
        })}
      </p>
    }
    actions={
      <EuiButton
        data-test-subj="digitalExperienceShowAllEnvironments"
        {...getEbtProps({
          action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
          element: APPLICATIONS_LIST_EBT_ELEMENTS.SHOW_ALL_ENVIRONMENTS,
        })}
        onClick={onShowAllEnvironments}
      >
        {i18n.translate('xpack.digitalExperience.applications.emptyInEnvironment.showAll', {
          defaultMessage: 'Show all environments',
        })}
      </EuiButton>
    }
  />
);

const UnavailableSourcesCallOut = ({ sources }: { sources: ApplicationSource[] }) => (
  <KbnWarningCallout
    data-test-subj="digitalExperienceUnavailableSources"
    size="s"
    title={i18n.translate('xpack.digitalExperience.applications.unavailableSources', {
      defaultMessage:
        "Could not load the {sources} data, so it's missing from the applications, totals and chart.",
      values: { sources: sources.map((source) => SOURCE_LABELS[source]).join(', ') },
    })}
  />
);

const FETCH_ERROR_TITLE = i18n.translate('xpack.digitalExperience.applications.fetchError', {
  defaultMessage: 'Could not load the applications',
});

const SORT_BY_PAGE_LOADS = { sort: { field: 'pageLoads.count', direction: 'desc' } } as const;

type OptionalColumnId =
  | 'errorRate'
  | 'lcp'
  | 'inp'
  | 'cls'
  | 'fcp'
  | 'ttfb'
  | 'jsErrors'
  | 'failedHttp'
  | 'lastSeen';

/**
 * The columns the user can hide, in display order; the application and its page loads, which the
 * table is sorted by, are always shown.
 */
const OPTIONAL_COLUMNS: Array<{ id: OptionalColumnId; label: string }> = [
  { id: 'errorRate', label: ERROR_RATE_COLUMN },
  { id: 'lcp', label: LCP_COLUMN },
  { id: 'inp', label: INP_COLUMN },
  { id: 'cls', label: CLS_COLUMN },
  { id: 'fcp', label: FCP_COLUMN },
  { id: 'ttfb', label: TTFB_COLUMN },
  { id: 'jsErrors', label: JS_ERRORS_COLUMN },
  { id: 'failedHttp', label: FAILED_HTTP_COLUMN },
  { id: 'lastSeen', label: LAST_SEEN_COLUMN },
];

const OPTIONAL_COLUMN_IDS = OPTIONAL_COLUMNS.map(({ id }) => id);

const HIDDEN_BY_DEFAULT: OptionalColumnId[] = ['fcp', 'ttfb', 'jsErrors'];

const HIDDEN_COLUMNS_STORAGE_KEY = 'xpack.digitalExperience.applications.hiddenColumns';

const NO_PAGE_LOADS: PageLoadsOverTime = { otel: [], classic: [] };

export function ApplicationsListPage() {
  const { application, ux } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  const { timeRange, setTimeRange } = useTimeRange();
  const formatters = useFormatters();
  const { environment, setEnvironment } = useEnvironment();
  const { sourceFilter, setSourceFilter } = useSourceFilter();
  const listQuery = useListQuery();
  const [search, setSearch] = useState('');
  const searchTerm = search.trim();

  const apiClient = useApiClient();

  const {
    value: response,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) =>
      apiClient.fetch('GET /internal/digital_experience/applications', {
        signal,
        params: { query: toTimeRangeQuery(timeRange, environment) },
      }),
    [apiClient, timeRange, environment],
    { unsetValueOnError: true }
  );
  // Nothing has been fetched before the first request starts.
  const isLoading = loading || (!response && !error);

  // Serverless has no ux plugin and no Classic RUM data; known on the first render, so the filter
  // row doesn't change once the data loads.
  const canFilterBySource = ux !== undefined;
  // A source in the URL is ignored where the filter isn't shown, so it can't hide every row.
  const selectedSource = canFilterBySource ? sourceFilter : undefined;

  const items = useMemo(
    () =>
      filterApplications({
        applications: response?.applications ?? [],
        source: selectedSource,
        search,
      }),
    [response, selectedSource, search]
  );

  // The summary and the chart cover the same rows: every source's, without the search, which only
  // narrows the table.
  const summary = useMemo(
    () =>
      summarizeApplications(
        applicationsMatching({
          applications: response?.applications ?? [],
          source: selectedSource,
          search: '',
        })
      ),
    [response, selectedSource]
  );
  const pageLoadsOverTime = useMemo(
    () => pageLoadsOfSources(response?.pageLoadsOverTime ?? NO_PAGE_LOADS, selectedSource),
    [response, selectedSource]
  );
  const unavailableSources = response?.unavailableSources ?? [];

  const { visibleColumns, setVisibleColumns } = useVisibleColumns({
    storageKey: HIDDEN_COLUMNS_STORAGE_KEY,
    columnIds: OPTIONAL_COLUMN_IDS,
    hiddenByDefault: HIDDEN_BY_DEFAULT,
  });

  const getNoItemsMessage = () => {
    if (isLoading) {
      return LOADING_MESSAGE;
    }
    if (error) {
      return (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceApplicationsError"
          retryDataTestSubj="digitalExperienceApplicationsRetry"
          retryEbtElement={APPLICATIONS_LIST_EBT_ELEMENTS.RETRY}
          title={FETCH_ERROR_TITLE}
          error={error}
          onRetry={refresh}
        />
      );
    }
    if (response?.applications.length) {
      return NO_MATCHES_MESSAGE;
    }
    if (environment) {
      return (
        <NoApplicationsInEnvironmentPrompt
          onShowAllEnvironments={() => setEnvironment(undefined)}
        />
      );
    }
    return noApplicationsPrompt;
  };

  const columns = useMemo<Array<EuiBasicTableColumn<ApplicationRow>>>(() => {
    const applicationColumn: EuiBasicTableColumn<ApplicationRow> = {
      field: 'serviceName',
      name: APPLICATION_COLUMN,
      ...applicationColumnPreset<ApplicationRow>(),
      sortable: true,
      render: (serviceName: string, { source, hasClassicData }: ApplicationRow) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={nameCss}>
            <EuiLink
              data-test-subj="digitalExperienceApplicationLink"
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.VIEW_SERVICE,
                element: APPLICATIONS_LIST_EBT_ELEMENTS.APPLICATION_LINK,
              })}
              className="eui-textTruncate"
              href={application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, {
                path: router.link('/{serviceName}', {
                  path: { serviceName },
                  // The list's filters too, so its breadcrumb leads back to the same list.
                  query: { ...listQuery, source },
                }),
              })}
            >
              <EuiHighlight search={searchTerm}>{serviceName}</EuiHighlight>
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge data-test-subj="digitalExperienceApplicationSource" color="hollow">
              {SOURCE_LABELS[source]}
            </EuiBadge>
          </EuiFlexItem>
          {hasClassicData && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={CLASSIC_DATA_HINT}>
                <EuiBadge
                  data-test-subj="digitalExperienceClassicDataHint"
                  // Shows the Classic RUM row: it filters the list, it doesn't open the application.
                  {...getEbtProps({
                    action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
                    element: APPLICATIONS_LIST_EBT_ELEMENTS.CLASSIC_DATA_HINT,
                  })}
                  color="hollow"
                  onClick={() => setSourceFilter(APPLICATION_SOURCE.classic)}
                  onClickAriaLabel={CLASSIC_DATA_HINT}
                >
                  {CLASSIC_DATA_BADGE}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    };

    const pageLoadsColumn: EuiBasicTableColumn<ApplicationRow> = {
      field: 'pageLoads.count',
      name: PAGE_LOADS_COLUMN,
      dataType: 'number',
      sortable: true,
      ...metricColumnPreset<ApplicationRow>(),
      render: renderCount(formatters),
    };

    const optionalColumns: Record<OptionalColumnId, EuiBasicTableColumn<ApplicationRow>> = {
      errorRate: {
        field: 'jsErrors.perPageLoad',
        name: ERROR_RATE_COLUMN,
        nameTooltip: { content: ERROR_RATE_DESCRIPTION },
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderErrorRate,
      },
      lcp: {
        field: 'webVitals.lcp.p75Ms',
        name: LCP_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.lcp, formatters),
      },
      inp: {
        field: 'webVitals.inp.p75Ms',
        name: INP_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.inp, formatters),
      },
      cls: {
        field: 'webVitals.cls.p75',
        name: CLS_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.cls, formatters),
      },
      fcp: {
        field: 'webVitals.fcp.p75Ms',
        name: FCP_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.fcp, formatters),
      },
      ttfb: {
        field: 'webVitals.ttfb.p75Ms',
        name: TTFB_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.ttfb, formatters),
      },
      jsErrors: {
        field: 'jsErrors.count',
        name: JS_ERRORS_COLUMN,
        dataType: 'number',
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderCount(formatters),
      },
      failedHttp: {
        field: 'httpRequests.failedRatio',
        name: FAILED_HTTP_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderFailedHttp(formatters),
      },
      lastSeen: {
        field: 'lastSeen',
        name: LAST_SEEN_COLUMN,
        ...timeColumnPreset<ApplicationRow>(),
        sortable: true,
        render: renderLastSeen(formatters),
      },
    };

    return [
      applicationColumn,
      pageLoadsColumn,
      ...OPTIONAL_COLUMN_IDS.filter((id) => visibleColumns.has(id)).map(
        (id) => optionalColumns[id]
      ),
    ];
  }, [application, router, listQuery, setSourceFilter, visibleColumns, searchTerm, formatters]);

  return (
    <>
      <AppHeader title={APPLICATIONS_LABEL} />
      <EuiPageSection paddingSize="m" restrictWidth={false}>
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <TimeRangePicker onRefresh={refresh} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {unavailableSources.length > 0 && (
          <>
            <UnavailableSourcesCallOut sources={unavailableSources} />
            <EuiSpacer size="m" />
          </>
        )}
        <ApplicationsSummaryPanel summary={summary} isLoading={isLoading} />
        <EuiSpacer size="m" />
        <PageLoadsChart
          points={pageLoadsOverTime}
          isLoading={isLoading}
          onTimeRangeSelect={setTimeRange}
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <EnvironmentFilter
                environments={response?.environments ?? []}
                selected={environment}
                onChange={setEnvironment}
                isLoading={isLoading}
              />
              {canFilterBySource && (
                <SourceFilter selected={sourceFilter} onChange={setSourceFilter} />
              )}
            </EuiFilterGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              data-test-subj="digitalExperienceApplicationsSearch"
              placeholder={SEARCH_PLACEHOLDER}
              aria-label={SEARCH_PLACEHOLDER}
              value={search}
              onChange={({ target: { value } }) => setSearch(value)}
              isClearable
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ColumnSelector
              columns={OPTIONAL_COLUMNS}
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiInMemoryTable<ApplicationRow>
          data-test-subj="digitalExperienceApplicationsTable"
          tableCaption={APPLICATIONS_LABEL}
          items={items}
          itemId={getRowId}
          columns={columns}
          // Many columns: they keep their width and the table scrolls sideways instead of squeezing.
          tableLayout="auto"
          scrollableInline
          stickyScrollbar
          pagination={true}
          sorting={SORT_BY_PAGE_LOADS}
          loading={isLoading}
          noItemsMessage={getNoItemsMessage()}
        />
      </EuiPageSection>
    </>
  );
}
