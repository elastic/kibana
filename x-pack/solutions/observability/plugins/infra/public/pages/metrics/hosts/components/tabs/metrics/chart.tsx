/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { LensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import type { DataView } from '@kbn/data-views-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { useReloadRequestTimeContext } from '../../../../../../hooks/use_reload_request_time';
import { HOST_NAME_FIELD } from '../../../../../../../common/constants';
import { METRIC_CHART_HEIGHT } from '../../../../../../common/visualizations/constants';
import { LensChart } from '../../../../../../components/lens';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { buildCombinedAssetFilter } from '../../../../../../utils/filters/build';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';

export type ChartProps = LensConfig & {
  id: string;
  dataView: DataView | undefined;
};

export const Chart = ({ id, dataView, ...chartProps }: ChartProps) => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { loading } = useHostsViewContext();
  const { reloadRequestTime } = useReloadRequestTimeContext();
  const { currentPage } = useHostsTableContext();

  const shouldUseSearchCriteria = currentPage.length === 0;

  // prevents searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    reloadRequestTime,
  });

  const { value: filters = [] } = useAsync(async () => {
    if (!dataView?.id) {
      return [];
    }

    return shouldUseSearchCriteria
      ? [...searchCriteria.filters, ...(searchCriteria.panelFilters ?? [])]
      : [
          buildCombinedAssetFilter({
            field: HOST_NAME_FIELD,
            values: currentPage.map((p) => p.name),
            dataView,
          }),
        ];
  }, [
    currentPage,
    dataView,
    searchCriteria.filters,
    searchCriteria.panelFilters,
    shouldUseSearchCriteria,
  ]);

  return (
    <LensChart
      lensAttributes={chartProps}
      id={`hostsView-metricChart-${id}`}
      borderRadius="m"
      dateRange={afterLoadedState.dateRange}
      height={METRIC_CHART_HEIGHT}
      loading={loading}
      filters={filters}
      query={afterLoadedState.query}
      lastReloadRequestTime={afterLoadedState.reloadRequestTime}
    />
  );
};
