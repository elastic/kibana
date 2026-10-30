/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { omitBy, isUndefined } from 'lodash';
import {
  EuiButton,
  EuiCode,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingLogo,
  EuiSpacer,
} from '@elastic/eui';
import { getEnvironmentLabel } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { useAbortableAsync } from '@kbn/react-hooks';
import { getDateISORange } from '@kbn/timerange';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { ApplicationSource } from '../../../common/types/applications';
import { canManageSessions } from '../../capabilities';
import { LoadErrorPrompt } from '../../components/load_error_prompt';
import { TimeRangePicker } from '../../components/time_range_picker';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../ebt_constants';
import { useApiClient } from '../../hooks/use_api_client';
import { useApplicationLinks } from '../../hooks/use_application_links';
import { useDigitalExperienceParams } from '../../hooks/use_digital_experience_params';
import { useEnvironment } from '../../hooks/use_environment';
import { useFormatters } from '../../hooks/use_formatters';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useTimeRange } from '../../hooks/use_time_range';
import { EDOT_BROWSER_DOCS_URL } from '../applications_list/applications_list_page';
import { SessionsFilters } from './components/sessions_filters';
import { SessionsKpis } from './components/sessions_kpis';
import { EnableSessionsPrompt, SessionsStatusCallout } from './components/sessions_status_prompts';
import {
  SESSIONS_HIDDEN_BY_DEFAULT,
  SESSIONS_OPTIONAL_COLUMNS,
  SESSIONS_OPTIONAL_COLUMN_IDS,
  SessionsTable,
} from './components/sessions_table';
import { ColumnSelector } from '../applications_list/components/column_selector';
import { useVisibleColumns } from '../applications_list/hooks/use_visible_columns';
import { pickSessionsListQuery, useSessionsListQuery } from './hooks/use_sessions_list_query';
import { useSessionsStatus } from './hooks/use_sessions_status';
import { DURATION_BUCKETS } from './utils/sessions_list_query';

/** The attribute EDOT Browser stamps on every span and log of a session. */
const SESSION_ID_FIELD = 'session.id';

const HIDDEN_COLUMNS_STORAGE_KEY = 'xpack.digitalExperience.sessions.hiddenColumns';

const LOADING_MESSAGE = i18n.translate('xpack.digitalExperience.sessions.loadingMessage', {
  defaultMessage: 'Loading sessions',
});

const statusLoadingPrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceSessionsStatusLoading"
    icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
    title={<h2>{LOADING_MESSAGE}</h2>}
  />
);

const noSessionsPrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceSessionsEmpty"
    iconType="users"
    titleSize="s"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.sessions.emptyTitle', {
          defaultMessage: 'No sessions in this time range',
        })}
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.digitalExperience.sessions.emptyDescription"
          defaultMessage="Sessions show up a few minutes after {edotBrowser} sends data with a {sessionId}. Try a longer time range, or check that the application is instrumented."
          values={{
            edotBrowser: (
              <EuiLink
                data-test-subj="digitalExperienceSessionsDocsLink"
                {...getEbtProps({
                  action: EBT_CLICK_ACTIONS.ADD_DATA,
                  element: SESSIONS_EBT_ELEMENTS.DOCS_LINK,
                })}
                href={EDOT_BROWSER_DOCS_URL}
                target="_blank"
                external
              >
                {i18n.translate('xpack.digitalExperience.sessions.emptyDocsLinkLabel', {
                  defaultMessage: 'EDOT Browser',
                })}
              </EuiLink>
            ),
            sessionId: <EuiCode>{SESSION_ID_FIELD}</EuiCode>,
          }}
        />
      </p>
    }
  />
);

const NoMatchingSessionsPrompt = ({ onClear }: { onClear: () => void }) => (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceSessionsNoMatches"
    iconType="magnify"
    titleSize="s"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.sessions.noMatchesTitle', {
          defaultMessage: 'No sessions match your search and filters',
        })}
      </h2>
    }
    actions={
      <EuiButton
        data-test-subj="digitalExperienceSessionsNoMatchesClear"
        {...getEbtProps({
          action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLEAR_FILTERS,
          element: SESSIONS_EBT_ELEMENTS.CLEAR_FILTERS,
        })}
        onClick={onClear}
      >
        {i18n.translate('xpack.digitalExperience.sessions.noMatchesClearButtonLabel', {
          defaultMessage: 'Clear filters',
        })}
      </EuiButton>
    }
  />
);

function SessionsList({ serviceName, source }: { serviceName: string; source: ApplicationSource }) {
  const apiClient = useApiClient();
  const formatters = useFormatters();
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const { state, update, setSearch, clearFilters, hasActiveFilters } = useSessionsListQuery();
  const { query } = useDigitalExperienceParams('/{serviceName}/sessions');
  const { sessionHref } = useApplicationLinks(serviceName, source);
  // The list's state goes along to the session, so its Sessions breadcrumb leads back to it.
  const sessionsQuery = pickSessionsListQuery(query);
  const toSessionHref = (sessionId: string) => sessionHref(sessionId, sessionsQuery);
  const { visibleColumns, setVisibleColumns } = useVisibleColumns({
    storageKey: HIDDEN_COLUMNS_STORAGE_KEY,
    columnIds: SESSIONS_OPTIONAL_COLUMN_IDS,
    hiddenByDefault: SESSIONS_HIDDEN_BY_DEFAULT,
  });

  // A new time range lists other sessions, so a later page may not exist anymore: start over. Not
  // when Back or Forward (a POP) restores a range, as that URL's page goes with it.
  const history = useHistory();
  const previousTimeRange = useRef(timeRange);
  useEffect(() => {
    if (previousTimeRange.current === timeRange) {
      return;
    }
    previousTimeRange.current = timeRange;
    if (state.page > 0 && history.action !== 'POP') {
      update({ page: undefined }, true);
    }
  }, [timeRange, state.page, update, history]);

  const {
    value: response,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) => {
      const { startDate, endDate } = getDateISORange({
        from: timeRange.rangeFrom,
        to: timeRange.rangeTo,
      });
      const duration = DURATION_BUCKETS.find(({ id }) => id === state.duration);
      return apiClient.fetch(
        'GET /internal/digital_experience/applications/{serviceName}/sessions',
        {
          signal,
          params: {
            path: { serviceName },
            query: omitBy(
              {
                start: startDate,
                end: endDate,
                query: state.search,
                browser: state.browser,
                os: state.os,
                country: state.country,
                entryPage: state.entryPage,
                hasErrors: state.hasErrors ? 'true' : undefined,
                minDurationMs: duration?.minDurationMs,
                maxDurationMs: duration?.maxDurationMs,
                sortField: state.sortField,
                sortDirection: state.sortDirection,
                page: state.page,
                perPage: state.perPage,
              },
              isUndefined
            ) as { start: string; end: string },
          },
        }
      );
    },
    [apiClient, serviceName, timeRange, state],
    { unsetValueOnError: true }
  );
  // Nothing has been fetched before the first request starts.
  const isLoading = loading || (!response && !error);

  const getNoItemsMessage = () => {
    if (isLoading) {
      return LOADING_MESSAGE;
    }
    if (error) {
      return (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceSessionsError"
          retryDataTestSubj="digitalExperienceSessionsRetry"
          retryEbtElement={SESSIONS_EBT_ELEMENTS.RETRY}
          title={i18n.translate('xpack.digitalExperience.sessions.loadErrorTitle', {
            defaultMessage: 'Could not load the sessions',
          })}
          error={error}
          onRetry={refresh}
        />
      );
    }
    return hasActiveFilters ? (
      <NoMatchingSessionsPrompt onClear={clearFilters} />
    ) : (
      noSessionsPrompt
    );
  };

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <TimeRangePicker onRefresh={refresh} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {environment && (
        <>
          <KbnInfoCallout
            data-test-subj="digitalExperienceSessionsAllEnvironments"
            size="s"
            title={i18n.translate('xpack.digitalExperience.sessions.allEnvironmentsTitle', {
              defaultMessage:
                'Sessions include every environment: the {environment} filter does not apply to them yet.',
              values: { environment: getEnvironmentLabel(environment) },
            })}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <SessionsKpis kpis={response?.kpis} isLoading={isLoading} formatters={formatters} />
      <EuiSpacer size="m" />
      {response && response.failedSummaries > 0 && (
        <>
          <KbnWarningCallout
            data-test-subj="digitalExperienceSessionsFailedSummaries"
            size="s"
            title={
              // They are counted by search, facets and duration, but can't be checked for errors.
              state.hasErrors
                ? i18n.translate(
                    'xpack.digitalExperience.sessions.failedSummariesWithErrorsFilterTitle',
                    {
                      defaultMessage:
                        '{count, plural, one {# session} other {# sessions}} in this time range could not be summarized, so {count, plural, one {it is} other {they are}} missing from the list and totals, and whether {count, plural, one {it} other {they}} had errors is unknown.',
                      values: { count: response.failedSummaries },
                    }
                  )
                : i18n.translate('xpack.digitalExperience.sessions.failedSummariesTitle', {
                    defaultMessage:
                      '{count, plural, one {# session} other {# sessions}} in this time range could not be summarized, so {count, plural, one {it is} other {they are}} missing from the list and totals.',
                    values: { count: response.failedSummaries },
                  })
            }
          />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <SessionsFilters
            state={state}
            facets={response?.facets}
            sessionsWithErrors={response?.kpis.sessionsWithErrors}
            hasActiveFilters={hasActiveFilters}
            isLoading={loading}
            formatters={formatters}
            onChange={update}
            onSearch={setSearch}
            onClear={clearFilters}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ColumnSelector
            columns={SESSIONS_OPTIONAL_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            ebtElement={SESSIONS_EBT_ELEMENTS.COLUMN_SELECTOR}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <SessionsTable
        sessions={response?.sessions ?? []}
        total={response?.total ?? 0}
        state={state}
        isLoading={isLoading}
        noItemsMessage={getNoItemsMessage()}
        formatters={formatters}
        sessionHref={toSessionHref}
        visibleColumns={visibleColumns}
        onChange={update}
      />
    </>
  );
}

/**
 * The Sessions tab of an application: sets sessions up when they aren't yet, flags when they need
 * attention, and lists the application's sessions.
 */
export function SessionsTab({
  serviceName,
  source,
}: {
  serviceName: string;
  source: ApplicationSource;
}) {
  const { application } = useKibanaServices();
  const canManage = canManageSessions(application.capabilities);
  const { status, loading, error, refresh, enable, enabling, enableError } = useSessionsStatus();
  const enableProps = { canManage, onEnable: enable, enabling, enableError };

  if (error) {
    return (
      <LoadErrorPrompt
        data-test-subj="digitalExperienceSessionsStatusError"
        retryDataTestSubj="digitalExperienceSessionsStatusRetry"
        retryEbtElement={SESSIONS_EBT_ELEMENTS.RETRY}
        title={i18n.translate('xpack.digitalExperience.sessions.statusErrorTitle', {
          defaultMessage: 'Could not check whether sessions are set up',
        })}
        error={error}
        onRetry={refresh}
      />
    );
  }
  if (loading || !status) {
    return statusLoadingPrompt;
  }
  if (!status.installed) {
    return <EnableSessionsPrompt {...enableProps} />;
  }
  return (
    <>
      {/* Clears the page header's tabs. */}
      <EuiSpacer size="m" />
      <SessionsStatusCallout status={status} {...enableProps} />
      <SessionsList serviceName={serviceName} source={source} />
    </>
  );
}
