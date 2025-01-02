/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import createContainer from 'constate';
import { useCallback, useEffect, useState } from 'react';
import type { Filter, TimeRange } from '@kbn/es-query';
import { buildEsQuery, fromKueryExpression, type Query } from '@kbn/es-query';
import { Subscription, map, tap } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { useKibanaQuerySettings } from '@kbn/observability-shared-plugin/public';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useSearchSessionContext } from '../../../../hooks/use_search_session';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { telemetryTimeRangeFormatter } from '../../../../../common/formatters/telemetry_time_range';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import type { StringDateRange } from './use_unified_search_url_state';
import {
  useHostsUrlState,
  type HostsState,
  type StringDateRangeTimestamp,
} from './use_unified_search_url_state';
import { retrieveFieldsFromFilter } from '../../../../utils/filters/build';

const buildQuerySubmittedPayload = (
  hostState: HostsState & { parsedDateRange: StringDateRangeTimestamp }
) => {
  const { panelFilters, filters, parsedDateRange, query: queryObj, limit } = hostState;

  return {
    control_filter_fields: retrieveFieldsFromFilter(panelFilters),
    filter_fields: retrieveFieldsFromFilter(filters),
    interval: telemetryTimeRangeFormatter(parsedDateRange.to - parsedDateRange.from),
    with_query: !!queryObj.query,
    limit,
  };
};

export const useUnifiedSearch = () => {
  const [error, setError] = useState<Error | null>(null);
  const [searchCriteria, setSearch] = useHostsUrlState();
  const { metricsView } = useMetricsDataViewContext();
  const { updateSearchSessionId } = useSearchSessionContext();
  const { services } = useKibanaContextForPlugin();
  const kibanaQuerySettings = useKibanaQuerySettings();

  const parsedDateRange = useTimeRange({
    rangeFrom: searchCriteria.dateRange.from,
    rangeTo: searchCriteria.dateRange.to,
  });

  const {
    data: {
      query: {
        filterManager: filterManagerService,
        queryString: queryStringService,
        timefilter: timeFilterService,
      },
    },
    telemetry,
  } = services;

  const validateQuery = useCallback(
    (query: Query) => {
      fromKueryExpression(query.query, kibanaQuerySettings);
    },
    [kibanaQuerySettings]
  );

  const onFiltersChange = useCallback(
    (filters: Filter[]) => {
      setSearch({ type: 'SET_FILTERS', filters });
      updateSearchSessionId();
    },
    [setSearch, updateSearchSessionId]
  );

  const onPanelFiltersChange = useCallback(
    (panelFilters: Filter[]) => {
      setSearch({ type: 'SET_PANEL_FILTERS', panelFilters });
      updateSearchSessionId();
    },
    [setSearch, updateSearchSessionId]
  );

  const onLimitChange = useCallback(
    (limit: number) => {
      setSearch({ type: 'SET_LIMIT', limit });
      updateSearchSessionId();
    },
    [setSearch, updateSearchSessionId]
  );

  const onDateRangeChange = useCallback(
    (dateRange: StringDateRange) => {
      setSearch({ type: 'SET_DATE_RANGE', dateRange });
      updateSearchSessionId();
    },
    [setSearch, updateSearchSessionId]
  );

  const onQueryChange = useCallback(
    (query: Query) => {
      try {
        setError(null);
        validateQuery(query);
        setSearch({ type: 'SET_QUERY', query });
        updateSearchSessionId();
      } catch (err) {
        setError(err);
      }
    },
    [validateQuery, setSearch, updateSearchSessionId]
  );

  const onSubmit = useCallback(
    ({ dateRange }: { dateRange: TimeRange }) => {
      onDateRangeChange(dateRange);
    },
    [onDateRangeChange]
  );

  const getDateRangeAsTimestamp = useCallback(() => {
    const from = new Date(parsedDateRange.from).getTime();
    const to = new Date(parsedDateRange.to).getTime();

    return { from, to };
  }, [parsedDateRange]);

  const buildQuery = useCallback(() => {
    return buildEsQuery(
      metricsView?.dataViewReference,
      searchCriteria.query,
      [...searchCriteria.filters, ...searchCriteria.panelFilters],
      kibanaQuerySettings
    );
  }, [
    metricsView?.dataViewReference,
    searchCriteria.query,
    searchCriteria.filters,
    searchCriteria.panelFilters,
    kibanaQuerySettings,
  ]);

  useEffectOnce(() => {
    // Sync filtersService from the URL state
    if (!deepEqual(filterManagerService.getFilters(), searchCriteria.filters)) {
      filterManagerService.setFilters(searchCriteria.filters);
    }
    // Sync queryService from the URL state
    if (!deepEqual(queryStringService.getQuery(), searchCriteria.query)) {
      queryStringService.setQuery(searchCriteria.query);
    }

    try {
      // Validates the "query" object from the URL state
      if (searchCriteria.query) {
        validateQuery(searchCriteria.query);
      }
    } catch (err) {
      setError(err);
    }
  });

  useEffect(() => {
    const subscription = new Subscription();
    subscription.add(
      filterManagerService
        .getUpdates$()
        .pipe(
          map(() => filterManagerService.getFilters()),
          tap((filters) => onFiltersChange(filters))
        )
        .subscribe()
    );

    subscription.add(
      timeFilterService.timefilter
        .getTimeUpdate$()
        .pipe(
          map(() => timeFilterService.timefilter.getTime()),
          tap((dateRange) => onDateRangeChange(dateRange))
        )
        .subscribe()
    );

    subscription.add(
      queryStringService
        .getUpdates$()
        .pipe(
          map(() => queryStringService.getQuery() as Query),
          tap((query) => onQueryChange(query))
        )
        .subscribe()
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [
    filterManagerService,
    queryStringService,
    onQueryChange,
    onFiltersChange,
    timeFilterService.timefilter,
    onDateRangeChange,
  ]);

  // Track telemetry event on query/filter/date changes
  useEffect(() => {
    const dateRangeInTimestamp = getDateRangeAsTimestamp();
    telemetry.reportHostsViewQuerySubmitted(
      buildQuerySubmittedPayload({ ...searchCriteria, parsedDateRange: dateRangeInTimestamp })
    );
  }, [getDateRangeAsTimestamp, searchCriteria, telemetry]);

  return {
    error,
    buildQuery,
    onSubmit,
    parsedDateRange,
    getDateRangeAsTimestamp,
    searchCriteria,
    onDateRangeChange,
    onLimitChange,
    onPanelFiltersChange,
  };
};

export const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
