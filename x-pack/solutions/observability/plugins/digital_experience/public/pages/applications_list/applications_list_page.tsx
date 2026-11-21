/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiNotificationBadge,
  EuiPageSection,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { useAbortableAsync } from '@kbn/react-hooks';
import { APPLICATION_SOURCE, APPLICATION_TYPE } from '../../../common/application_source';
import { APPLICATION_TYPES } from '../../../common/types/applications';
import type {
  ApplicationSource,
  ApplicationType,
  PageLoadsOverTime,
} from '../../../common/types/applications';
import { ColumnSelector } from '../../components/column_selector';
import { EnvironmentFilter } from '../../components/environment_filter';
import { LoadErrorPrompt } from '../../components/load_error_prompt';
import { MobileOnboardingPrompt } from '../../components/mobile_onboarding_prompt';
import { TimeRangePicker } from '../../components/time_range_picker';
import {
  APPLICATIONS_LIST_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../ebt_constants';
import { useApiClient } from '../../hooks/use_api_client';
import { useApplicationType } from '../../hooks/use_application_type';
import { useEnvironment } from '../../hooks/use_environment';
import { useFormatters } from '../../hooks/use_formatters';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { usePlatformFilter } from '../../hooks/use_platform_filter';
import { useSourceFilter } from '../../hooks/use_source_filter';
import { useTimeRange } from '../../hooks/use_time_range';
import { APPLICATIONS_LABEL } from '../../labels';
import { EDOT_BROWSER_DOCS_URL } from '../../utils/doc_links';
import { toTimeRangeQuery } from '../../utils/time_range_query';
import { MobileApplicationsTable } from './mobile/mobile_applications_table';
import { MobileAvailabilityCallOut } from './mobile/mobile_availability_callout';
import { PlatformFilter } from './mobile/platform_filter';
import {
  applicationsMatching,
  filterApplications,
  isMobileApplication,
  isWebApplication,
  mobileApplicationsMatching,
} from './utils/filter_applications';
import {
  pageLoadsOfSources,
  sessionsOfSource,
  summarizeApplications,
} from './utils/summarize_applications';
import { ApplicationsSummaryPanel } from './web/applications_summary_panel';
import { PageLoadsChart } from './web/page_loads_chart';
import { SourceFilter } from './web/source_filter';
import {
  PartiallyAvailableSourcesCallOut,
  UnavailableSourcesCallOut,
} from './web/sources_callouts';
import { useWebVisibleColumns, WebApplicationsTable } from './web/web_applications_table';

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.digitalExperience.applications.searchPlaceholder',
  { defaultMessage: 'Search applications' }
);

const NO_MATCHES_MESSAGE = i18n.translate('xpack.digitalExperience.applications.noMatches', {
  defaultMessage: 'No applications match the search or the source.',
});

const NO_MOBILE_MATCHES_MESSAGE = i18n.translate(
  'xpack.digitalExperience.applications.mobile.noMatches',
  { defaultMessage: 'No mobile applications match the search or the platform.' }
);

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

const MOBILE_UNAVAILABLE_TITLE = i18n.translate(
  'xpack.digitalExperience.applications.mobileUnavailable.title',
  { defaultMessage: 'Could not load the mobile applications' }
);

const MOBILE_UNAVAILABLE_ERROR = new Error(
  i18n.translate('xpack.digitalExperience.applications.mobileUnavailable.body', {
    defaultMessage: 'The other applications loaded, but the mobile data could not be read.',
  })
);

const WEB_UNAVAILABLE_TITLE = i18n.translate(
  'xpack.digitalExperience.applications.webUnavailable.title',
  { defaultMessage: 'Could not load the web applications' }
);

const WEB_UNAVAILABLE_ERROR = new Error(
  i18n.translate('xpack.digitalExperience.applications.webUnavailable.body', {
    defaultMessage: 'The web application data could not be read from every source.',
  })
);

const NO_MOBILE_APPLICATIONS_TITLE = i18n.translate(
  'xpack.digitalExperience.applications.mobileEmpty.title',
  { defaultMessage: 'No mobile applications found' }
);

const NO_MOBILE_APPLICATIONS_BODY = i18n.translate(
  'xpack.digitalExperience.applications.mobileEmpty.body',
  {
    defaultMessage:
      'There is no EDOT Android or EDOT iOS data for the selected time range. Try a wider time range or instrument a mobile application.',
  }
);

const FETCH_ERROR_TITLE = i18n.translate('xpack.digitalExperience.applications.fetchError', {
  defaultMessage: 'Could not load the applications',
});

const NO_PAGE_LOADS: Pick<PageLoadsOverTime, ApplicationSource> = { otel: [], classic: [] };

const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  web: i18n.translate('xpack.digitalExperience.applications.tab.web', { defaultMessage: 'Web' }),
  mobile: i18n.translate('xpack.digitalExperience.applications.tab.mobile', {
    defaultMessage: 'Mobile',
  }),
};

export function ApplicationsListPage() {
  const { ux } = useKibanaServices();
  const { timeRange, setTimeRange } = useTimeRange();
  const { timeZone } = useFormatters();
  const { environment, setEnvironment } = useEnvironment();
  const { sourceFilter, setSourceFilter } = useSourceFilter();
  const { platformFilter, setPlatformFilter } = usePlatformFilter();
  const { applicationType, setApplicationType } = useApplicationType();
  const [search, setSearch] = useState('');
  const searchTerm = search.trim();

  const apiClient = useApiClient();

  const {
    value: response,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) => {
      return apiClient.fetch('GET /internal/digital_experience/applications', {
        signal,
        params: { query: toTimeRangeQuery(timeRange, environment, timeZone) },
      });
    },
    [apiClient, timeRange, environment, timeZone],
    { unsetValueOnError: true }
  );
  // Nothing has been fetched before the first request starts.
  const isLoading = loading || (!response && !error);

  // Serverless has no ux plugin and no Classic RUM data; known on the first render, so the filter
  // row doesn't change once the data loads.
  const canFilterBySource = ux !== undefined;
  // A source in the URL is ignored where the filter isn't shown, so it can't hide every row.
  const selectedSource = canFilterBySource ? sourceFilter : undefined;
  const mobileAvailability = response?.mobileAvailability ?? 'complete';
  const hasWebApplications = response?.applications.some(isWebApplication) ?? false;
  const hasMobileApplications = response?.applications.some(isMobileApplication) ?? false;
  const unavailableSources = response?.unavailableSources ?? [];
  const hasWebFailures = unavailableSources.length > 0;
  // Web and mobile applications have their own tab, shown when both have data or a failed search,
  // so its warning and retry stay reachable, or when the URL picks one.
  const showsTabs =
    applicationType !== undefined ||
    ((hasWebApplications || hasWebFailures) &&
      (hasMobileApplications || mobileAvailability === 'unavailable'));
  const selectedType =
    applicationType ??
    (!hasWebApplications && !hasWebFailures && hasMobileApplications
      ? APPLICATION_TYPE.mobile
      : APPLICATION_TYPE.web);
  const isMobileTab = selectedType === APPLICATION_TYPE.mobile;

  const mobileItems = useMemo(
    () =>
      mobileApplicationsMatching({
        applications: response?.applications ?? [],
        search,
        platform: platformFilter,
      }),
    [response, platformFilter, search]
  );

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
  const pageLoadsOfResponse = response?.pageLoadsOverTime ?? NO_PAGE_LOADS;
  const pageLoadsOverTime = useMemo(
    () => pageLoadsOfSources(pageLoadsOfResponse, selectedSource),
    [pageLoadsOfResponse, selectedSource]
  );
  const sessionsOverTime = useMemo(
    () => sessionsOfSource(response?.sessionsOverTime ?? null, selectedSource),
    [response, selectedSource]
  );
  const partiallyAvailableSources = response?.partiallyAvailableSources ?? [];

  const { optionalColumns, visibleColumns, setVisibleColumns } = useWebVisibleColumns();
  const showClassicData = useCallback(
    () => setSourceFilter(APPLICATION_SOURCE.classic),
    [setSourceFilter]
  );

  const getLoadingOrErrorMessage = () => {
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
    return undefined;
  };

  const noApplicationsInEnvironmentPrompt = (
    <NoApplicationsInEnvironmentPrompt onShowAllEnvironments={() => setEnvironment(undefined)} />
  );

  /** Any web application means the filters hide it. */
  const getWebNoItemsMessage = () => {
    const loadingOrError = getLoadingOrErrorMessage();
    if (loadingOrError) {
      return loadingOrError;
    }
    if (hasWebApplications) {
      return NO_MATCHES_MESSAGE;
    }
    // A web search failed while the others loaded: a retry, not the setup docs.
    if (hasWebFailures) {
      return (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceWebApplicationsError"
          retryDataTestSubj="digitalExperienceWebApplicationsRetry"
          retryEbtElement={APPLICATIONS_LIST_EBT_ELEMENTS.RETRY}
          title={WEB_UNAVAILABLE_TITLE}
          error={WEB_UNAVAILABLE_ERROR}
          onRetry={refresh}
        />
      );
    }
    return environment ? noApplicationsInEnvironmentPrompt : noApplicationsPrompt;
  };

  /** Only mobile applications count: without them it links to the mobile setup docs. */
  const getMobileNoItemsMessage = () => {
    const loadingOrError = getLoadingOrErrorMessage();
    if (loadingOrError) {
      return loadingOrError;
    }
    // The mobile search failed while the others loaded: a retry, not the setup docs.
    if (mobileAvailability === 'unavailable') {
      return (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceMobileApplicationsError"
          retryDataTestSubj="digitalExperienceMobileApplicationsRetry"
          retryEbtElement={APPLICATIONS_LIST_EBT_ELEMENTS.RETRY}
          title={MOBILE_UNAVAILABLE_TITLE}
          error={MOBILE_UNAVAILABLE_ERROR}
          onRetry={refresh}
        />
      );
    }
    if (hasMobileApplications) {
      return NO_MOBILE_MATCHES_MESSAGE;
    }
    if (environment) {
      return noApplicationsInEnvironmentPrompt;
    }
    return (
      <MobileOnboardingPrompt
        data-test-subj="digitalExperienceMobileApplicationsEmpty"
        title={NO_MOBILE_APPLICATIONS_TITLE}
        body={NO_MOBILE_APPLICATIONS_BODY}
      />
    );
  };

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
        {showsTabs && (
          <>
            <EuiTabs data-test-subj="digitalExperienceApplicationTypeTabs">
              {APPLICATION_TYPES.map((type) => (
                <EuiTab
                  key={type}
                  data-test-subj={`digitalExperienceApplicationTypeTab-${type}`}
                  {...getEbtProps({
                    action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
                    element: APPLICATIONS_LIST_EBT_ELEMENTS.APPLICATION_TYPE_TAB,
                  })}
                  isSelected={type === selectedType}
                  onClick={() => setApplicationType(type)}
                  append={
                    <EuiNotificationBadge color="subdued">
                      {type === APPLICATION_TYPE.mobile ? mobileItems.length : items.length}
                    </EuiNotificationBadge>
                  }
                >
                  {APPLICATION_TYPE_LABELS[type]}
                </EuiTab>
              ))}
            </EuiTabs>
            <EuiSpacer size="m" />
          </>
        )}
        {!isMobileTab && unavailableSources.length > 0 && (
          <>
            <UnavailableSourcesCallOut sources={unavailableSources} />
            <EuiSpacer size="m" />
          </>
        )}
        {!isMobileTab && partiallyAvailableSources.length > 0 && (
          <>
            <PartiallyAvailableSourcesCallOut sources={partiallyAvailableSources} />
            <EuiSpacer size="m" />
          </>
        )}
        {isMobileTab && mobileAvailability !== 'complete' && (
          <>
            <MobileAvailabilityCallOut availability={mobileAvailability} />
            <EuiSpacer size="m" />
          </>
        )}
        {!isMobileTab && (
          <>
            <ApplicationsSummaryPanel summary={summary} isLoading={isLoading} />
            <EuiSpacer size="m" />
            <PageLoadsChart
              pageLoads={pageLoadsOverTime}
              sessions={sessionsOverTime}
              histogram={response?.pageLoadsOverTime.histogram}
              isLoading={isLoading}
              onTimeRangeSelect={setTimeRange}
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <EnvironmentFilter
                environments={response?.environments ?? []}
                selected={environment}
                onChange={setEnvironment}
                isLoading={isLoading}
              />
              {!isMobileTab && canFilterBySource && (
                <SourceFilter selected={sourceFilter} onChange={setSourceFilter} />
              )}
              {isMobileTab && (
                <PlatformFilter selected={platformFilter} onChange={setPlatformFilter} />
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
          {!isMobileTab && (
            <EuiFlexItem grow={false}>
              <ColumnSelector
                columns={optionalColumns}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {isMobileTab ? (
          <MobileApplicationsTable
            items={mobileItems}
            searchTerm={searchTerm}
            isLoading={isLoading}
            noItemsMessage={getMobileNoItemsMessage()}
          />
        ) : (
          <WebApplicationsTable
            items={items}
            searchTerm={searchTerm}
            isLoading={isLoading}
            noItemsMessage={getWebNoItemsMessage()}
            visibleColumns={visibleColumns}
            onShowClassicData={showClassicData}
          />
        )}
      </EuiPageSection>
    </>
  );
}
