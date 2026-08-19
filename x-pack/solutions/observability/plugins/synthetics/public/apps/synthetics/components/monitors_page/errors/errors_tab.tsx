/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrorsTabContent } from './errors_tab_content';
import { SyntheticsRefreshContext } from '../../../contexts';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { SearchField } from '../common/search_field';
import { FilterGroup } from '../common/monitor_filters/filter_group';
import { useMonitorFiltersState } from '../common/monitor_filters/use_filters';
import { useAllMonitorErrors } from '../hooks/use_all_errors';
import { useErrorGroups } from '../hooks/use_error_groups';
import { useErrorStats } from '../hooks/use_error_stats';
import { useErrorsBreadcrumbs } from './use_errors_breadcrumbs';
import type { IHttpSerializedFetchError } from '../../../state/utils/http_error';

// `useReduxEsSearch` and `useFetcher` surface different error shapes.
// This helper normalizes them to a single string to render in the callout.
function getApiErrorMessage(error?: Error | IHttpSerializedFetchError | null): string | undefined {
  if (!error) return undefined;
  if ('body' in error && error.body) {
    return error.body.message ?? error.body.error;
  }
  if ('message' in error) {
    return error.message;
  }
  return undefined;
}

export const ErrorsTab = () => {
  const { errorStates, upStates, loading, data, error: errorsError } = useAllMonitorErrors();
  const {
    groups: errorGroups,
    loading: errorGroupsLoading,
    error: errorGroupsError,
  } = useErrorGroups();
  const { stats: errorStats, loading: errorStatsLoading, error: errorStatsError } = useErrorStats();
  const { handleFilterChange } = useMonitorFiltersState();
  const { refreshApp } = useContext(SyntheticsRefreshContext);
  useErrorsBreadcrumbs();

  const apiError = errorsError ?? errorStatsError ?? errorGroupsError;
  const apiErrorMessage = getApiErrorMessage(apiError);

  // Initial load = no source has settled yet. We don't gate on loading
  // alone because each source can resolve at a different time and we want
  // the page to start rendering as soon as the first one is ready.
  const initialLoading =
    loading &&
    !data &&
    errorStatsLoading &&
    !errorStats &&
    errorGroupsLoading &&
    errorGroups.length === 0;

  // Empty = every source has finished and reports nothing. This avoids the
  // flash of "No errors found" between when a filter changes and the new
  // requests resolve.
  const isEmpty =
    !loading &&
    !errorStatsLoading &&
    !errorGroupsLoading &&
    errorStates.length === 0 &&
    errorGroups.length === 0 &&
    (errorStats?.downChecks ?? 0) === 0;

  return (
    <div>
      <SyntheticsDatePicker fullWidth={true} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" wrap={true}>
        <EuiFlexItem>
          <SearchField />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* Frequency (`schedules`) is omitted: it filters monitor configs
              by their saved schedule, but the errors data we're showing here
              is ping-based and doesn't carry that field, so the filter would
              be a no-op. Re-enable once schedule-based ping filtering exists. */}
          <FilterGroup handleFilterChange={handleFilterChange} excludeFields={['schedules']} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {apiError && (
        <>
          <EuiCallOut
            announceOnMount
            title={ERROR_TITLE}
            color="danger"
            iconType="warning"
            data-test-subj="syntheticsErrorsTabApiError"
          >
            <p>{ERROR_BODY}</p>
            {apiErrorMessage && <p>{apiErrorMessage}</p>}
            <EuiButton
              data-test-subj="syntheticsErrorsTabRetryButton"
              size="s"
              color="danger"
              onClick={() => refreshApp()}
            >
              {RETRY_LABEL}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {initialLoading && (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xxl" />}
          title={<h3>{LOADING_TITLE}</h3>}
          body={<p>{LOADING_BODY}</p>}
        />
      )}
      {!initialLoading && isEmpty && !apiError && (
        <EuiEmptyPrompt
          icon={<EuiIcon type="checkCircleFill" color="success" size="xl" aria-hidden={true} />}
          title={<h3>{EMPTY_TITLE}</h3>}
          body={<p>{EMPTY_BODY}</p>}
        />
      )}
      {!initialLoading && !isEmpty && (
        <ErrorsTabContent
          errorStates={errorStates}
          upStates={upStates}
          loading={loading}
          errorGroups={errorGroups}
          errorGroupsLoading={errorGroupsLoading}
          errorStats={errorStats}
          errorStatsLoading={errorStatsLoading}
        />
      )}
    </div>
  );
};

const LOADING_TITLE = i18n.translate('xpack.synthetics.errors.global.loadingTitle', {
  defaultMessage: 'Checking for errors',
});

const LOADING_BODY = i18n.translate('xpack.synthetics.errors.global.loadingBody', {
  defaultMessage: 'This will take just a second.',
});

const EMPTY_TITLE = i18n.translate('xpack.synthetics.errors.global.emptyTitle', {
  defaultMessage: 'No errors found',
});

const EMPTY_BODY = i18n.translate('xpack.synthetics.errors.global.emptyBody', {
  defaultMessage:
    'All monitors ran successfully during the selected period. Try expanding the time range or adjusting filters. Older errors may have been removed by data retention policies.',
});

const ERROR_TITLE = i18n.translate('xpack.synthetics.errors.global.errorTitle', {
  defaultMessage: 'Unable to load errors',
});

const ERROR_BODY = i18n.translate('xpack.synthetics.errors.global.errorBody', {
  defaultMessage:
    'Something went wrong while loading errors data. Try adjusting your filters and retry; if the problem persists, check Kibana server logs for details.',
});

const RETRY_LABEL = i18n.translate('xpack.synthetics.errors.global.retryLabel', {
  defaultMessage: 'Retry',
});
