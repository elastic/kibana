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
import { getLatestEntitiesIndexName } from '@kbn/entity-store/common';
import { ML_ANOMALIES_INDEX } from '../../../../../common/constants';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import { useEsqlTimeRangeFilter } from '../../../../common/hooks/esql/use_esql_global_filter';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { esqlResponseToRecords } from '../../../../common/utils/esql';
import { useKibana } from '../../../../common/lib/kibana';
import { useErrorToast } from '../../../../common/hooks/use_error_toast';
import { useSecurityMlModuleJobIds } from '../../../../common/components/ml/hooks/use_security_ml_module_job_ids';
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

// Upper bound on the number of entities resolved from the global search bar
// filter and used to constrain anomaly records. Interactive filters normally
// narrow to a handful of entities; this caps the `WHERE entity_id IN (...)`
// list size for pathological "match everything" filters.
const MAX_FILTERED_ENTITIES = 1000;

/**
 * Time-range-only ES|QL filter for the ML anomalies source. The search bar on
 * the Entity Analytics home page targets the entity store data view, so its
 * field filters cannot be applied as a pre-filter on the ML anomalies index;
 * they are resolved separately via {@link useFilteredEntityIds}.
 */
const useRecentAnomaliesTimeFilter = (timeRange?: FixedTimeRange): ESBoolQuery => {
  const { from: globalFrom, to: globalTo } = useGlobalTime();
  const from = timeRange?.from ?? globalFrom;
  const to = timeRange?.to ?? globalTo;
  return useEsqlTimeRangeFilter(from, to);
};

const hasActiveFilter = (query?: ESBoolQuery): boolean => {
  const bool = query?.bool;
  if (!bool) {
    return false;
  }
  const { must = [], filter = [], should = [], must_not: mustNot = [] } = bool;
  return must.length + filter.length + should.length + mustNot.length > 0;
};

interface FilteredEntityIds {
  /** `undefined` when no filter is active (do not constrain anomalies). */
  entityIds: string[] | undefined;
  isLoading: boolean;
}

/**
 * Resolves the entity IDs (EUIDs) matching the global search bar filter by
 * applying that filter to the entity store index, where the `entity.*` fields
 * the search bar targets actually exist. The recent anomalies queries then
 * constrain ML records to these entity IDs, fixing the case where filtering by
 * an entity returned no anomalies because the filter was (incorrectly) applied
 * to the ML anomalies index, which lacks those fields.
 */
const useFilteredEntityIds = (spaceId?: string): FilteredEntityIds => {
  const search = useKibana().services.data.search.search;
  // Entity-only filter (KQL + filter pills), without any time range.
  const { filterQuery } = useGlobalFilterQuery();
  const isFilterActive = hasActiveFilter(filterQuery);

  const esqlSource =
    isFilterActive && spaceId
      ? `FROM ${getLatestEntitiesIndexName(
          spaceId
        )} | WHERE entity.id IS NOT NULL | KEEP entity.id | SORT entity.id | LIMIT ${MAX_FILTERED_ENTITIES}`
      : undefined;

  const { data, isLoading } = useQuery(
    ['recent-anomalies-filtered-entity-ids', esqlSource, filterQuery],
    async ({ signal }) => {
      if (!esqlSource) {
        return [] as string[];
      }
      const esqlResult = await getESQLResults({
        esqlQuery: esqlSource,
        search,
        signal,
        filter: filterQuery,
      });
      return esqlResponseToRecords<{ 'entity.id': string }>(esqlResult?.response)
        .map((record) => record['entity.id'])
        .filter((id): id is string => Boolean(id));
    },
    { enabled: !!esqlSource }
  );

  return {
    entityIds: isFilterActive ? data ?? [] : undefined,
    // Keep "loading" until the resolution finishes so the anomaly queries do
    // not run unconstrained (and then re-run) while IDs are still resolving.
    isLoading: isFilterActive && (isLoading || data === undefined),
  };
};

interface SecurityJobIds {
  /** `undefined` while the installed security ML jobs are still loading. */
  jobIds: string[] | undefined;
  isLoading: boolean;
}

/**
 * Resolves the ML jobs in the `security`/`siem` ML group, matching the
 * server's `getSecurityMlJobIds` (all module-defined security jobs, whether
 * installed or not) so this panel is constrained to the same job set as the
 * anomaly overview/summary APIs.
 */
const useSecurityJobIds = (): SecurityJobIds => {
  const { jobIds, loading } = useSecurityMlModuleJobIds();
  return { jobIds: loading ? undefined : jobIds, isLoading: loading };
};

interface MlAnomaliesIndexExists {
  indexExists: boolean | undefined;
  isLoading: boolean;
}

/**
 * Checks whether the ML anomalies index actually exists. When no ML job has
 * ever run, `ML_ANOMALIES_INDEX` resolves to zero concrete indices, which
 * makes the downstream `LOOKUP JOIN` against the entity store report a
 * misleading "resolves to multiple indices" error instead of an empty
 * result. Short-circuiting here avoids issuing that query at all.
 */
const useMlAnomaliesIndexExists = (): MlAnomaliesIndexExists => {
  const { dataViews } = useKibana().services.data;

  const { data, isLoading } = useQuery(['recent-anomalies-ml-index-exists'], async () => {
    const existingIndices = await dataViews.getExistingIndices([ML_ANOMALIES_INDEX]);
    return existingIndices.length > 0;
  });

  return { indexExists: data, isLoading };
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
  const timeFilter = useRecentAnomaliesTimeFilter(params.timeRange);
  const { entityIds, isLoading: isEntityIdsLoading } = useFilteredEntityIds(params.spaceId);
  const { jobIds: securityJobIds, isLoading: isSecurityJobIdsLoading } = useSecurityJobIds();
  const { indexExists: mlIndexExists, isLoading: isMlIndexLoading } = useMlAnomaliesIndexExists();
  const noFilterMatches = entityIds !== undefined && entityIds.length === 0;
  const noSecurityJobs = securityJobIds !== undefined && securityJobIds.length === 0;
  const rowField = params.viewBy === 'jobId' ? 'job_id' : 'entity_id';

  const topRowsEsqlSource = useRecentAnomaliesTopRowsEsqlSource({
    ...params,
    rowsLimit: 5,
    entityIds,
    jobIds: securityJobIds,
  });

  const { isLoading, data, isError } = useQuery(
    [timeFilter, topRowsEsqlSource, entityIds, securityJobIds, mlIndexExists],
    async ({ signal }) => {
      if (!topRowsEsqlSource || noFilterMatches || noSecurityJobs || !mlIndexExists) {
        return { records: [], rawResponse: undefined };
      }
      const esqlResult = await getESQLResults({
        esqlQuery: topRowsEsqlSource,
        search,
        signal,
        filter: timeFilter,
      });
      return {
        records: esqlResponseToRecords<Record<string, string>>(esqlResult?.response),
        rawResponse: esqlResult?.response,
      };
    },
    {
      enabled:
        !!topRowsEsqlSource && !isEntityIdsLoading && !isSecurityJobIdsLoading && !isMlIndexLoading,
    }
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
    isLoading: isLoading || isEntityIdsLoading || isSecurityJobIdsLoading || isMlIndexLoading,
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
  const timeFilter = useRecentAnomaliesTimeFilter(params.timeRange);
  const { entityIds, isLoading: isEntityIdsLoading } = useFilteredEntityIds(params.spaceId);
  const { jobIds: securityJobIds, isLoading: isSecurityJobIdsLoading } = useSecurityJobIds();
  const noFilterMatches = entityIds !== undefined && entityIds.length === 0;
  const noSecurityJobs = securityJobIds !== undefined && securityJobIds.length === 0;

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
    entityIds,
    jobIds: securityJobIds,
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
    [timeFilter, anomalyDataEsqlSource, rowLabels, entityIds, securityJobIds],
    async ({ signal }) => {
      if (!anomalyDataEsqlSource || !hasAnomaliesData || noFilterMatches || noSecurityJobs) {
        return { anomalyRecords: [], rowLabels: [] };
      }
      const esqlResult = await getESQLResults({
        esqlQuery: anomalyDataEsqlSource,
        search,
        signal,
        filter: timeFilter,
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
      enabled:
        !!anomalyDataEsqlSource && !!rowLabels && !isEntityIdsLoading && !isSecurityJobIdsLoading,
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
