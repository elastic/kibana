/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { useEsqlGlobalFilterQuery } from '../../../../../../../common/hooks/esql/use_esql_global_filter';
import { esqlResponseToRecords } from '../../../../../../../common/utils/esql';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { useErrorToast } from '../../../../../../../common/hooks/use_error_toast';
import type { AnomalyBand } from '../pad_anomaly_bands';
import {
  usePadAnomalyDataEsqlSource,
  usePadTopAnomalousUsersEsqlSource,
} from './pad_esql_source_query_hooks';

interface ESQLRawAnomalyRecord extends Record<string, string | number> {
  '@timestamp': number | string;
  record_score: number;
  'user.name': string;
}

/**
 * An Anomaly record that ensures consistent timestamps as milliseconds since Epoch time.
 */
export interface ESQLAnomalyRecord {
  '@timestamp': number;
  record_score: number;
  'user.name': string;
}

const usePrivilegedAccessDetectionTopUsersQuery = (params: {
  jobIds: string[];
  spaceId: string;
  anomalyBands: AnomalyBand[];
}) => {
  const search = useKibana().services.data.search.search;

  const filterQuery = useEsqlGlobalFilterQuery();

  const padTopAnomalousUsersEsqlSource = usePadTopAnomalousUsersEsqlSource({
    ...params,
    usersLimit: 10,
  });

  const { isLoading, data, isError } = useQuery(
    [filterQuery, padTopAnomalousUsersEsqlSource],
    async ({ signal }) => {
      return esqlResponseToRecords<{ 'user.name': string }>(
        (
          await getESQLResults({
            esqlQuery: padTopAnomalousUsersEsqlSource,
            search,
            signal,
            filter: filterQuery,
          })
        )?.response
      );
    }
  );
  return {
    isLoading,
    userNames: data?.map((each) => each['user.name']),
    isError,
  };
};

export const usePrivilegedAccessDetectionAnomaliesQuery = (params: {
  jobIds: string[];
  spaceId: string;
  anomalyBands: AnomalyBand[];
}) => {
  const search = useKibana().services.data.search.search;
  const filterQuery = useEsqlGlobalFilterQuery();

  const {
    userNames,
    isError: isTopUsersError,
    isLoading: isTopUsersLoading,
  } = usePrivilegedAccessDetectionTopUsersQuery(params);

  const padAnomalyDataEsqlSource = usePadAnomalyDataEsqlSource({ ...params, userNames });

  const {
    isLoading: isAnomaliesLoading,
    data,
    error,
    isError: isAnomaliesError,
    refetch,
  } = useQuery<{
    anomalyRecords: ESQLAnomalyRecord[];
    userNames: string[];
  }>(
    [filterQuery, padAnomalyDataEsqlSource, userNames],
    async ({ signal }) => {
      if (!padAnomalyDataEsqlSource || !userNames || userNames.length === 0) {
        return { anomalyRecords: [], userNames: [] };
      }
      const anomalyRecords = esqlResponseToRecords<ESQLRawAnomalyRecord>(
        (
          await getESQLResults({
            esqlQuery: padAnomalyDataEsqlSource,
            search,
            signal,
            filter: filterQuery,
          })
        ).response
      ).map((eachRawRecord) => ({
        ...eachRawRecord,
        '@timestamp': new Date(eachRawRecord['@timestamp']).getTime(),
      }));
      return {
        anomalyRecords: anomalyRecords ?? [],
        userNames: userNames ?? [],
      };
    },
    {
      enabled: !!padAnomalyDataEsqlSource && !!userNames,
      keepPreviousData: true,
    }
  );

  useErrorToast(
    i18n.translate(
      'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.queryError',
      {
        defaultMessage: 'There was an error loading privileged access detection data',
      }
    ),
    error
  );

  return {
    data,
    isLoading: isTopUsersLoading || isAnomaliesLoading,
    isError: isTopUsersError || isAnomaliesError,
    refetch,
    error,
  };
};
