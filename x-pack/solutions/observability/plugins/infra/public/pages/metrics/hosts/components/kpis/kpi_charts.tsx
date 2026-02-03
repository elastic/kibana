/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useReloadRequestTimeContext } from '../../../../../hooks/use_reload_request_time';
import { HostKpiCharts } from '../../../../../components/asset_details';
import { buildCombinedAssetFilter } from '../../../../../utils/filters/build';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';
import { useMetricsDataViewContext } from '../../../../../containers/metrics_source';
import {
  MAX_AS_FIRST_FUNCTION_PATTERN,
  AVG_OR_AVERAGE_AS_FIRST_FUNCTION_PATTERN,
} from '../../../../../components/asset_details/constants';

export const getSubtitle = ({
  formulaValue,
  limit,
  hostCount,
}: {
  formulaValue: string;
  limit: number;
  hostCount: number;
}) => {
  // Check if 'max' is the first word/function in the formula
  // Handles: "max(...)", "1 - max(...)", "100 * max(...)", etc.
  if (MAX_AS_FIRST_FUNCTION_PATTERN.test(formulaValue)) {
    return limit < hostCount
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max.limit', {
          defaultMessage: 'Max (of {limit} hosts)',
          values: {
            limit,
          },
        })
      : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max', {
          defaultMessage: 'Max',
        });
  }
  if (AVG_OR_AVERAGE_AS_FIRST_FUNCTION_PATTERN.test(formulaValue)) {
    return limit < hostCount
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: {
            limit,
          },
        })
      : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average', {
          defaultMessage: 'Average',
        });
  }
  return limit < hostCount
    ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
        defaultMessage: 'of {limit} hosts',
        values: {
          limit,
        },
      })
    : '';
};

export const KpiCharts = () => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { reloadRequestTime } = useReloadRequestTimeContext();
  const { hostNodes, loading: hostsLoading, error } = useHostsViewContext();
  const { loading: hostCountLoading, count: hostCount } = useHostCountContext();
  const { metricsView } = useMetricsDataViewContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;
  const loading = hostsLoading || hostCountLoading;

  const filters = shouldUseSearchCriteria
    ? [...searchCriteria.filters, ...(searchCriteria.panelFilters ?? [])]
    : [
        buildCombinedAssetFilter({
          field: 'host.name',
          values: hostNodes.map((p) => p.name),
          dataView: metricsView?.dataViewReference,
        }),
      ];

  const getSubtitleFn = useMemo(() => {
    return (formulaValue: string) =>
      getSubtitle({
        limit: searchCriteria.limit,
        hostCount,
        formulaValue,
      });
  }, [searchCriteria.limit, hostCount]);

  // prevents requests and searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    filters,
    reloadRequestTime,
    getSubtitle: getSubtitleFn,
  });

  return (
    <HostKpiCharts
      dataView={metricsView?.dataViewReference}
      dateRange={afterLoadedState.dateRange}
      filters={afterLoadedState.filters}
      query={afterLoadedState.query}
      lastReloadRequestTime={afterLoadedState.reloadRequestTime}
      getSubtitle={afterLoadedState.getSubtitle}
      loading={loading}
      error={error}
      hasData={!!hostNodes.length}
      schema={searchCriteria.preferredSchema}
    />
  );
};
