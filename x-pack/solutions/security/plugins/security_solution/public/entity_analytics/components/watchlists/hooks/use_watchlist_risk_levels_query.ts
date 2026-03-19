/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getESQLResults, prettifyQuery } from '@kbn/esql-utils';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { useRiskEngineStatus } from '../../../api/hooks/use_risk_engine_status';
import { useErrorToast } from '../../../../common/hooks/use_error_toast';
import { useEsqlGlobalFilterQuery } from '../../../../common/hooks/esql/use_esql_global_filter';
import { useKibana } from '../../../../common/lib/kibana';
import { useGetDefaultRiskIndex } from '../../../hooks/use_get_default_risk_index';
import type { WatchlistRiskLevelsQueryResult } from './types';
import { esqlResponseToRecords } from '../../../../common/utils/esql';
import {
  getWatchlistRiskLevelsQueryBody,
  getWatchlistRiskLevelsQueryBodyV2,
} from '../queries/watchlist_risk_level_esql_query';
import { PREBUILT_WATCHLIST_NAMES } from '../../../../../common/entity_analytics/watchlists/constants';

export const useWatchlistRiskLevelsQuery = ({
  watchlistId,
  skip,
  spaceId,
}: {
  watchlistId?: string;
  skip?: boolean;
  spaceId: string;
}) => {
  const { data, uiSettings } = useKibana().services;
  const isEntityStoreV2Enabled = uiSettings.get<boolean>('securitySolution:entityStoreEnableV2');

  const v1Index = useGetDefaultRiskIndex(true); // only latest
  const v2Index = `.entities.v2.latest.security_${spaceId}`;
  const index = isEntityStoreV2Enabled ? v2Index : v1Index;

  const filterQuery = useEsqlGlobalFilterQuery();

  const watchlistName = watchlistId
    ? PREBUILT_WATCHLIST_NAMES[watchlistId] ?? watchlistId
    : undefined;
  const query = isEntityStoreV2Enabled
    ? `FROM ${index} ${getWatchlistRiskLevelsQueryBodyV2(watchlistName)}`
    : `FROM ${index} ${getWatchlistRiskLevelsQueryBody(spaceId, watchlistId)}`;

  // eslint-disable-next-line no-console
  console.log('query', query);
  const {
    data: riskEngineStatus,
    isFetching: isStatusLoading,
    refetch: refetchEngineStatus,
  } = useRiskEngineStatus();

  const isEnabled =
    !skip && !isStatusLoading && riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED';
  const queryKey = useMemo(() => ['watchlistRiskLevels', query, filterQuery], [query, filterQuery]);

  const {
    isRefetching,
    data: result,
    error,
    isError,
    refetch,
  } = useQuery<
    {
      response: ESQLSearchResponse;
      params: ESQLSearchParams;
    },
    SecurityAppError
  >(
    queryKey,
    async ({ signal }) =>
      getESQLResults({
        esqlQuery: query,
        search: data.search.search,
        signal,
        filter: filterQuery,
      }),
    {
      keepPreviousData: true,
      enabled: isEnabled,
      retry: 1, // retry once on failure
    }
  );

  // Hide unknown index errors from UI because they index might take some time to be created
  const filteredError = error && !error.message.includes('Unknown index') ? error : undefined;

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.riskLevels.queryError', {
      defaultMessage: 'There was an error loading the data',
    }),
    filteredError
  );

  const response = result?.response;

  const inspect = useMemo(() => {
    return {
      dsl: [JSON.stringify({ index: index ? [index] : [''], body: prettifyQuery(query) }, null, 2)],
      response: response ? [JSON.stringify(response, null, 2)] : [],
    };
  }, [index, query, response]);

  const handleRefetch = () => {
    refetchEngineStatus();
    refetch();
  };

  return {
    records: esqlResponseToRecords<WatchlistRiskLevelsQueryResult>(response),
    isLoading: isRefetching || isStatusLoading,
    refetch: handleRefetch,
    inspect,
    error,
    isRefetching,
    isError,
    hasEngineBeenInstalled: riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED',
  };
};
