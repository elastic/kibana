/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import { inputsSelectors } from '../../../../../common/store';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useKibana } from '../../../../../common/lib/kibana';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { useBrowserFields } from '../../../../../data_view_manager/hooks/use_browser_fields';
import { PageScope } from '../../../../../data_view_manager/constants';
import { combineQueries } from '../../../../../common/lib/kuery';
import { buildTimeRangeFilter } from '../../../alerts_table/helpers';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { fetchQueryUnifiedAlerts } from '../../../../containers/detection_engine/alerts/api';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';

interface FilteredAlertIdHit {
  _id: string;
}

export interface UseFilteredRelatedAlertIdsProps {
  /** The alert ids of the selected attack */
  attackAlertIds: string[];
  /** Additional filters to apply when querying for related alert IDs. */
  filters: Filter[];
  /** Whether the query should be executed. If false, returns an empty Set. */
  enabled: boolean;
}

/**
 * Hook to fetch a set of alert IDs that match the current global queries and filters.
 *
 * This hook is used to determine which alerts should be highlighted or filtered
 * out when displaying alerts associated with a specific attack. It combines
 * the provided filters with the global query, global filters, and time range
 * filter, and queries the alerts API to return a `Set` of matching alert IDs.
 *
 * It is capped at 10,000 alerts (`MAX_FILTERED_ALERT_IDS`).
 */
export const useFilteredRelatedAlertIds = ({
  attackAlertIds,
  filters,
  enabled,
}: UseFilteredRelatedAlertIdsProps) => {
  const { from, to } = useGlobalTime();
  const { uiSettings } = useKibana().services;

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);

  const { dataView } = useDataView(PageScope.attacks);
  const browserFields = useBrowserFields(PageScope.attacks);
  const timeRangeFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);

  const query = useMemo(() => {
    if (!enabled || attackAlertIds.length === 0 || browserFields == null || !dataView) {
      return {};
    }

    const combinedQuery = combineQueries({
      config: getEsQueryConfig(uiSettings),
      dataProviders: [],
      dataView,
      browserFields,
      filters: [...filters, ...(globalFilters ?? []), ...timeRangeFilter],
      kqlQuery: globalQuery,
      kqlMode: globalQuery.language,
    });

    if (combinedQuery?.kqlError || !combinedQuery?.filterQuery) {
      return {};
    }

    return {
      size: attackAlertIds.length,
      _source: false,
      fields: [],
      query: {
        bool: {
          filter: [JSON.parse(combinedQuery.filterQuery), { ids: { values: attackAlertIds } }],
        },
      },
    };
  }, [
    attackAlertIds,
    browserFields,
    enabled,
    dataView,
    filters,
    globalFilters,
    globalQuery,
    timeRangeFilter,
    uiSettings,
  ]);

  const { data, loading, setQuery } = useQueryAlerts<FilteredAlertIdHit, {}>({
    fetchMethod: fetchQueryUnifiedAlerts,
    query,
    skip: !enabled,
    queryName: ALERTS_QUERY_NAMES.ATTACK_FILTERED_ALERT_IDS,
  });

  useEffect(() => {
    setQuery(query);
  }, [query, setQuery]);

  const filteredAlertIds = useMemo(() => {
    return new Set(data?.hits.hits.map(({ _id }) => _id) ?? []);
  }, [data]);

  return {
    filteredAlertIds,
    isLoading: loading,
    isReady: data != null && !loading,
  };
};
