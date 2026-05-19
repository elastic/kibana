/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrorsTabContent } from './errors_tab_content';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { SearchField } from '../common/search_field';
import { FilterGroup } from '../common/monitor_filters/filter_group';
import { useMonitorFiltersState } from '../common/monitor_filters/use_filters';
import { useAllMonitorErrors } from '../hooks/use_all_errors';
import { useErrorGroups } from '../hooks/use_error_groups';
import { useErrorStats } from '../hooks/use_error_stats';
import { useErrorsBreadcrumbs } from './use_errors_breadcrumbs';

export const ErrorsTab = () => {
  const { errorStates, upStates, loading, data, monitorIds } = useAllMonitorErrors();
  const { groups: errorGroups, loading: errorGroupsLoading } = useErrorGroups();
  const { stats: errorStats, loading: errorStatsLoading } = useErrorStats();
  const { handleFilterChange } = useMonitorFiltersState();
  useErrorsBreadcrumbs();

  const initialLoading = loading && !data;
  const isEmpty = !loading && errorStates.length === 0;

  return (
    <div>
      <SyntheticsDatePicker fullWidth={true} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" wrap={true}>
        <EuiFlexItem>
          <SearchField />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FilterGroup handleFilterChange={handleFilterChange} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {initialLoading && (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xxl" />}
          title={<h3>{LOADING_TITLE}</h3>}
          body={<p>{LOADING_BODY}</p>}
        />
      )}
      {isEmpty && (
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
          monitorIds={monitorIds}
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
