/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { useAbortableAsync } from '@kbn/react-hooks';
import { getDateISORange } from '@kbn/timerange';
import { SESSIONS_LOOKBACK_DAYS, type SessionsStatus } from '../../../common/sessions';
import type { ApplicationSource } from '../../../common/types/applications';
import { canManageSessions } from '../../capabilities';
import { ColumnSelector } from '../../components/column_selector';
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
import { useVisibleColumns } from '../../hooks/use_visible_columns';
import { EDOT_BROWSER_DOCS_URL } from '../../utils/doc_links';
import { SessionsFilters } from './components/sessions_filters';
import { SessionsKpis } from './components/sessions_kpis';
import {
  EnableSessionsPrompt,
  SessionsFreshness,
  SessionsRetentionCallout,
  SessionsStatusCallout,
} from './components/sessions_status_prompts';
import {
  SESSIONS_HIDDEN_BY_DEFAULT,
  SESSIONS_OPTIONAL_COLUMNS,
  SESSIONS_OPTIONAL_COLUMN_IDS,
  SessionsTable,
} from './components/sessions_table';
import { useSessionsListQuery } from './hooks/use_sessions_list_query';
import { useSessionsStatus } from './hooks/use_sessions_status';
import { DURATION_BUCKETS, pickSessionsListQuery } from '../../utils/sessions_list_query';

/** The attribute EDOT Browser stamps on every span and log of a session. */
const SESSION_ID_FIELD = 'session.id';

const HIDDEN_COLUMNS_STORAGE_KEY = 'xpack.digitalExperience.sessions.hiddenColumns';

const LOADING_MESSAGE = i18n.translate('xpack.digitalExperience.sessions.loadingMessage', {
  defaultMessage: 'Loading sessions',
});

/** How often the status is checked again while sessions rebuild in the background. */
const STATUS_REFRESH_MS = 30_000;

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

/** The sessions index is being built after setup or an update, so it may still be empty. */
const rebuildingPrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceSessionsRebuilding"
    icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
    titleSize="s"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.sessions.rebuildingTitle', {
          defaultMessage: 'Building sessions',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.digitalExperience.sessions.rebuildingDescription', {
          defaultMessage:
            'Sessions are being built from up to {days} days of data. This can take a while; they show up here as they are built.',
          values: { days: SESSIONS_LOOKBACK_DAYS },
        })}
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

function SessionsList({
  serviceName,
  source,
  status,
  onRefreshStatus,
}: {
  serviceName: string;
  source: ApplicationSource;
  status: SessionsStatus;
  onRefreshStatus: () => void;
}) {
  const { rebuilding } = status;
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

  // A new time range or environment lists other sessions, so a later page may not exist anymore:
  // start over. Not when Back or Forward (a POP) restores them, as that URL's page goes with it.
  const history = useHistory();
  const previousScope = useRef({ timeRange, environment });
  useEffect(() => {
    const previous = previousScope.current;
    if (previous.timeRange === timeRange && previous.environment === environment) {
      return;
    }
    previousScope.current = { timeRange, environment };
    if (state.page > 0 && history.action !== 'POP') {
      update({ page: undefined }, true);
    }
  }, [timeRange, environment, state.page, update, history]);

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
                environment,
                withJsErrors: state.withJsErrors ? 'true' : undefined,
                withFailedRequests: state.withFailedRequests ? 'true' : undefined,
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
    [apiClient, serviceName, timeRange, environment, state],
    { unsetValueOnError: true }
  );
  // Refresh checks the status too, so a finished rebuild shows without reloading.
  const refreshAll = useCallback(() => {
    refresh();
    onRefreshStatus();
  }, [refresh, onRefreshStatus]);
  // A finished rebuild has sessions the list was fetched without.
  const wasRebuilding = useRef(rebuilding);
  useEffect(() => {
    if (wasRebuilding.current && !rebuilding) {
      refresh();
    }
    wasRebuilding.current = rebuilding;
  }, [rebuilding, refresh]);
  const rangeStart = Date.parse(
    getDateISORange({ from: timeRange.rangeFrom, to: timeRange.rangeTo }).startDate
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
    if (hasActiveFilters) {
      return <NoMatchingSessionsPrompt onClear={clearFilters} />;
    }
    return rebuilding ? rebuildingPrompt : noSessionsPrompt;
  };

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <SessionsFreshness status={status} formatters={formatters} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TimeRangePicker onRefresh={refreshAll} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <SessionsRetentionCallout
        retentionDays={response?.retentionDays ?? status.retentionDays}
        rangeStart={rangeStart}
      />
      <SessionsKpis kpis={response?.kpis} isLoading={isLoading} formatters={formatters} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <SessionsFilters
            state={state}
            facets={response?.facets}
            sessionsWithJsErrors={response?.kpis.sessionsWithJsErrors}
            sessionsWithFailedRequests={response?.kpis.sessionsWithFailedRequests}
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
  const { status, error, refresh, enable, enabling, enableError } = useSessionsStatus();
  const enableProps = { canManage, onEnable: enable, enabling, enableError };

  // A rebuild finishes in the background, so check back until it does.
  const rebuilding = status?.rebuilding === true;
  useEffect(() => {
    if (!rebuilding) {
      return;
    }
    const interval = setInterval(refresh, STATUS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [rebuilding, refresh]);

  // The task can't run without a working API key. Someone who can set sessions up grants a new
  // one by visiting, once per visit, as the button would; a failure shows as usual.
  const regranted = useRef(false);
  useEffect(() => {
    if (status?.apiKeyInvalid && canManage && !regranted.current) {
      regranted.current = true;
      void enable();
    }
  }, [status?.apiKeyInvalid, canManage, enable]);

  // A failed background refresh keeps the last status.
  if (error && !status) {
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
  if (!status) {
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
      <SessionsList
        serviceName={serviceName}
        source={source}
        status={status}
        onRefreshStatus={refresh}
      />
    </>
  );
}
