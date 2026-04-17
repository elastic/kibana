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
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useKibana } from '../../../../../common/lib/kibana';
import { useEsqlGlobalFilterQuery } from '../../../../../common/hooks/esql/use_esql_global_filter';
import { esqlResponseToRecords } from '../../../../../common/utils/esql';
import { useRiskEngineStatus } from '../../../../api/hooks/use_risk_engine_status';
import { getWatchlistRiskLevelsQueryBodyV2 } from '../queries/watchlist_risk_level_query';
import type { WatchlistRiskLevelsQueryResult } from './types';
import { getEntitiesAlias, ENTITY_LATEST } from '../../../home/constants';

export const useRiskLevelsEsqlQuery = ({
  watchlistId,
  skip,
  spaceId,
}: {
  watchlistId?: string;
  skip?: boolean;
  spaceId: string;
}) => {
  const { data } = useKibana().services;

  const index = getEntitiesAlias(ENTITY_LATEST, spaceId);

  const filterQuery = useEsqlGlobalFilterQuery();

  const query = `FROM ${index} ${getWatchlistRiskLevelsQueryBodyV2(watchlistId || undefined)}`;

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
