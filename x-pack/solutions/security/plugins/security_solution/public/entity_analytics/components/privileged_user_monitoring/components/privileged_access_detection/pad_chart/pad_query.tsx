/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { useEsqlGlobalFilterQuery } from '../../../../../../common/hooks/esql/use_esql_global_filter';
import { esqlResponseToRecords } from '../../../../../../common/utils/esql';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useErrorToast } from '../../../../../../common/hooks/use_error_toast';
import type { AnomalyBand } from './pad_anomaly_bands';
import { usePadAnomalyDataEsqlSource } from './pad_esql_source_query';

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

export const usePrivilegedAccessDetectionAnomaliesQuery = ({
  jobIds,
  anomalyBands,
  spaceId,
}: {
  jobIds: string[];
  spaceId: string;
  anomalyBands: AnomalyBand[];
}) => {
  const {
    data: {
      search: { search },
    },
  } = useKibana().services;

  const padAnomalyDataEsqlSource = usePadAnomalyDataEsqlSource(jobIds, anomalyBands, spaceId);

  const filterQuery = useEsqlGlobalFilterQuery();

  const {
    isLoading,
    isRefetching,
    data: result,
    error,
    isError,
    refetch,
  } = useQuery(
    [filterQuery, padAnomalyDataEsqlSource],
    async ({ signal }) =>
      getESQLResults({
        esqlQuery: padAnomalyDataEsqlSource,
        search,
        signal,
        filter: filterQuery,
      }),
    {
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

  const records: ESQLAnomalyRecord[] = esqlResponseToRecords<ESQLRawAnomalyRecord>(
    result?.response
  ).map((eachRawRecord) => ({
    ...eachRawRecord,
    '@timestamp': new Date(eachRawRecord['@timestamp']).getTime(),
  }));

  return {
    records,
    isLoading: isLoading || isRefetching,
    refetch,
    error,
    isRefetching,
    isError,
  };
};
