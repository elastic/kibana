/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { useFetchAlertsIndexNamesQuery } from '@kbn/alerts-ui-shared';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';
import { Filter, TimeRange } from '@kbn/es-query';
import { getEsQueryConfig, getTime } from '@kbn/data-plugin/common';
import { ALERT_TIME_RANGE } from '@kbn/rule-data-utils';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '../../../common/constants';
import { DEFAULT_QUERY_STRING, EMPTY_FILTERS } from './constants';
import { ObservabilityAlertSearchBarProps } from './types';
import { buildEsQuery } from '../../utils/build_es_query';

const toastTitle = i18n.translate('xpack.observability.alerts.searchBar.invalidQueryTitle', {
  defaultMessage: 'Invalid query string',
});

const getTimeFilter = (timeRange: TimeRange) =>
  getTime(undefined, timeRange, {
    fieldName: ALERT_TIME_RANGE,
  });

export function ObservabilityAlertSearchBar({
  appName,
  defaultFilters = EMPTY_FILTERS,
  disableLocalStorageSync,
  onEsQueryChange,
  onKueryChange,
  onRangeFromChange,
  onRangeToChange,
  onControlConfigsChange,
  onFiltersChange,
  onFilterControlsChange,
  showFilterBar = false,
  controlConfigs,
  filters = EMPTY_FILTERS,
  filterControls,
  savedQuery,
  setSavedQuery,
  kuery,
  rangeFrom,
  rangeTo,
  onControlApiAvailable,
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
  const [timeFilter, setTimeFilter] = useState<Filter | undefined>(
    getTimeFilter({
      to: rangeTo,
      from: rangeFrom,
    })
  );
  const queryFilter = kuery ? { query: kuery, language: 'kuery' } : undefined;
  const { data: indexNames } = useFetchAlertsIndexNamesQuery({
    http,
    ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  });

  const clearSavedQuery = useCallback(
    () => (setSavedQuery ? setSavedQuery(undefined) : null),
    [setSavedQuery]
  );

  const filterControlsStorageKey = useMemo(
    () => ['observabilitySearchBar', spaceId, appName, 'filterControls'].filter(Boolean).join('.'),
    [appName, spaceId]
  );

  const dataViewSpec = useMemo(
    () => ({
      id: 'observability-unified-alerts-dv',
      title: indexNames?.join(',') ?? '',
    }),
    [indexNames]
  );

  const aggregatedFilters = useMemo(() => {
    const _filters = timeFilter
      ? [timeFilter, ...filters, ...defaultFilters]
      : [...filters, ...defaultFilters];
    return _filters.length ? _filters : undefined;
  }, [timeFilter, filters, defaultFilters]);

  const submitQuery = useCallback(() => {
    try {
      onEsQueryChange(
        buildEsQuery({
          timeRange: {
            to: rangeTo,
            from: rangeFrom,
          },
          kuery,
          filters: [...filters, ...(filterControls ?? []), ...defaultFilters],
          config: getEsQueryConfig(uiSettings),
        })
      );
      setTimeFilter(
        getTimeFilter({
          to: rangeTo,
          from: rangeFrom,
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
    defaultFilters,
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
        {indexNames && indexNames.length > 0 && (
          <AlertFilterControls
            dataViewSpec={dataViewSpec}
            spaceId={spaceId}
            chainingSystem="HIERARCHICAL"
            controlsUrlState={controlConfigs}
            setControlsUrlState={onControlConfigsChange}
            filters={aggregatedFilters}
            onFiltersChange={onFilterControlsChange}
            storageKey={filterControlsStorageKey}
            disableLocalStorageSync={disableLocalStorageSync}
            query={queryFilter}
            services={{
              http,
              notifications,
              dataViews,
              storage: Storage,
            }}
            ControlGroupRenderer={ControlGroupRenderer}
            onInit={onControlApiAvailable}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default ObservabilityAlertSearchBar;
