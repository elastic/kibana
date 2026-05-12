/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { getESQLResults, prettifyQuery } from '@kbn/esql-utils';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { ML_ANOMALIES_INDEX } from '../../../../../common/constants';
import {
  useEsqlFixedRangeFilterQuery,
  useEsqlGlobalFilterQuery,
} from '../../../../common/hooks/esql/use_esql_global_filter';
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

interface FixedTimeRange {
  from: string;
  to: string;
}

/**
 * Internal helper: pick between the global-date-picker filter and a fixed
 * range filter. Both underlying hooks must be called unconditionally to obey
 * the rules of hooks; only the selected value is returned.
 */
const useRecentAnomaliesFilterQuery = (timeRange?: FixedTimeRange) => {
  const globalFilterQuery = useEsqlGlobalFilterQuery();
  const fixedFilterQuery = useEsqlFixedRangeFilterQuery(
    timeRange?.from ?? 'now-15m',
    timeRange?.to ?? 'now'
  );
  return timeRange ? fixedFilterQuery : globalFilterQuery;
};

const useRecentAnomaliesTopRowsQuery = (params: {
  anomalyBands: AnomalyBand[];
  viewBy: ViewByMode;
  watchlistId?: string;
  spaceId?: string;
  /**
   * When provided, this time range is used for filtering instead of the
   * global date picker's range. Used on surfaces that hide the picker.
   */
  timeRange?: FixedTimeRange;
}) => {
  const search = useKibana().services.data.search.search;
  const filterQuery = useRecentAnomaliesFilterQuery(params.timeRange);
  const rowField = params.viewBy === 'jobId' ? 'job_id' : 'entity_id';

  const topRowsEsqlSource = useRecentAnomaliesTopRowsEsqlSource({
    ...params,
    rowsLimit: 5,
  });

  const { isLoading, data, isError } = useQuery(
    [filterQuery, topRowsEsqlSource],
    async ({ signal }) => {
      if (!topRowsEsqlSource) return { records: [], rawResponse: undefined };
      const esqlResult = await getESQLResults({
        esqlQuery: topRowsEsqlSource,
        search,
        signal,
        filter: filterQuery,
      });
      return {
        records: esqlResponseToRecords<Record<string, string>>(esqlResult?.response),
        rawResponse: esqlResult?.response,
      };
    },
    { enabled: !!topRowsEsqlSource }
  );

  const records = data?.records;

  const entityMetadata: EntityMetadata[] | undefined = useMemo(
    () =>
      params.viewBy === 'entity'
        ? records?.map((record) => ({
            entityId: record.entity_id,
            entityName: record.entity_name,
            entityType: record.entity_type,
          }))
        : undefined,
    [records, params.viewBy]
  );

  return {
    isLoading,
    rowLabels: records?.map((each) => each[rowField]),
    entityMetadata,
    isError,
    rawResponse: data?.rawResponse,
    esqlSource: topRowsEsqlSource,
  };
};

export const useRecentAnomaliesQuery = (params: {
  anomalyBands: AnomalyBand[];
  viewBy: ViewByMode;
  watchlistId?: string;
  spaceId?: string;
  /**
   * When provided, this time range is used for filtering instead of the
   * global date picker's range. Used on surfaces that hide the picker.
   */
  timeRange?: FixedTimeRange;
}) => {
  const search = useKibana().services.data.search.search;
  const filterQuery = useRecentAnomaliesFilterQuery(params.timeRange);

  const {
    rowLabels,
    entityMetadata,
    isError: isTopRowsError,
    isLoading: isTopRowsLoading,
    rawResponse: topRowsRawResponse,
    esqlSource: topRowsEsqlSource,
  } = useRecentAnomaliesTopRowsQuery(params);

  const anomalyDataEsqlSource = useRecentAnomaliesDataEsqlSource({
    ...params,
    rowLabels,
    timeRange: params.timeRange,
  });

  const hasAnomaliesData = rowLabels && rowLabels.length > 0;

  const {
    isLoading: isAnomaliesLoading,
    data,
    error,
    isError: isAnomaliesError,
    refetch,
  } = useQuery<{
    anomalyRecords: Array<Record<string, unknown>>;
    rowLabels: string[];
    rawResponse?: ESQLSearchResponse;
  }>(
    [filterQuery, anomalyDataEsqlSource, rowLabels],
    async ({ signal }) => {
      if (!anomalyDataEsqlSource || !hasAnomaliesData) {
        return { anomalyRecords: [], rowLabels: [] };
      }
      const esqlResult = await getESQLResults({
        esqlQuery: anomalyDataEsqlSource,
        search,
        signal,
        filter: filterQuery,
      });
      const anomalyRecords = esqlResponseToRecords<Record<string, string | number>>(
        esqlResult.response
      ).map((eachRawRecord) => ({
        ...eachRawRecord,
        '@timestamp': new Date(eachRawRecord['@timestamp']).getTime(),
      }));
      return {
        anomalyRecords: anomalyRecords ?? [],
        rowLabels: rowLabels ?? [],
        rawResponse: esqlResult.response,
      };
    },
    {
      enabled: !!anomalyDataEsqlSource && !!rowLabels,
      keepPreviousData: true,
    }
  );

  const inspect = useMemo(() => {
    // when there are no anomalies, rowLabels comes back empty from the top-rows query,
    // so the main query never actually runs. In that case, we use the top-rows query's esql source and raw response.
    const esqlSource = hasAnomaliesData ? anomalyDataEsqlSource : topRowsEsqlSource;
    const rawResponse = hasAnomaliesData ? data?.rawResponse : topRowsRawResponse;
    return {
      dsl: [
        JSON.stringify(
          {
            index: [ML_ANOMALIES_INDEX],
            body: prettifyQuery(esqlSource ?? ''),
          },
          null,
          2
        ),
      ],
      response: rawResponse ? [JSON.stringify(rawResponse, null, 2)] : [],
    };
  }, [
    data?.rawResponse,
    anomalyDataEsqlSource,
    topRowsRawResponse,
    topRowsEsqlSource,
    hasAnomaliesData,
  ]);

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
