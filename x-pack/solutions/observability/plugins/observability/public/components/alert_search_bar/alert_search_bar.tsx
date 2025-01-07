/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';
import { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '../../../common/constants';
import { DEFAULT_QUERIES, DEFAULT_QUERY_STRING } from './constants';
import { ObservabilityAlertSearchBarProps } from './types';
import { buildEsQuery } from '../../utils/build_es_query';
// import { AlertStatus } from '../../../common/typings';

// const getAlertStatusQuery = (status: string): Query[] => {
//   return ALERT_STATUS_QUERY[status]
//     ? [{ query: ALERT_STATUS_QUERY[status], language: 'kuery' }]
//     : [];
// };
const toastTitle = i18n.translate('xpack.observability.alerts.searchBar.invalidQueryTitle', {
  defaultMessage: 'Invalid query string',
});
const defaultFilters: Filter[] = [];

export function ObservabilityAlertSearchBar({
  appName,
  defaultSearchQueries = DEFAULT_QUERIES,
  onEsQueryChange,
  onKueryChange,
  onRangeFromChange,
  onRangeToChange,
  onControlConfigsChange,
  onFiltersChange,
  onFilterControlsChange,
  showFilterBar = false,
  controlConfigs,
  filters = defaultFilters,
  filterControls = defaultFilters,
  savedQuery,
  setSavedQuery,
  kuery,
  rangeFrom,
  rangeTo,
  services: {
    AlertsSearchBar,
    timeFilterService,
    http,
    notifications,
    dataViews,
    spaces,
    useToasts,
    uiSettings,
  },
}: ObservabilityAlertSearchBarProps) {
  const toasts = useToasts();
  const [spaceId, setSpaceId] = useState<string>();

  const clearSavedQuery = useCallback(
    () => (setSavedQuery ? setSavedQuery(undefined) : null),
    [setSavedQuery]
  );

  const filterControlsStorageKey = useMemo(
    () => ['observabilitySearchBar', spaceId, appName, 'filterControls'].filter(Boolean).join('.'),
    [appName, spaceId]
  );

  const submitQuery = useCallback(() => {
    try {
      onEsQueryChange(
        buildEsQuery({
          timeRange: {
            to: rangeTo,
            from: rangeFrom,
          },
          kuery,
          queries: defaultSearchQueries,
          filters: [...filters, ...filterControls],
          config: getEsQueryConfig(uiSettings),
        })
      );
    } catch (error) {
      toasts.addError(error, {
        title: toastTitle,
      });
      onKueryChange(DEFAULT_QUERY_STRING);
    }
  }, [
    onEsQueryChange,
    rangeTo,
    rangeFrom,
    kuery,
    defaultSearchQueries,
    filters,
    filterControls,
    uiSettings,
    toasts,
    onKueryChange,
  ]);

  useEffect(() => {
    submitQuery();
  }, [submitQuery]);

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  const onQuerySubmit = (
    {
      dateRange,
      query,
    }: {
      dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
      query?: string;
    },
    isUpdate?: boolean
  ) => {
    if (isUpdate) {
      clearSavedQuery();
      onKueryChange(query ?? '');
      timeFilterService.setTime(dateRange);
      onRangeFromChange(dateRange.from);
      onRangeToChange(dateRange.to);
    } else {
      submitQuery();
    }
  };

  const onFilterUpdated = useCallback<(filters: Filter[]) => void>(
    (updatedFilters) => {
      clearSavedQuery();
      onFiltersChange?.(updatedFilters);
    },
    [clearSavedQuery, onFiltersChange]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <AlertsSearchBar
          appName={appName}
          ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          showFilterBar={showFilterBar}
          filters={filters}
          onFiltersUpdated={onFilterUpdated}
          savedQuery={savedQuery}
          onSavedQueryUpdated={setSavedQuery}
          onClearSavedQuery={clearSavedQuery}
          query={kuery}
          onQuerySubmit={onQuerySubmit}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <AlertFilterControls
          dataViewSpec={{
            id: 'unified-alerts-dv',
            title: '.alerts-*',
          }}
          spaceId={spaceId}
          chainingSystem="HIERARCHICAL"
          controlsUrlState={controlConfigs}
          setControlsUrlState={onControlConfigsChange}
          filters={filters}
          onFiltersChange={onFilterControlsChange}
          storageKey={filterControlsStorageKey}
          services={{
            http,
            notifications,
            dataViews,
            storage: Storage,
          }}
          ControlGroupRenderer={ControlGroupRenderer}
        />
        {/* <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">*/}
        {/*  <EuiFlexItem grow={false}>*/}
        {/*    <AlertsStatusFilter status={status} onChange={onStatusChange} />*/}
        {/*  </EuiFlexItem>*/}
        {/* </EuiFlexGroup>*/}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default ObservabilityAlertSearchBar;
