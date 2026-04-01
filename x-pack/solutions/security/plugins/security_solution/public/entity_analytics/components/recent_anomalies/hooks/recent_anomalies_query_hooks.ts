/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { getESQLResults, prettifyQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { ML_ANOMALIES_INDEX } from '../../../../../common/constants';
import { useEsqlGlobalFilterQuery } from '../../../../common/hooks/esql/use_esql_global_filter';
import { esqlResponseToRecords } from '../../../../common/utils/esql';
import { useKibana } from '../../../../common/lib/kibana';
import { useErrorToast } from '../../../../common/hooks/use_error_toast';
import type { AnomalyBand } from '../anomaly_bands';
import {
  useRecentAnomaliesDataEsqlSource,
  useRecentAnomaliesTopRowsEsqlSource,
  type ViewByMode,
} from './recent_anomalies_esql_source_query_hooks';

export interface EntityMetadata {
  entityId: string;
  entityName: string;
  entityType: string;
}

const useRecentAnomaliesTopRowsQuery = (params: {
  anomalyBands: AnomalyBand[];
  viewBy: ViewByMode;
  watchlistId?: string;
  spaceId?: string;
}) => {
  const search = useKibana().services.data.search.search;
  const filterQuery = useEsqlGlobalFilterQuery();
  const rowField = params.viewBy === 'jobId' ? 'job_id' : 'entity_id';

  const topRowsEsqlSource = useRecentAnomaliesTopRowsEsqlSource({
    ...params,
    rowsLimit: 5,
  });

  const { isLoading, data, isError } = useQuery(
    [filterQuery, topRowsEsqlSource],
    async ({ signal }) => {
      if (!topRowsEsqlSource) return [];
      return esqlResponseToRecords<Record<string, string>>(
        (
          await getESQLResults({
            esqlQuery: topRowsEsqlSource,
            search,
            signal,
            filter: filterQuery,
          })
        )?.response
      );
    },
    { enabled: !!topRowsEsqlSource }
  );

  const entityMetadata: EntityMetadata[] | undefined = useMemo(
    () =>
      params.viewBy === 'entity'
        ? data?.map((record) => ({
            entityId: record.entity_id,
            entityName: record.entity_name,
            entityType: record.entity_type,
          }))
        : undefined,
    [data, params.viewBy]
  );

  return {
    isLoading,
    rowLabels: data?.map((each) => each[rowField]),
    entityMetadata,
    isError,
  };
};

export const useRecentAnomaliesQuery = (params: {
  anomalyBands: AnomalyBand[];
  viewBy: ViewByMode;
  watchlistId?: string;
  spaceId?: string;
}) => {
  const search = useKibana().services.data.search.search;
  const filterQuery = useEsqlGlobalFilterQuery();

  const {
    rowLabels,
    entityMetadata,
    isError: isTopRowsError,
    isLoading: isTopRowsLoading,
  } = useRecentAnomaliesTopRowsQuery(params);

  const anomalyDataEsqlSource = useRecentAnomaliesDataEsqlSource({
    ...params,
    rowLabels,
  });

  const {
    isLoading: isAnomaliesLoading,
    data,
    error,
    isError: isAnomaliesError,
    refetch,
  } = useQuery<{
    anomalyRecords: Array<Record<string, unknown>>;
    rowLabels: string[];
  }>(
    [filterQuery, anomalyDataEsqlSource, rowLabels],
    async ({ signal }) => {
      if (!anomalyDataEsqlSource || !rowLabels || rowLabels.length === 0) {
        return { anomalyRecords: [], rowLabels: [] };
      }
      const anomalyRecords = esqlResponseToRecords<Record<string, string | number>>(
        (
          await getESQLResults({
            esqlQuery: anomalyDataEsqlSource,
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
        rowLabels: rowLabels ?? [],
      };
    },
    {
      enabled: !!anomalyDataEsqlSource && !!rowLabels,
      keepPreviousData: true,
    }
  );

  const inspect = useMemo(() => {
    return {
      dsl: [
        JSON.stringify(
          {
            index: [ML_ANOMALIES_INDEX],
            body: prettifyQuery(anomalyDataEsqlSource ?? ''),
          },
          null,
          2
        ),
      ],
      response: data ? [JSON.stringify(data, null, 2)] : [],
    };
  }, [data, anomalyDataEsqlSource]);

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.recentAnomalies.queryError', {
      defaultMessage: 'There was an error loading recent anomalies data',
    }),
    error
  );

  return {
    data,
    entityMetadata,
    isLoading: isTopRowsLoading || isAnomaliesLoading,
    isError: isTopRowsError || isAnomaliesError,
    refetch,
    error,
    inspect,
  };
};
